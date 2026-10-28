import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { openStore } from '../src/store.mjs';
import { createApp } from '../src/app.mjs';

const issuer = 'https://identity.example.invalid';
function fixture() {
  const store = openStore();
  for (const [id, role] of [['alice', 'technician'], ['bob', 'technician'], ['admin', 'access_admin'], ['audit', 'auditor']]) {
    store.provisionUser('test-operator', { id, issuer, subject: id, role });
  }
  store.createTeam('admin', 'team-a', 'Operations');
  store.createTeam('admin', 'team-b', 'Development');
  store.addMember('admin', 'alice', 'team-a');
  store.addMember('admin', 'bob', 'team-b');
  for (const id of ['server-a', 'server-b']) store.createResource('admin', id, { name: id, protocol: 'ssh', host: `${id}.example.invalid`, port: 22 });
  for (const [teamId, resourceId] of [['team-a', 'server-a'], ['team-b', 'server-b']]) {
    for (const action of ['resource.view', 'session.connect']) store.grant('admin', { teamId, resourceId, action, expiresAt: Date.now() + 60000 });
  }
  return store;
}

async function api(t) {
  const store = fixture();
  // Authentication injection is test-only; executable always uses the OIDC verifier.
  const server = createApp({ store, authenticate: async authorization => {
    const subject = /^Bearer (alice|bob|admin|audit)$/.exec(authorization || '')?.[1];
    if (!subject) throw new Error('Unauthenticated');
    return { issuer, subject };
  } });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(async () => {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    store.close();
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  async function request(path, who, body) {
    const res = await fetch(base + path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { ...(who ? { Authorization: `Bearer ${who}` } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: res.status, body: await res.json(), headers: res.headers };
  }
  return { store, request };
}

test('default deny, team isolation and admins have no implicit connection grant', () => {
  const store = fixture();
  try {
    assert.equal(store.can('alice', 'server-a', 'session.connect'), true);
    assert.equal(store.can('alice', 'server-b', 'session.connect'), false);
    assert.equal(store.can('admin', 'server-a', 'session.connect'), false);
    assert.equal(store.can('audit', 'server-a', 'resource.view'), false);
    assert.equal(store.can('alice', 'server-a', 'credential.export'), false);
    assert.equal(store.can('alice', 'server-a', 'session.connect', Date.now() + 120000), false);
  } finally { store.close(); }
});

test('revocation, membership removal and disable take effect without cached authorization', () => {
  const store = fixture();
  try {
    store.revoke('admin', { teamId: 'team-a', resourceId: 'server-a', action: 'session.connect' });
    assert.equal(store.can('alice', 'server-a', 'session.connect'), false);
    store.removeMember('admin', 'bob', 'team-b');
    assert.deepEqual(store.visibleResources('bob'), []);
    store.setActive('offline-operator', 'alice', 0);
    assert.deepEqual(store.visibleResources('alice'), []);
  } finally { store.close(); }
});

test('failed writes rollback with audit and invalid grants/resources are rejected', () => {
  const store = fixture();
  try {
    const before = store.audit().length;
    assert.throws(() => store.addMember('admin', 'unknown-user', 'team-a'));
    assert.equal(store.audit().length, before);
    assert.throws(() => store.grant('admin', { teamId: 'team-a', resourceId: 'server-a', action: 'root', expiresAt: Date.now() + 10000 }));
    assert.throws(() => store.createResource('admin', 'bad', { name: 'bad', protocol: 'ssh', host: 'host/path', port: 22 }));
  } finally { store.close(); }
});

test('unauthenticated clients only see health, never resource inventory', async t => {
  const { request } = await api(t);
  assert.equal((await request('/healthz')).body.connectionsEnabled, false);
  assert.equal((await request('/api/resources')).status, 401);
  assert.equal((await request('/api/resources', 'invalid')).status, 401);
  const res = await request('/api/me', 'alice');
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('cache-control'), 'no-store');
});

test('REST inventory and detail prevent cross-team IDOR', async t => {
  const { request } = await api(t);
  const result = await request('/api/resources', 'alice');
  assert.deepEqual(result.body.items.map(r => r.id), ['server-a']);
  assert.equal((await request('/api/resources/server-a', 'alice')).status, 200);
  assert.equal((await request('/api/resources/server-b', 'alice')).status, 404);
  assert.equal((await request('/api/resources/not-found', 'alice')).status, 404);
  assert.equal((await request('/api/resources', 'admin')).body.items.length, 0);
});

test('technician cannot grant rights or read audit; auditor cannot administer', async t => {
  const { request } = await api(t);
  assert.equal((await request('/api/admin/teams', 'alice', { name: 'Escalate' })).status, 403);
  assert.equal((await request('/api/admin/teams', 'audit', { name: 'Escalate' })).status, 403);
  assert.equal((await request('/api/audit', 'alice')).status, 403);
  assert.equal((await request('/api/audit', 'audit')).status, 200);
  assert.equal((await request('/api/admin/teams', 'admin', { name: 'New team' })).status, 201);
});

test('session endpoint never opens a connection and denies ungranted targets', async t => {
  const { request, store } = await api(t);
  const allowed = await request('/api/sessions', 'alice', { resourceId: 'server-a' });
  assert.equal(allowed.status, 501);
  assert.match(allowed.body.error, /no connection was opened/);
  assert.equal((await request('/api/sessions', 'alice', { resourceId: 'server-b' })).status, 403);
  assert.equal((await request('/api/sessions', 'alice', { resourceId: 'server-a', host: 'evil.invalid' })).status, 400);
  store.setActive('operator', 'alice', 0);
  assert.equal((await request('/api/resources', 'alice')).status, 403);
});

test('admin cannot use API to provision or change own role; mass assignment rejected', async t => {
  const { request } = await api(t);
  assert.equal((await request('/api/admin/users', 'admin', { role: 'access_admin' })).status, 404);
  assert.equal((await request('/api/admin/teams', 'admin', { name: 'New', role: 'access_admin' })).status, 400);
  assert.equal((await request('/api/audit?after=invalid', 'admin')).status, 400);
});

test('session ticket generation and one-time claiming when gateway is enabled', async t => {
  const store = fixture();
  const server = createApp({
    store,
    authenticate: async authorization => {
      const subject = /^Bearer (alice|bob|admin)$/.exec(authorization || '')?.[1];
      if (!subject) throw new Error('Unauthenticated');
      return { issuer, subject };
    },
    enableGateway: true,
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(async () => {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    store.close();
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  async function request(path, who, body) {
    const res = await fetch(base + path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { ...(who ? { Authorization: `Bearer ${who}` } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: res.status, body: await res.json() };
  }

  // Health check reflects gateway enabled
  const health = await request('/healthz');
  assert.equal(health.body.connectionsEnabled, true);

  // Alice can request session for server-a
  const sessionRes = await request('/api/sessions', 'alice', { resourceId: 'server-a' });
  assert.equal(sessionRes.status, 201);
  assert.ok(sessionRes.body.sessionId);
  assert.ok(sessionRes.body.ticket);
  assert.equal(sessionRes.body.resource.name, 'server-a');
  assert.equal(sessionRes.body.resource.protocol, 'ssh');

  // Verify ticket claiming
  const claimed = store.claimSessionTicket(sessionRes.body.ticket);
  assert.ok(claimed);
  assert.equal(claimed.resourceName, 'server-a');

  // Re-claiming fails (one-time use)
  const replay = store.claimSessionTicket(sessionRes.body.ticket);
  assert.equal(replay, null);

  // Active sessions lists the session
  const activeRes = await request('/api/sessions/active', 'alice');
  assert.equal(activeRes.status, 200);
  assert.equal(activeRes.body.items.length, 1);
  assert.equal(activeRes.body.items[0].id, sessionRes.body.sessionId);

  // Close session
  store.closeSession('alice', sessionRes.body.sessionId);
  const activeAfterClose = await request('/api/sessions/active', 'alice');
  assert.equal(activeAfterClose.body.items.length, 0);
});


import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

async function readBody(req) {
  if ((req.headers['content-type'] || '').split(';')[0] !== 'application/json') throw new HttpError(415, 'application/json required');
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 16384) throw new HttpError(413, 'Request too large');
    chunks.push(chunk);
  }
  try {
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error();
    return body;
  } catch { throw new HttpError(400, 'Invalid JSON object'); }
}

function fields(body, names) {
  if (Object.keys(body).some(key => !names.includes(key)) || names.some(key => body[key] === undefined)) throw new HttpError(400, 'Invalid fields');
  for (const name of names) {
    if (name !== 'expiresAt' && name !== 'port' && (typeof body[name] !== 'string' || !body[name] || body[name].length > 512)) throw new HttpError(400, 'Invalid field');
  }
  return body;
}

export function createApp({ store, authenticate, enableGateway = false }) {
  if (!store || typeof authenticate !== 'function') throw new Error('Store and authenticator required');
  return createServer({ maxHeaderSize: 16384, requestTimeout: 15000, headersTimeout: 10000 }, async (req, res) => {
    const requestId = randomUUID();
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
    res.setHeader('X-Request-ID', requestId);
    const send = (status, value) => { res.writeHead(status); res.end(JSON.stringify(value)); };
    try {
      const url = new URL(req.url, 'http://localhost');
      const path = url.pathname;
      if (path === '/healthz' && req.method === 'GET') return send(200, { status: 'ok', stage: 'control-plane-pilot', connectionsEnabled: enableGateway });
      let identity;
      try { identity = await authenticate(req.headers.authorization); }
      catch { res.setHeader('WWW-Authenticate', 'Bearer'); throw new HttpError(401, 'Authentication required'); }
      const user = store.getUser(identity.issuer, identity.subject);
      if (!user || !user.active) throw new HttpError(403, 'Access denied');

      if (path === '/api/me' && req.method === 'GET') return send(200, { id: user.id, role: user.role });
      if (path === '/api/resources' && req.method === 'GET') {
        const items = store.visibleResources(user.id);
        if (items.length > 1000) throw new HttpError(503, 'Pilot resource limit reached');
        return send(200, { items });
      }
      const detail = /^\/api\/resources\/([A-Za-z0-9_-]{1,100})$/.exec(path);
      if (detail && req.method === 'GET') {
        if (!store.can(user.id, detail[1], 'resource.view')) throw new HttpError(404, 'Resource not found');
        return send(200, store.getResource(detail[1]));
      }
      if (path === '/api/sessions' && req.method === 'POST') {
        const { resourceId } = fields(await readBody(req), ['resourceId']);
        if (!store.can(user.id, resourceId, 'resource.view') || !store.can(user.id, resourceId, 'session.connect')) throw new HttpError(403, 'Access denied');
        if (!enableGateway) {
          throw new HttpError(501, 'SSH/RDP gateway is not implemented; no connection was opened');
        }
        const sessionId = randomUUID();
        const ticket = randomUUID();
        const expiresAt = Date.now() + 60000;
        store.createSession(user.id, { id: sessionId, userId: user.id, resourceId, ticket, expiresAt });
        const resource = store.getResource(resourceId);
        return send(201, {
          sessionId,
          ticket,
          expiresAt,
          wsUrl: `/ws/terminal?ticket=${ticket}`,
          resource: {
            id: resource.id,
            name: resource.name,
            protocol: resource.protocol,
            host: resource.host,
            port: resource.port,
          },
        });
      }
      if (path === '/api/sessions/active' && req.method === 'GET') {
        return send(200, { items: store.activeSessions(user.id) });
      }
      if (path === '/api/audit' && req.method === 'GET') {
        if (!['access_admin', 'auditor'].includes(user.role)) throw new HttpError(403, 'Access denied');
        const after = Number(url.searchParams.get('after') || 0);
        if (!Number.isSafeInteger(after) || after < 0) throw new HttpError(400, 'Invalid cursor');
        return send(200, { items: store.audit(after) });
      }
      if (path.startsWith('/api/admin/')) {
        if (user.role !== 'access_admin') throw new HttpError(403, 'Access denied');
        if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed');
        const body = await readBody(req);
        try {
          if (path === '/api/admin/teams') {
            fields(body, ['name']);
            const id = randomUUID(); store.createTeam(user.id, id, body.name); return send(201, { id });
          }
          if (path === '/api/admin/resources') {
            fields(body, ['name', 'protocol', 'host', 'port']);
            const id = randomUUID(); store.createResource(user.id, id, body); return send(201, { id });
          }
          if (path === '/api/admin/memberships') {
            fields(body, ['userId', 'teamId']); store.addMember(user.id, body.userId, body.teamId); return send(201, { status: 'created' });
          }
          if (path === '/api/admin/memberships/remove') {
            fields(body, ['userId', 'teamId']); store.removeMember(user.id, body.userId, body.teamId); return send(200, { status: 'removed' });
          }
          if (path === '/api/admin/grants') {
            fields(body, ['teamId', 'resourceId', 'action', 'expiresAt']); store.grant(user.id, body); return send(201, { status: 'created' });
          }
          if (path === '/api/admin/grants/revoke') {
            fields(body, ['teamId', 'resourceId', 'action']); store.revoke(user.id, body); return send(200, { status: 'revoked' });
          }
        } catch (error) {
          if (error instanceof HttpError) throw error;
          throw new HttpError(400, 'Invalid operation or conflicting data');
        }
      }
      throw new HttpError(404, 'Not found');
    } catch (error) {
      send(error instanceof HttpError ? error.status : 500, {
        error: error instanceof HttpError ? error.message : 'Internal server error', requestId,
      });
    }
  });
}

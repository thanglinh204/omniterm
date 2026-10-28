import { DatabaseSync } from 'node:sqlite';

export const ACTIONS = Object.freeze(['resource.view', 'session.connect', 'file.read', 'file.write']);

export function validateResource(input) {
  if (!input || typeof input.name !== 'string' || !input.name.trim() || input.name.length > 160) throw new Error('Invalid resource name');
  if (!['ssh', 'rdp', 'vnc'].includes(input.protocol)) throw new Error('Invalid protocol');
  if (typeof input.host !== 'string' || !input.host || input.host.length > 253 || /[\s/\\@?#]/.test(input.host)) throw new Error('Invalid host');
  if (!Number.isInteger(input.port) || input.port < 1 || input.port > 65535) throw new Error('Invalid port');
  return { name: input.name.trim(), protocol: input.protocol, host: input.host, port: input.port };
}

export function openStore(path = ':memory:') {
  const db = new DatabaseSync(path);
  db.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, issuer TEXT NOT NULL, subject TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('technician','access_admin','auditor')),
      active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)), UNIQUE(issuer, subject)
    );
    CREATE TABLE IF NOT EXISTS teams (id TEXT PRIMARY KEY, name TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS memberships (
      user_id TEXT NOT NULL REFERENCES users(id), team_id TEXT NOT NULL REFERENCES teams(id),
      PRIMARY KEY(user_id, team_id)
    );
    CREATE TABLE IF NOT EXISTS resources (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, protocol TEXT NOT NULL,
      host TEXT NOT NULL, port INTEGER NOT NULL, enabled INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS grants (
      team_id TEXT NOT NULL REFERENCES teams(id), resource_id TEXT NOT NULL REFERENCES resources(id),
      action TEXT NOT NULL, expires_at INTEGER NOT NULL,
      PRIMARY KEY(team_id, resource_id, action)
    );
    CREATE TABLE IF NOT EXISTS audit (
      id INTEGER PRIMARY KEY AUTOINCREMENT, at INTEGER NOT NULL,
      actor TEXT NOT NULL, event TEXT NOT NULL, target TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      resource_id TEXT NOT NULL REFERENCES resources(id),
      ticket TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL CHECK(status IN ('pending', 'connected', 'closed')),
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      closed_at INTEGER
    );
    CREATE INDEX IF NOT EXISTS membership_team ON memberships(team_id);
    CREATE INDEX IF NOT EXISTS session_ticket ON sessions(ticket);
    PRAGMA user_version = 1;
  `);

  function transaction(actor, event, target, operation) {
    db.exec('BEGIN IMMEDIATE');
    try {
      const result = operation();
      db.prepare('INSERT INTO audit(at,actor,event,target) VALUES (?,?,?,?)').run(Date.now(), actor, event, target);
      db.exec('COMMIT');
      return result;
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }

  const store = {
    close: () => db.close(),
    getUser: (issuer, subject) => db.prepare('SELECT id,role,active FROM users WHERE issuer=? AND subject=?').get(issuer, subject),
    userById: id => db.prepare('SELECT id,role,active FROM users WHERE id=?').get(id),
    provisionUser(actor, { id, issuer, subject, role }) {
      if (!id || !issuer || !subject || !['technician', 'access_admin', 'auditor'].includes(role)) throw new Error('Invalid user');
      return transaction(actor, 'user.provision', id, () => db.prepare('INSERT INTO users(id,issuer,subject,role) VALUES (?,?,?,?)').run(id, issuer, subject, role));
    },
    setActive(actor, id, active) {
      if (![0, 1].includes(active)) throw new Error('Invalid active status');
      return transaction(actor, 'user.status', id, () => {
        if (!db.prepare('UPDATE users SET active=? WHERE id=?').run(active, id).changes) throw new Error('User not found');
      });
    },
    createTeam(actor, id, name) {
      if (!id || typeof name !== 'string' || !name.trim()) throw new Error('Invalid team');
      return transaction(actor, 'team.create', id, () => db.prepare('INSERT INTO teams(id,name) VALUES (?,?)').run(id, name.trim()));
    },
    addMember(actor, userId, teamId) {
      return transaction(actor, 'membership.add', `${teamId}/${userId}`, () => db.prepare('INSERT INTO memberships(user_id,team_id) VALUES (?,?)').run(userId, teamId));
    },
    removeMember(actor, userId, teamId) {
      return transaction(actor, 'membership.remove', `${teamId}/${userId}`, () => db.prepare('DELETE FROM memberships WHERE user_id=? AND team_id=?').run(userId, teamId));
    },
    createResource(actor, id, input) {
      const resource = validateResource(input);
      return transaction(actor, 'resource.create', id, () => db.prepare('INSERT INTO resources(id,name,protocol,host,port) VALUES (?,?,?,?,?)').run(id, resource.name, resource.protocol, resource.host, resource.port));
    },
    grant(actor, { teamId, resourceId, action, expiresAt }) {
      if (!ACTIONS.includes(action) || !Number.isSafeInteger(expiresAt) || expiresAt <= Date.now()) throw new Error('Invalid or expired grant');
      return transaction(actor, 'grant.set', `${teamId}/${resourceId}/${action}`, () => db.prepare(`INSERT INTO grants(team_id,resource_id,action,expires_at) VALUES (?,?,?,?)
        ON CONFLICT(team_id,resource_id,action) DO UPDATE SET expires_at=excluded.expires_at`).run(teamId, resourceId, action, expiresAt));
    },
    revoke(actor, { teamId, resourceId, action }) {
      if (!ACTIONS.includes(action)) throw new Error('Invalid action');
      return transaction(actor, 'grant.revoke', `${teamId}/${resourceId}/${action}`, () => db.prepare('DELETE FROM grants WHERE team_id=? AND resource_id=? AND action=?').run(teamId, resourceId, action));
    },
    can(userId, resourceId, action, now = Date.now()) {
      if (!ACTIONS.includes(action)) return false;
      return Boolean(db.prepare(`SELECT 1 FROM users u
        JOIN memberships m ON m.user_id=u.id JOIN grants g ON g.team_id=m.team_id
        JOIN resources r ON r.id=g.resource_id
        WHERE u.id=? AND u.active=1 AND r.id=? AND r.enabled=1 AND g.action=? AND g.expires_at>? LIMIT 1`).get(userId, resourceId, action, now));
    },
    visibleResources(userId) {
      return db.prepare(`SELECT DISTINCT r.id,r.name,r.protocol,r.host,r.port FROM resources r
        JOIN grants g ON g.resource_id=r.id JOIN memberships m ON m.team_id=g.team_id
        JOIN users u ON u.id=m.user_id
        WHERE u.id=? AND u.active=1 AND r.enabled=1 AND g.action='resource.view' AND g.expires_at>?
        ORDER BY r.name,r.id LIMIT 1001`).all(userId, Date.now());
    },
    getResource(id) {
      return db.prepare('SELECT id,name,protocol,host,port FROM resources WHERE id=? AND enabled=1').get(id);
    },
    audit(after = 0) {
      return db.prepare('SELECT id,at,actor,event,target FROM audit WHERE id>? ORDER BY id LIMIT 100').all(after);
    },
    createSession(actor, { id, userId, resourceId, ticket, expiresAt }) {
      return transaction(actor, 'session.create', `${id}/${resourceId}`, () => {
        db.prepare('INSERT INTO sessions(id,user_id,resource_id,ticket,status,created_at,expires_at) VALUES (?,?,?,?,?,?,?)')
          .run(id, userId, resourceId, ticket, 'pending', Date.now(), expiresAt);
        return { id, ticket, expiresAt };
      });
    },
    claimSessionTicket(ticket) {
      const now = Date.now();
      const row = db.prepare(`SELECT s.id, s.user_id as userId, s.resource_id as resourceId, s.status, s.expires_at as expiresAt,
        r.name as resourceName, r.protocol, r.host, r.port
        FROM sessions s JOIN resources r ON r.id = s.resource_id
        WHERE s.ticket = ?`).get(ticket);
      if (!row || row.status !== 'pending' || row.expiresAt <= now) return null;
      db.prepare('UPDATE sessions SET status = ? WHERE id = ?').run('connected', row.id);
      return row;
    },
    closeSession(actor, id) {
      return transaction(actor, 'session.close', id, () => {
        db.prepare('UPDATE sessions SET status = ?, closed_at = ? WHERE id = ?').run('closed', Date.now(), id);
      });
    },
    activeSessions(userId) {
      return db.prepare(`SELECT s.id, s.resource_id as resourceId, s.created_at as createdAt, r.name, r.protocol, r.host
        FROM sessions s JOIN resources r ON r.id = s.resource_id
        WHERE s.user_id = ? AND s.status IN ('pending', 'connected')`).all(userId);
    },
  };
  return store;
}

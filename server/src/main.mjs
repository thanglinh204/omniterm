import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createAuthenticator } from './auth.mjs';
import { openStore } from './store.mjs';
import { createApp } from './app.mjs';
import { setupSshGateway } from './gateway.mjs';

try {
  let authenticate = null;
  if (process.env.OIDC_ISSUER && process.env.OIDC_AUDIENCE) {
    authenticate = createAuthenticator({
      issuer: process.env.OIDC_ISSUER,
      audience: process.env.OIDC_AUDIENCE,
      jwksUrl: process.env.OIDC_JWKS_URL,
    });
  } else {
    // Local / Standalone mode for self-hosted VPS
    authenticate = async (req) => ({
      userId: 'root-admin',
      role: 'access_admin',
    });
  }
  const port = Number(process.env.PORT || 8080);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
  const dbPath = process.env.DATABASE_PATH || './data/control-plane.sqlite';
  mkdirSync(dirname(dbPath), { recursive: true, mode: 0o700 });
  const store = openStore(dbPath);
  const server = createApp({ store, authenticate });
  setupSshGateway(server);
  server.on('error', () => { console.error('Server startup failed'); store.close(); process.exitCode = 1; });
  server.listen(port, process.env.HOST || '0.0.0.0', () => console.info(`OmniTerm gateway listening on port ${port} with SSH/SFTP WebSocket`));
  for (const signal of ['SIGTERM', 'SIGINT']) process.once(signal, () => {
    server.close(() => { store.close(); process.exit(0); });
    setTimeout(() => process.exit(1), 10000).unref();
  });
} catch (error) {
  console.error(`Startup refused: ${error.message}`);
  process.exitCode = 1;
}

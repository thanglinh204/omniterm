import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createAuthenticator } from './auth.mjs';
import { openStore } from './store.mjs';
import { createApp } from './app.mjs';

try {
  // Validate identity configuration before creating a database or listening.
  const authenticate = createAuthenticator({
    issuer: process.env.OIDC_ISSUER,
    audience: process.env.OIDC_AUDIENCE,
    jwksUrl: process.env.OIDC_JWKS_URL,
  });
  const port = Number(process.env.PORT || 8080);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
  const dbPath = process.env.DATABASE_PATH || './data/control-plane.sqlite';
  mkdirSync(dirname(dbPath), { recursive: true, mode: 0o700 });
  const store = openStore(dbPath);
  const server = createApp({ store, authenticate });
  server.on('error', () => { console.error('Server startup failed'); store.close(); process.exitCode = 1; });
  server.listen(port, process.env.HOST || '127.0.0.1', () => console.info(`OmniTerm pilot API listening on port ${port}; terminal gateway disabled`));
  for (const signal of ['SIGTERM', 'SIGINT']) process.once(signal, () => {
    server.close(() => { store.close(); process.exit(0); });
    setTimeout(() => process.exit(1), 10000).unref();
  });
} catch (error) {
  console.error(`Startup refused: ${error.message}`);
  process.exitCode = 1;
}

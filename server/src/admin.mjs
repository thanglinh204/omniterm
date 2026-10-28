import { existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { openStore } from './store.mjs';

// Offline operator CLI only: no public endpoint for choosing roles or provisioning admins.
const [command, issuer, subject, role = 'technician'] = process.argv.slice(2);
const path = process.env.DATABASE_PATH;
if (!path || !existsSync(path)) {
  console.error('DATABASE_PATH must point to an existing pilot database');
  process.exitCode = 1;
} else {
  const store = openStore(path);
  try {
    if (command === 'provision') {
      if (!issuer || new URL(issuer).protocol !== 'https:') throw new Error('HTTPS issuer required');
      const id = randomUUID();
      store.provisionUser('offline-operator', { id, issuer, subject, role });
      console.info(`Provisioned user ${id}; role ${role}`);
    } else if (command === 'disable' || command === 'enable') {
      if (!issuer || subject) throw new Error('Expected user ID only');
      store.setActive('offline-operator', issuer, command === 'enable' ? 1 : 0);
      console.info('User status updated');
    } else {
      throw new Error('Usage: admin provision <issuer> <subject> [technician|access_admin|auditor], or admin disable|enable <user-id>');
    }
  } catch (error) {
    console.error(`Operation failed: ${error.message}`); process.exitCode = 1;
  } finally { store.close(); }
}

import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { generateKeyPair, SignJWT } from 'jose';
import { createAuthenticator, createTokenVerifier } from '../src/auth.mjs';

const issuer = 'https://identity.example.invalid';
const audience = 'omniterm-api';

test('startup refuses absent identity configuration or insecure endpoints', () => {
  assert.throws(() => createAuthenticator({}));
  assert.throws(() => createAuthenticator({ issuer: 'http://localhost', audience, jwksUrl: 'http://localhost/keys' }));
});

test('executable fails closed without identity configuration', () => {
  const env = { ...process.env };
  delete env.OIDC_ISSUER;
  delete env.OIDC_AUDIENCE;
  delete env.OIDC_JWKS_URL;
  const result = spawnSync(process.execPath, [fileURLToPath(new URL('../src/main.mjs', import.meta.url))], {
    env, encoding: 'utf8', timeout: 5000,
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Startup refused/);
  assert.doesNotMatch(result.stdout, /listening/);
});

test('signed JWT identity binds issuer, audience, signature, subject and lifetime', async () => {
  const { privateKey, publicKey } = await generateKeyPair('RS256');
  const other = await generateKeyPair('RS256');
  const authenticate = createTokenVerifier(publicKey, { issuer, audience });
  async function token({ iss = issuer, aud = audience, exp = '2m', key = privateKey, sub = 'person-1', iat = Math.floor(Date.now() / 1000) } = {}) {
    return new SignJWT({}).setProtectedHeader({ alg: 'RS256' }).setIssuer(iss).setAudience(aud).setSubject(sub).setIssuedAt(iat).setExpirationTime(exp).sign(key);
  }
  assert.deepEqual(await authenticate(`Bearer ${await token()}`), { issuer, subject: 'person-1' });
  for (const options of [{ iss: 'https://other.invalid' }, { aud: 'other-api' }, { exp: Math.floor(Date.now() / 1000) - 60 }, { key: other.privateKey }, { sub: '' }, { iat: Math.floor(Date.now() / 1000) + 3600 }]) {
    await assert.rejects(authenticate(`Bearer ${await token(options)}`));
  }
  await assert.rejects(authenticate('Bearer invalid'));
  await assert.rejects(authenticate(undefined));
  const payload = Buffer.from(JSON.stringify({ iss: issuer, aud: audience, sub: 'person-1' })).toString('base64url');
  await assert.rejects(authenticate(`Bearer eyJhbGciOiJub25lIn0.${payload}.`));
});

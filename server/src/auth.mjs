import { createRemoteJWKSet, jwtVerify } from 'jose';

export function createAuthenticator({ issuer, audience, jwksUrl }) {
  if (!issuer || !audience || !jwksUrl) throw new Error('OIDC_ISSUER, OIDC_AUDIENCE and OIDC_JWKS_URL are required');
  const issuerUrl = new URL(issuer);
  const keysUrl = new URL(jwksUrl);
  if (issuerUrl.protocol !== 'https:' || keysUrl.protocol !== 'https:') throw new Error('OIDC endpoints must use HTTPS');
  if (issuerUrl.username || issuerUrl.password || keysUrl.username || keysUrl.password || keysUrl.hash) throw new Error('Invalid OIDC endpoint');
  const jwks = createRemoteJWKSet(keysUrl, { timeoutDuration: 5000, cooldownDuration: 30000 });
  return createTokenVerifier(jwks, { issuer, audience });
}

export function createTokenVerifier(jwks, { issuer, audience }) {
  return async authorization => {
    const match = /^Bearer ([^\s]+)$/.exec(authorization || '');
    if (!match || match[1].length > 8192) throw new Error('Invalid authentication');
    const { payload } = await jwtVerify(match[1], jwks, {
      issuer, audience, algorithms: ['RS256', 'ES256'],
      requiredClaims: ['sub', 'iat', 'exp'], clockTolerance: 5,
    });
    if (typeof payload.sub !== 'string' || !payload.sub || payload.iat > Math.floor(Date.now() / 1000) + 5) throw new Error('Invalid subject or issue time');
    return { issuer: payload.iss, subject: payload.sub };
  };
}

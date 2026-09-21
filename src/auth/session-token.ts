import { createHash, randomBytes } from 'node:crypto';

const TOKEN_BYTES = 32;

export function createRefreshSecret(): string {
  return randomBytes(TOKEN_BYTES).toString('base64url');
}

export function hashRefreshSecret(secret: string, pepper: string): string {
  return createHash('sha256').update(`${pepper}:${secret}`, 'utf8').digest('hex');
}

export function encodeRefreshToken(sessionId: string, secret: string): string {
  return `${sessionId}.${secret}`;
}

export function decodeRefreshToken(token: string): { sessionId: string; secret: string } {
  const separator = token.indexOf('.');
  if (separator <= 0 || separator === token.length - 1) throw new Error('Invalid refresh token');
  return { sessionId: token.slice(0, separator), secret: token.slice(separator + 1) };
}

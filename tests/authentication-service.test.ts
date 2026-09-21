import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { AccessTokenService } from '../src/auth/access-token.js';
import type { PasswordHasher } from '../src/auth/password.js';
import type { AccountIdentity, AccountRepository, StoredSession } from '../src/auth/repository.js';
import {
  AccountConflictError,
  AuthenticationError,
  AuthenticationService,
} from '../src/auth/service.js';

class TestPasswords implements PasswordHasher {
  async hash(password: string) {
    return `hashed:${password}`;
  }
  async verify(hash: string, password: string) {
    return hash === `hashed:${password}`;
  }
}

class MemoryAccounts implements AccountRepository {
  identities: AccountIdentity[] = [];
  sessions = new Map<string, StoredSession & { revoked: boolean }>();
  async createAccount(input: { email: string; passwordHash: string; displayName: string }) {
    const identity = { userId: randomUUID(), characterId: randomUUID(), ...input };
    this.identities.push(identity);
    return identity;
  }
  async findAccountByEmail(email: string) {
    return this.identities.find((value) => value.email === email) ?? null;
  }
  async findIdentityByUserId(userId: string) {
    return this.identities.find((value) => value.userId === userId) ?? null;
  }
  async createSession(input: { userId: string; tokenHash: string; expiresAt: Date }) {
    const session = { id: randomUUID(), ...input, revoked: false };
    this.sessions.set(session.id, session);
    return session;
  }
  async findActiveSession(id: string, now: Date) {
    const session = this.sessions.get(id);
    return session && !session.revoked && session.expiresAt > now ? session : null;
  }
  async rotateSession(id: string, expectedHash: string, tokenHash: string, expiresAt: Date) {
    const session = this.sessions.get(id);
    if (!session || session.revoked || session.tokenHash !== expectedHash) return false;
    session.tokenHash = tokenHash;
    session.expiresAt = expiresAt;
    return true;
  }
  async revokeSession(id: string) {
    const session = this.sessions.get(id);
    if (session) session.revoked = true;
  }
}

function fixture() {
  const repository = new MemoryAccounts();
  const service = new AuthenticationService(
    repository,
    new TestPasswords(),
    new AccessTokenService('j'.repeat(32)),
    's'.repeat(32),
  );
  return { repository, service };
}

describe('authentication service', () => {
  it('registers normalized accounts and returns signed credentials', async () => {
    const { service } = fixture();
    const result = await service.register(
      { email: ' Player@Example.COM ', password: 'correct horse battery', displayName: 'Mariposa' },
      new Date('2026-01-01T00:00:00Z'),
    );
    expect(result.user.email).toBe('player@example.com');
    expect(result.character.displayName).toBe('Mariposa');
    expect(result.refreshToken).toContain('.');
  });

  it('rejects duplicate accounts and invalid passwords', async () => {
    const { service } = fixture();
    await service.register({
      email: 'player@example.com',
      password: 'correct horse battery',
      displayName: 'Mariposa',
    });
    await expect(
      service.register({
        email: 'PLAYER@example.com',
        password: 'another safe password',
        displayName: 'Other',
      }),
    ).rejects.toBeInstanceOf(AccountConflictError);
    await expect(service.login('player@example.com', 'wrong password')).rejects.toBeInstanceOf(
      AuthenticationError,
    );
  });

  it('rotates refresh tokens and revokes the family when an old token is replayed', async () => {
    const { service } = fixture();
    const first = await service.register({
      email: 'player@example.com',
      password: 'correct horse battery',
      displayName: 'Mariposa',
    });
    const second = await service.refresh(first.refreshToken);
    expect(second.refreshToken).not.toBe(first.refreshToken);
    await expect(service.refresh(first.refreshToken)).rejects.toBeInstanceOf(AuthenticationError);
    await expect(service.refresh(second.refreshToken)).rejects.toBeInstanceOf(AuthenticationError);
  });

  it('revokes a session on logout', async () => {
    const { service } = fixture();
    const result = await service.register({
      email: 'player@example.com',
      password: 'correct horse battery',
      displayName: 'Mariposa',
    });
    await service.logout(result.refreshToken);
    await expect(service.refresh(result.refreshToken)).rejects.toBeInstanceOf(AuthenticationError);
  });
});

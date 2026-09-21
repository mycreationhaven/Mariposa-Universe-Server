import { timingSafeEqual } from 'node:crypto';
import type { AccessTokenService, IssuedAccessToken } from './access-token.js';
import type { PasswordHasher } from './password.js';
import type { AccountIdentity, AccountRepository } from './repository.js';
import {
  createRefreshSecret,
  decodeRefreshToken,
  encodeRefreshToken,
  hashRefreshSecret,
} from './session-token.js';

const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const DUMMY_PASSWORD_HASH =
  '$argon2id$v=19$m=65536,t=3,p=1$RdVJdthEltJfwMdT4paFxg$u0e76wW6sAtPLPNTIDzq9jjHzO47y0qXf0wTJK3Wa/s';

export class AuthenticationError extends Error {}
export class AccountConflictError extends Error {}

export interface AuthenticationResult extends IssuedAccessToken {
  refreshToken: string;
  refreshExpiresAt: string;
  user: { id: string; email: string };
  character: { id: string; displayName: string };
}

export class AuthenticationService {
  constructor(
    private readonly repository: AccountRepository,
    private readonly passwords: PasswordHasher,
    private readonly accessTokens: AccessTokenService,
    private readonly sessionPepper: string,
  ) {}

  async register(
    input: { email: string; password: string; displayName: string },
    now = new Date(),
  ): Promise<AuthenticationResult> {
    const email = input.email.trim().toLowerCase();
    if (await this.repository.findAccountByEmail(email))
      throw new AccountConflictError('Account already exists');
    const passwordHash = await this.passwords.hash(input.password);
    let identity: AccountIdentity;
    try {
      identity = await this.repository.createAccount({
        email,
        passwordHash,
        displayName: input.displayName.trim(),
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw new AccountConflictError('Account already exists');
      throw error;
    }
    return this.startSession(identity, now);
  }

  async login(
    emailInput: string,
    password: string,
    now = new Date(),
  ): Promise<AuthenticationResult> {
    const identity = await this.repository.findAccountByEmail(emailInput.trim().toLowerCase());
    const validPassword = await this.passwords.verify(
      identity?.passwordHash ?? DUMMY_PASSWORD_HASH,
      password,
    );
    if (!identity || !validPassword) throw new AuthenticationError('Invalid credentials');
    return this.startSession(identity, now);
  }

  async refresh(refreshToken: string, now = new Date()): Promise<AuthenticationResult> {
    let parsed: { sessionId: string; secret: string };
    try {
      parsed = decodeRefreshToken(refreshToken);
    } catch {
      throw new AuthenticationError('Invalid refresh token');
    }
    const session = await this.repository.findActiveSession(parsed.sessionId, now);
    if (!session) throw new AuthenticationError('Invalid refresh token');
    const presentedHash = hashRefreshSecret(parsed.secret, this.sessionPepper);
    if (!safeEqual(session.tokenHash, presentedHash)) {
      await this.repository.revokeSession(session.id);
      throw new AuthenticationError('Invalid refresh token');
    }
    const identity = await this.repository.findIdentityByUserId(session.userId);
    if (!identity) {
      await this.repository.revokeSession(session.id);
      throw new AuthenticationError('Invalid refresh token');
    }
    const secret = createRefreshSecret();
    const expiresAt = new Date(now.getTime() + REFRESH_TTL_MS);
    const rotated = await this.repository.rotateSession(
      session.id,
      presentedHash,
      hashRefreshSecret(secret, this.sessionPepper),
      expiresAt,
    );
    if (!rotated) throw new AuthenticationError('Refresh token was already used');
    return this.result(identity, session.id, secret, expiresAt, now);
  }

  async logout(refreshToken: string): Promise<void> {
    try {
      await this.repository.revokeSession(decodeRefreshToken(refreshToken).sessionId);
    } catch {
      /* Idempotent logout. */
    }
  }

  private async startSession(identity: AccountIdentity, now: Date): Promise<AuthenticationResult> {
    const secret = createRefreshSecret();
    const expiresAt = new Date(now.getTime() + REFRESH_TTL_MS);
    const session = await this.repository.createSession({
      userId: identity.userId,
      tokenHash: hashRefreshSecret(secret, this.sessionPepper),
      expiresAt,
    });
    return this.result(identity, session.id, secret, expiresAt, now);
  }

  private result(
    identity: AccountIdentity,
    sessionId: string,
    secret: string,
    expiresAt: Date,
    now: Date,
  ): AuthenticationResult {
    return {
      ...this.accessTokens.issue(
        {
          userId: identity.userId,
          characterId: identity.characterId,
          displayName: identity.displayName,
        },
        Math.floor(now.getTime() / 1000),
      ),
      refreshToken: encodeRefreshToken(sessionId, secret),
      refreshExpiresAt: expiresAt.toISOString(),
      user: { id: identity.userId, email: identity.email },
      character: { id: identity.characterId, displayName: identity.displayName },
    };
  }
}

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505';
}

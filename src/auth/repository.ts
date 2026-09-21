import { and, eq, gt } from 'drizzle-orm';
import type { createDatabase } from '../database/client.js';
import { characters, playerSessions, users } from '../database/schema.js';

export interface AccountIdentity {
  userId: string;
  characterId: string;
  email: string;
  displayName: string;
  passwordHash: string;
}

export interface StoredSession {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface AccountRepository {
  createAccount(input: {
    email: string;
    passwordHash: string;
    displayName: string;
  }): Promise<AccountIdentity>;
  findAccountByEmail(email: string): Promise<AccountIdentity | null>;
  findIdentityByUserId(userId: string): Promise<AccountIdentity | null>;
  createSession(input: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<StoredSession>;
  findActiveSession(id: string, now: Date): Promise<StoredSession | null>;
  rotateSession(
    id: string,
    expectedHash: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<boolean>;
  revokeSession(id: string): Promise<void>;
}

type Database = ReturnType<typeof createDatabase>['db'];

export class PostgresAccountRepository implements AccountRepository {
  constructor(private readonly db: Database) {}

  async createAccount(input: {
    email: string;
    passwordHash: string;
    displayName: string;
  }): Promise<AccountIdentity> {
    return this.db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({ email: input.email, passwordHash: input.passwordHash, status: 'active' })
        .returning();
      if (!user) throw new Error('Failed to create user');
      const [character] = await tx
        .insert(characters)
        .values({ userId: user.id, displayName: input.displayName })
        .returning();
      if (!character) throw new Error('Failed to create character');
      return {
        userId: user.id,
        characterId: character.id,
        email: input.email,
        displayName: character.displayName,
        passwordHash: input.passwordHash,
      };
    });
  }

  async findAccountByEmail(email: string): Promise<AccountIdentity | null> {
    const [row] = await this.db
      .select({
        userId: users.id,
        characterId: characters.id,
        email: users.email,
        displayName: characters.displayName,
        passwordHash: users.passwordHash,
      })
      .from(users)
      .innerJoin(characters, eq(characters.userId, users.id))
      .where(and(eq(users.email, email), eq(users.status, 'active')))
      .limit(1);
    if (!row?.email || !row.passwordHash) return null;
    return { ...row, email: row.email, passwordHash: row.passwordHash };
  }

  async findIdentityByUserId(userId: string): Promise<AccountIdentity | null> {
    const [row] = await this.db
      .select({
        userId: users.id,
        characterId: characters.id,
        email: users.email,
        displayName: characters.displayName,
        passwordHash: users.passwordHash,
      })
      .from(users)
      .innerJoin(characters, eq(characters.userId, users.id))
      .where(and(eq(users.id, userId), eq(users.status, 'active')))
      .limit(1);
    if (!row?.email || !row.passwordHash) return null;
    return { ...row, email: row.email, passwordHash: row.passwordHash };
  }

  async createSession(input: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<StoredSession> {
    const [session] = await this.db.insert(playerSessions).values(input).returning();
    if (!session) throw new Error('Failed to create session');
    return session;
  }

  async findActiveSession(id: string, now: Date): Promise<StoredSession | null> {
    const [session] = await this.db
      .select()
      .from(playerSessions)
      .where(
        and(
          eq(playerSessions.id, id),
          eq(playerSessions.revoked, false),
          gt(playerSessions.expiresAt, now),
        ),
      )
      .limit(1);
    return session ?? null;
  }

  async rotateSession(
    id: string,
    expectedHash: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<boolean> {
    const rows = await this.db
      .update(playerSessions)
      .set({ tokenHash, expiresAt })
      .where(
        and(
          eq(playerSessions.id, id),
          eq(playerSessions.tokenHash, expectedHash),
          eq(playerSessions.revoked, false),
        ),
      )
      .returning({ id: playerSessions.id });
    return rows.length === 1;
  }

  async revokeSession(id: string): Promise<void> {
    await this.db.update(playerSessions).set({ revoked: true }).where(eq(playerSessions.id, id));
  }
}

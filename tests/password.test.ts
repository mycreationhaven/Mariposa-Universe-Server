import { describe, expect, it } from 'vitest';
import { Argon2idPasswordHasher } from '../src/auth/password.js';

describe('password hashing', () => {
  it('uses Argon2id and verifies only the original password', async () => {
    const passwords = new Argon2idPasswordHasher();
    const hash = await passwords.hash('correct horse battery staple');
    expect(hash).toMatch(/^\$argon2id\$/);
    await expect(passwords.verify(hash, 'correct horse battery staple')).resolves.toBe(true);
    await expect(passwords.verify(hash, 'incorrect password')).resolves.toBe(false);
  });
});

import { Router, type Request } from 'express';
import { z } from 'zod';
import {
  AccountConflictError,
  AuthenticationError,
  type AuthenticationService,
} from './service.js';

const credentialsSchema = z
  .object({ email: z.email().max(254), password: z.string().min(12).max(128) })
  .strict();
const registerSchema = credentialsSchema
  .extend({ displayName: z.string().trim().min(2).max(24) })
  .strict();
const refreshSchema = z.object({ refreshToken: z.string().min(40).max(512) }).strict();

export function createAuthenticationRouter(authentication: AuthenticationService): Router {
  const router = Router();
  const limiter = new AttemptLimiter(10, 60_000);

  router.post('/register', async (req, res) => {
    if (!limiter.take(clientKey(req))) return res.status(429).json({ error: 'too_many_requests' });
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'invalid_request' });
    try {
      return res.status(201).json(await authentication.register(parsed.data));
    } catch (error) {
      if (error instanceof AccountConflictError)
        return res.status(409).json({ error: 'account_exists' });
      throw error;
    }
  });

  router.post('/login', async (req, res) => {
    if (!limiter.take(clientKey(req))) return res.status(429).json({ error: 'too_many_requests' });
    const parsed = credentialsSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'invalid_request' });
    try {
      return res.json(await authentication.login(parsed.data.email, parsed.data.password));
    } catch (error) {
      if (error instanceof AuthenticationError)
        return res.status(401).json({ error: 'invalid_credentials' });
      throw error;
    }
  });

  router.post('/refresh', async (req, res) => {
    const parsed = refreshSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'invalid_request' });
    try {
      return res.json(await authentication.refresh(parsed.data.refreshToken));
    } catch (error) {
      if (error instanceof AuthenticationError)
        return res.status(401).json({ error: 'invalid_refresh_token' });
      throw error;
    }
  });

  router.post('/logout', async (req, res) => {
    const parsed = refreshSchema.safeParse(req.body);
    if (parsed.success) await authentication.logout(parsed.data.refreshToken);
    return res.sendStatus(204);
  });

  return router;
}

function clientKey(req: Request): string {
  return req.ip ?? req.socket.remoteAddress ?? 'unknown';
}

class AttemptLimiter {
  private readonly entries = new Map<string, { count: number; resetAt: number }>();
  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}
  take(key: string, now = Date.now()): boolean {
    const entry = this.entries.get(key);
    if (!entry || entry.resetAt <= now) {
      this.entries.set(key, { count: 1, resetAt: now + this.windowMs });
      return true;
    }
    if (entry.count >= this.limit) return false;
    entry.count += 1;
    return true;
  }
}

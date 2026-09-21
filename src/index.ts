import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { Server } from 'colyseus';
import express from 'express';
import { createAuthenticationRouter } from './auth/http.js';
import { Argon2idPasswordHasher } from './auth/password.js';
import { PostgresAccountRepository } from './auth/repository.js';
import { accessTokens, configureAccessTokens } from './auth/runtime.js';
import { AuthenticationService } from './auth/service.js';
import { loadConfig } from './config/env.js';
import { createDatabase } from './database/client.js';
import { logger } from './logging/logger.js';
import { capabilities } from './platform/capabilities.js';
import { DevelopmentRoom } from './rooms/development-room.js';

const config = loadConfig();
configureAccessTokens(config.JWT_SECRET);
const { db, pool } = createDatabase(config.DATABASE_URL);
const authentication = new AuthenticationService(
  new PostgresAccountRepository(db),
  new Argon2idPasswordHasher(),
  accessTokens(),
  config.SESSION_SECRET,
);

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '16kb' }));
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowed = config.CORS_ALLOWED_ORIGINS.split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  if (origin && allowed.includes(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.get('/health', (_req, res) =>
  res.json({ status: 'ok', service: 'mariposa-universe', capabilities: capabilities(config) }),
);
app.use('/auth', createAuthenticationRouter(authentication));
app.post('/auth/development', (req, res) => {
  if (config.NODE_ENV === 'production') return res.status(404).json({ error: 'not_found' });
  const requested =
    typeof req.body?.displayName === 'string' ? req.body.displayName.trim().slice(0, 24) : '';
  const displayName = requested || 'Development Butterfly';
  const userId = `dev_user_${randomUUID()}`;
  const characterId = `dev_character_${randomUUID()}`;
  const token = accessTokens().issue({ userId, characterId, displayName });
  return res.status(201).json({ userId, characterId, displayName, ...token });
});

app.use(
  (error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error({ err: error }, 'http_request_failed');
    res.status(500).json({ error: 'internal_error' });
  },
);

const httpServer = createServer(app);
const gameServer = new Server({
  transport: new WebSocketTransport({ server: httpServer }),
  greet: false,
});
gameServer.define('development_test_zone', DevelopmentRoom);
await gameServer.listen(config.PORT);
logger.info({ port: config.PORT }, 'server_started');

const shutdown = async (signal: string) => {
  logger.info({ signal }, 'server_stopping');
  await gameServer.gracefullyShutdown(false);
  await pool.end();
  process.exit(0);
};
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

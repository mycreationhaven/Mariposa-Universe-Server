# Security checklist

Implemented: strict schemas; unknown-field rejection; input sequence replay protection; per-session input rate limit; authoritative position/velocity/jump/collision; server-issued development identity; delta/boundary/speed constraints; platform-policy validation; economy and seasonal idempotency tests; structured redacted logs; environment secrets; no client secrets or database access.

Before public deployment: TLS/WSS; reverse-proxy connection limits; durable authentication with Argon2id, rotating refresh tokens and hashed sessions; origin policy; Redis-backed distributed limits; database-backed ledgers; authorization on every service; admin MFA; ban system; encryption/key management; dependency and container scanning; backups/restore drill; metrics/alerts; penetration and load testing; reconnect token rotation; impossible-action telemetry.

Never treat minification or obfuscation as security. Never log passwords, bearer tokens, session secrets, private keys, or wallet signing material.

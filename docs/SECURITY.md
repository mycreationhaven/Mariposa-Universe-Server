# Security checklist

Implemented: strict schemas; unknown-field rejection; input sequence replay protection; per-session input rate limit; authoritative position/velocity/jump/collision; server-issued development identity; PostgreSQL-backed accounts; Argon2id password hashes; 15-minute signed access tokens; opaque 30-day refresh secrets stored only as hashes; atomic refresh rotation; refresh replay revocation; idempotent logout; basic authentication attempt limiting; authenticated room joins; 20-second room reconnection; delta/boundary/speed constraints; platform-policy validation; economy and seasonal idempotency tests; structured redacted logs; environment secrets; no client secrets or database access.

Before public deployment: TLS/WSS; reverse-proxy connection limits; email verification and account recovery; multi-device session controls; persistent reconnect restoration; strict production origin policy; Redis-backed distributed limits; database-backed ledgers; authorization on every service; admin MFA; ban system; encryption/key management; dependency and container scanning; backups/restore drill; metrics/alerts; penetration and load testing; impossible-action telemetry.

Never treat minification or obfuscation as security. Never log passwords, bearer tokens, session secrets, private keys, or wallet signing material.

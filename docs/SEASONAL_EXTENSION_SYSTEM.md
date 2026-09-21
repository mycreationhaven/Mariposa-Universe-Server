# Seasonal extension system

Mariposa Universe supports two seasonal models:

1. **Native seasonal content** runs inside normal core zones and services. The core server directly observes objectives and awards rewards.
2. **External seasonal experiences** run as separate approved clients and communicate through scoped sessions. Their results are untrusted claims until validated.

## External experience lifecycle

1. The core client asks the core server to launch a specific approved expansion.
2. The server validates account status, manifest, version, dates, platform policy, and requested capability.
3. The server issues a one-time short-lived launch ticket.
4. The external experience exchanges the ticket for an expansion-scoped session.
5. The player completes the experience.
6. The experience submits a unique result ID plus approved evidence.
7. The server validates session binding, expiry, limits, evidence, replay/duplicate status, and reward policy.
8. The server performs an idempotent transactional reward settlement.
9. The server issues a one-time return ticket so the player can safely rejoin an approved main-game zone.

The external experience never writes inventory, experience, ARKOS, accounts, NPC state, marketplace data, or administrative state.

## Reward confidence

Package signatures prove who published the package and whether it changed. They do not prove honest gameplay. Valuable or competitive rewards require authoritative minigame workers or equivalently strong server-observed evidence. Pure client-reported results are limited to low-risk, capped rewards with anomaly detection.

## Current implementation status

The manifest, seasonal service contract, duplicate submission handling, session binding, score bounds, and duplicate reward-claim proof exist as an in-memory foundation. Persistent manifests, launch/return tickets, cryptographic package verification, authoritative minigame workers, durable reward settlement, and administration tooling remain planned work.

# Roadmap

1. Foundation and authoritative movement: implemented and automated-testable.
2. Construct 3 bridge: wrapper, interpolation, prediction, reconciliation, authentication, and manual reconnect implemented; import and visual validation remain in Construct 3.
3. Persistence: schema, migration workflow, PostgreSQL accounts, rotating refresh sessions, and authenticated short-window reconnect implemented. Email verification, recovery, and long-disconnect restoration remain.
4. Economy: contract/schema/idempotency proof implemented; build transactional PostgreSQL ledger next.
5. Seasonal: contracts/manifest/duplicate protection proof implemented; add persistent registry, signature validation, and reward catalog.
6. Content: server collision maps, transfers, NPC presence, inventory, quests.
7. Commerce and scale: escrow marketplace, Redis/multiple workers, operational tooling, Creator SDK pilot.

Deterministic latency/jitter/packet-loss tests and real WebSocket hostile-input/reconnect tests are implemented. Recommended next milestone: assemble the included controller in a real Construct 3 layout, visually tune correction smoothing under shaped network conditions, and add longer multi-client soak/load coverage.

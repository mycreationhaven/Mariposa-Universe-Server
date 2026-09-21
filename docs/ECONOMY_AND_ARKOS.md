# Economy and ARKOS

Gameplay calls `IEconomyProvider`; it does not call a blockchain. Values use integer atomic units (`bigint`), and every write requires a unique idempotency key. The database schema enforces uniqueness and stores sender, recipient, type, description, timestamp, and metadata.

The included in-memory ledger proves duplicate protection and authority tests but is not durable production money. The next milestone must implement its PostgreSQL counterpart using serializable transactions or row locks.

`IBlockchainAdapter` is optional and disabled by default. Deposits/withdrawals, node communication, confirmation/reorg handling, custody, and signing are intentionally unimplemented. No key belongs in Construct 3. If Arkovia is offline or forbidden by platform policy, the internal ledger remains operational.

# Database

PostgreSQL was selected for transactional integrity across identity, inventory, marketplace, and money. Drizzle preserves explicit SQL-shaped schemas, BigInt currency values, migrations, and TypeScript inference without hiding transaction boundaries.

Initial tables are deliberately limited: users, characters, player sessions, economy accounts/transactions, seasonal sessions/claims, and audit logs. Generate and apply migrations with `npm run db:generate` and `npm run db:migrate`.

Next migrations add item definitions/instances, inventories, stats, and quest progress when those services become executable. Marketplace escrow must use one database transaction with locked accounts/listing, debit, ownership transfer, credit, and immutable audit rows. Expiration must be idempotent.

import { defineConfig } from 'drizzle-kit';
export default defineConfig({schema:'./src/database/schema.ts',out:'./drizzle',dialect:'postgresql',dbCredentials:{url:process.env.DATABASE_URL ?? 'postgresql://mariposa:mariposa_dev@localhost:5432/mariposa'}});

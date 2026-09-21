import 'dotenv/config';import { migrate } from 'drizzle-orm/node-postgres/migrator';import { createDatabase } from '../src/database/client.js';
const url=process.env.DATABASE_URL;if(!url)throw new Error('DATABASE_URL is required');const {db,pool}=createDatabase(url);await migrate(db,{migrationsFolder:'./drizzle'});await pool.end();console.log('Migrations applied');

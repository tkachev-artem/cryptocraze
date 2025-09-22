import * as dotenv from 'dotenv';
dotenv.config();

import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "../shared/schema";

const STATIC_ONLY = (process.env.STATIC_ONLY || '').toLowerCase() === 'true';

if (!process.env.DATABASE_URL && !STATIC_ONLY) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const shouldDisableSslVerify = (process.env.DB_SSL_DISABLE_VERIFY || '').toLowerCase() === 'true';

let pool: Pool | undefined;
let db: ReturnType<typeof drizzle> | undefined;

if (process.env.DATABASE_URL && !STATIC_ONLY) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: shouldDisableSslVerify ? { rejectUnauthorized: false } : undefined,
  });
  db = drizzle(pool, { schema });
} else {
  console.warn('STATIC_ONLY enabled or DATABASE_URL missing: skipping DB initialization');
}

export { pool, db };

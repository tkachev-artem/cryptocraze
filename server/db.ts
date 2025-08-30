import * as dotenv from 'dotenv';
dotenv.config();

import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "../shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const shouldDisableSslVerify = (process.env.DB_SSL_DISABLE_VERIFY || '').toLowerCase() === 'true';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: shouldDisableSslVerify ? { rejectUnauthorized: false } : undefined,
});
export const db = drizzle(pool, { schema });

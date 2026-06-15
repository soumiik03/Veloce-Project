import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'


if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set')
}


const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1,
  idleTimeoutMillis: 10000,   
  connectionTimeoutMillis: 5000,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
})


pool.on('error', (err) => {
  console.error('[db] Unexpected pool error:', err)
})

export const db = drizzle(pool, {
  schema,
  logger: false,
})
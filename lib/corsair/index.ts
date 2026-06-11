import { createCorsair } from "corsair"
import { Pool } from "pg"
import { gmail } from "@corsair-dev/gmail"
import { googlecalendar } from "@corsair-dev/googlecalendar"

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required")
}

if (!process.env.CORSAIR_KEK || process.env.CORSAIR_KEK.trim().length === 0) {
  throw new Error("CORSAIR_KEK is required. Generate: openssl rand -base64 32")
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
})

export const corsair = createCorsair({
  plugins: [gmail(), googlecalendar()],
  database: pool,
  kek: process.env.CORSAIR_KEK,
  multiTenancy: true,
})
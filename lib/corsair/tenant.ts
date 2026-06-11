import { createCorsair } from "corsair"
import { setupCorsair } from "corsair/setup"
import { Pool } from "pg"
import { gmail } from "@corsair-dev/gmail"
import { googlecalendar } from "@corsair-dev/googlecalendar"

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required in environment variables")
}

if (!process.env.CORSAIR_KEK || process.env.CORSAIR_KEK.trim().length === 0) {
  throw new Error(
    "CORSAIR_KEK is required. Generate one using: openssl rand -base64 32"
  )
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

export const corsair = createCorsair({
  plugins: [gmail(), googlecalendar()],
  database: pool,
  kek: process.env.CORSAIR_KEK,
  multiTenancy: true,
})

export async function provisionTenant(userId: string) {
  if (!userId || userId.trim().length === 0) {
    throw new Error("userId is required for tenant provisioning")
  }

  await setupCorsair(corsair, { tenantId: userId })
  return corsair.withTenant(userId)
}

export async function getOrCreateTenant(userId: string) {
  return provisionTenant(userId)
}

export async function sendGmail(
  userId: string,
  to: string,
  subject: string,
  body: string
) {
  const raw = Buffer.from(
    [`To: ${to}`, `Subject: ${subject}`, "Content-Type: text/plain; charset=utf-8", "", body].join("\r\n")
  ).toString("base64url")

  return corsair.withTenant(userId).gmail.api.messages.send({ raw })
}

export async function createCalendarEvent(
  userId: string,
  title: string,
  startTime: string,
  endTime: string,
  attendees?: string[],
  location?: string
) {
  return corsair.withTenant(userId).googlecalendar.api.events.create({
    event: {
      summary: title,
      location,
      start: { dateTime: startTime },
      end: { dateTime: endTime },
      attendees: attendees?.map((email) => ({ email })),
    },
  })
}

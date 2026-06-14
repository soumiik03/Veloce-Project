import { setupCorsair } from "corsair/setup"
import { corsair } from "./index"

export async function provisionTenant(userId: string): Promise<void> {
  if (!userId || userId.trim().length === 0) {
    throw new Error("userId is required for tenant provisioning")
  }

  const credentials = {
    gmail: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      client_id: process.env.GOOGLE_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
    },
    googlecalendar: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      client_id: process.env.GOOGLE_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
    }
  }

  // 1. Setup global integration-level credentials first (omit tenantId)
  await setupCorsair(corsair, {
    credentials,
  })

  // 2. Setup account-level rows for the tenant (without credentials)
  await setupCorsair(corsair, {
    tenantId: userId,
  })
}

export function getTenant(userId: string) {
  if (!userId || userId.trim().length === 0) {
    throw new Error("userId is required for tenant access")
  }

  return corsair.withTenant(userId)
}

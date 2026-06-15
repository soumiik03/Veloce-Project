import { setupCorsair } from "corsair/setup"
import { corsair } from "./index"

export async function provisionTenant(userId: string): Promise<void> {
  if (!userId || userId.trim().length === 0) {
    throw new Error("userId is required for tenant provisioning")
  }

  const credentials = {
    gmail: {
      client_id: process.env.GOOGLE_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
    },
    googlecalendar: {
      client_id: process.env.GOOGLE_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
    }
  }

  
  await setupCorsair(corsair, {
    credentials,
  })

  
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

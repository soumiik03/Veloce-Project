import { corsair } from "./index"

export async function provisionTenant(userId: string): Promise<void> {
  if (!userId || userId.trim().length === 0) {
    throw new Error("userId is required for tenant provisioning")
  }

  await Promise.resolve(corsair)
}

export function getTenant(userId: string) {
  if (!userId || userId.trim().length === 0) {
    throw new Error("userId is required for tenant access")
  }

  return corsair.withTenant(userId)
}
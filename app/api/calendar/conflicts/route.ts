import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth"
import { isDynamicUsageError } from "@/lib/auth/jwt"
import { Redis } from "@upstash/redis"
import { detectConflicts } from "@/services/background/conflict-detector"

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = user.id

    // Run conflict detection (throttled/cached internally)
    const conflicts = await detectConflicts(userId)

    return NextResponse.json({ conflicts }, { status: 200 })
  } catch (error: any) {
    if (isDynamicUsageError(error)) {
      throw error
    }
    console.error("[api/calendar/conflicts] Error:", error)
    return NextResponse.json({ error: error.message || "Failed to retrieve conflicts" }, { status: 500 })
  }
}

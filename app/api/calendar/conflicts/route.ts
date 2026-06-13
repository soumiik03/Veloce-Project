import { NextRequest, NextResponse } from "next/server"
import { verifyAccessToken, extractTokenFromHeader, isDynamicUsageError } from "@/lib/auth/jwt"
import { Redis } from "@upstash/redis"
import { detectConflicts } from "@/services/background/conflict-detector"

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization")
    let token = extractTokenFromHeader(authHeader)
    if (!token) {
      token = req.cookies.get("accessToken")?.value || null
    }

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = verifyAccessToken(token)
    if (!payload) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 })
    }
    const userId = payload.userId

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

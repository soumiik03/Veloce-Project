import { getSessionUser } from "@/lib/auth"
import { Redis } from "@upstash/redis"
import { NextRequest, NextResponse } from "next/server"

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req)
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = user.id
    
    await redis.set(`onboarding:${userId}`, "completed")

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[corsair/complete] Error:", error)
    return NextResponse.json({ error: error.message || "Failed to complete onboarding" }, { status: 500 })
  }
}

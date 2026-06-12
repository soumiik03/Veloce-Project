import { NextRequest, NextResponse } from "next/server"
import { verifyAccessToken, extractTokenFromHeader } from "@/lib/auth/jwt"
import { getAvailability } from "@/services/calendar/event-service"
import { recommendAlternativeSlot } from "@/services/meeting/recommend-slot"

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

    const { searchParams } = new URL(req.url)
    const timeMin = searchParams.get("timeMin") || new Date().toISOString()
    const timeMax = searchParams.get("timeMax") || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    const slotMinutes = parseInt(searchParams.get("slotMinutes") || "30")

    const availability = await getAvailability(payload.userId, timeMin, timeMax)
    const recommendedSlot = await recommendAlternativeSlot({
      userId: payload.userId,
      timeMin,
      timeMax,
      slotMinutes,
    })

    return NextResponse.json({
      availability,
      recommendedSlot,
    }, { status: 200 })
  } catch (error: any) {
    console.error("[calendar/availability] GET Error:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch availability" }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from "next/server"
import { verifyAccessToken, extractTokenFromHeader } from "@/lib/auth/jwt"
import { orchestrateReschedule } from "@/services/meeting/orchestrate-reschedule"

export async function POST(req: NextRequest) {
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

    const body = await req.json()
    const { threadId, eventId, timeMin, timeMax, slotMinutes, calendarId } = body

    if (!threadId) {
      return NextResponse.json({ error: "threadId is required" }, { status: 400 })
    }

    const result = await orchestrateReschedule({
      userId: payload.userId,
      threadId,
      eventId,
      timeMin,
      timeMax,
      slotMinutes,
      calendarId,
    })

    return NextResponse.json(result, { status: 200 })
  } catch (error: any) {
    console.error("[api/reschedule] POST Error:", error)
    return NextResponse.json({ error: error.message || "Orchestration failed" }, { status: 500 })
  }
}

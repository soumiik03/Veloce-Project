import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth"
import { orchestrateReschedule } from "@/services/meeting/orchestrate-reschedule"

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { threadId, eventId, timeMin, timeMax, slotMinutes, calendarId } = body

    if (!threadId) {
      return NextResponse.json({ error: "threadId is required" }, { status: 400 })
    }

    const result = await orchestrateReschedule({
      userId: user.id,
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

import { NextRequest, NextResponse } from "next/server"
import { verifyAccessToken, extractTokenFromHeader } from "@/lib/auth/jwt"
import { updateGoogleCalendarEvent, deleteGoogleCalendarEvent } from "@/services/calendar/google-calendar"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
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
    const { event, calendarId } = body

    if (!event) {
      return NextResponse.json({ error: "Event payload is required" }, { status: 400 })
    }

    const result = await updateGoogleCalendarEvent(payload.userId, eventId, event, calendarId)
    return NextResponse.json(result, { status: 200 })
  } catch (error: any) {
    console.error("[calendar/events/[eventId]] PATCH Error:", error)
    return NextResponse.json({ error: error.message || "Failed to update event" }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
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
    const calendarId = searchParams.get("calendarId") || "primary"

    await deleteGoogleCalendarEvent(payload.userId, eventId, calendarId)
    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error: any) {
    console.error("[calendar/events/[eventId]] DELETE Error:", error)
    return NextResponse.json({ error: error.message || "Failed to delete event" }, { status: 500 })
  }
}

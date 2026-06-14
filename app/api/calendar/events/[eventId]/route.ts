import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth"
import { updateGoogleCalendarEvent, deleteGoogleCalendarEvent } from "@/services/calendar/google-calendar"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const user = await getSessionUser(req)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { event, calendarId } = body

    if (!event) {
      return NextResponse.json({ error: "Event payload is required" }, { status: 400 })
    }

    const result = await updateGoogleCalendarEvent(user.id, eventId, event, calendarId)
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
    const user = await getSessionUser(req)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const calendarId = searchParams.get("calendarId") || "primary"

    await deleteGoogleCalendarEvent(user.id, eventId, calendarId)
    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error: any) {
    console.error("[calendar/events/[eventId]] DELETE Error:", error)
    return NextResponse.json({ error: error.message || "Failed to delete event" }, { status: 500 })
  }
}

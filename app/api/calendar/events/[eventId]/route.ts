import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth"
import { getValidAccessToken } from "@/lib/auth/google"

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
    const { event, calendarId = "primary" } = body

    if (!event) {
      return NextResponse.json({ error: "Event payload is required" }, { status: 400 })
    }

    const token = await getValidAccessToken(user.id, 'calendar')
    const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`)

    const res = await fetch(url.toString(), {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(event)
    })

    if (!res.ok) {
      throw new Error("Failed to update event via Calendar API")
    }

    const result = await res.json()
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

    const token = await getValidAccessToken(user.id, 'calendar')
    const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`)

    const res = await fetch(url.toString(), {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    })

    if (!res.ok) {
      throw new Error("Failed to delete event via Calendar API")
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error: any) {
    console.error("[calendar/events/[eventId]] DELETE Error:", error)
    return NextResponse.json({ error: error.message || "Failed to delete event" }, { status: 500 })
  }
}

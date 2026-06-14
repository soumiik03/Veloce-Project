import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth"
import { createGoogleCalendarEvent } from "@/services/calendar/google-calendar"
import { corsair } from "@/lib/corsair"
import { getSimulatedEvents, saveSimulatedEvent } from "@/lib/simulated-data"
import { ensureGoogleTokens } from "@/services/auth/google"

export async function POST(req: NextRequest) {
  let userId = ""
  let eventPayload: unknown = null
  try {
    const user = await getSessionUser(req)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    userId = user.id

    const body = await req.json()
    const { event, calendarId } = body
    eventPayload = event

    if (!event) {
      return NextResponse.json({ error: "Event payload is required" }, { status: 400 })
    }

    await ensureGoogleTokens(userId)
    const result = await createGoogleCalendarEvent(userId, event, calendarId)
    return NextResponse.json(result, { status: 201 })
  } catch (error: unknown) {
    const err = error as Error
    console.error("[calendar/events] POST Error, trying simulated fallback:", err.message || err)
    if (userId && eventPayload) {
      try {
        const payload = eventPayload as {
          summary?: string
          start?: { dateTime?: string }
          end?: { dateTime?: string }
          attendees?: { email: string }[]
        }
        const newEvent = saveSimulatedEvent(userId, {
          summary: payload.summary || "Rescheduled Meeting",
          start: { dateTime: payload.start?.dateTime || new Date().toISOString() },
          end: { dateTime: payload.end?.dateTime || new Date(Date.now() + 1800000).toISOString() },
          attendees: payload.attendees || [],
          status: "confirmed"
        })
        return NextResponse.json(newEvent, { status: 201 })
      } catch (fallbackErr: unknown) {
        const fErr = fallbackErr as Error
        console.error("Failed to save simulated event:", fErr)
      }
    }
    return NextResponse.json({ error: err.message || "Failed to create event" }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  let userId = ""
  try {
    const user = await getSessionUser(req)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    userId = user.id

    const { searchParams } = new URL(req.url)
    const calendarId = searchParams.get("calendarId") || "primary"
    const timeMin = searchParams.get("timeMin") || new Date().toISOString()
    const timeMax = searchParams.get("timeMax") || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    await ensureGoogleTokens(userId)
    const tenant = corsair.withTenant(userId)
    const result = await tenant.googlecalendar.api.events.getMany({
      calendarId,
      timeMin,
      timeMax,
      singleEvents: true,
    })

    return NextResponse.json(result, { status: 200 })
  } catch (error: unknown) {
    const err = error as Error
    console.error("[calendar/events] GET Error, returning simulated events:", err.message || err)
    if (userId) {
      try {
        const simulated = getSimulatedEvents(userId)
        return NextResponse.json({ items: simulated }, { status: 200 })
      } catch (fallbackErr: unknown) {
        const fErr = fallbackErr as Error
        console.error("Failed to load simulated events:", fErr)
      }
    }
    return NextResponse.json({ error: err.message || "Failed to list events" }, { status: 500 })
  }
}

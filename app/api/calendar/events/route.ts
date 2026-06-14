import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth"
import { getValidAccessToken } from "@/lib/auth/google"

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
    const { event, calendarId = "primary" } = body
    eventPayload = event

    if (!event) {
      return NextResponse.json({ error: "Event payload is required" }, { status: 400 })
    }

    const token = await getValidAccessToken(userId, 'calendar')
    const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`)
    
    const res = await fetch(url.toString(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(eventPayload)
    })

    if (!res.ok) {
      throw new Error("Failed to insert event via Calendar API")
    }
    
    const result = await res.json()
    return NextResponse.json(result, { status: 201 })
  } catch (error: unknown) {
    const err = error as Error
    console.error("[calendar/events] POST Error:", err.message || err)
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

    const token = await getValidAccessToken(userId, 'calendar')
    const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`)
    url.searchParams.set("timeMin", timeMin)
    url.searchParams.set("timeMax", timeMax)
    url.searchParams.set("singleEvents", "true")
    url.searchParams.set("orderBy", "startTime")

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` }
    })

    if (!res.ok) {
      throw new Error("Failed to list events from Calendar API")
    }

    const result = await res.json()
    return NextResponse.json(result.items || [], { status: 200 })
  } catch (error: unknown) {
    const err = error as Error
    console.error("[calendar/events] GET Error:", err.message || err)
    return NextResponse.json({ error: err.message || "Failed to list events" }, { status: 500 })
  }
}

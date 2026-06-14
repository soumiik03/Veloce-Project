import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth"
import { getTenant, provisionTenant } from "@/lib/corsair/tenant"

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

    await provisionTenant(userId)
    const tenant = getTenant(userId)
    
    const result = await tenant.googlecalendar.api.events.insert({
      calendarId,
      requestBody: event
    })
    
    return NextResponse.json(result.data, { status: 201 })
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

    await provisionTenant(userId)
    const tenant = getTenant(userId)
    
    const result = await tenant.googlecalendar.api.events.list({
      calendarId,
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: "startTime"
    })

    return NextResponse.json({ items: result.data.items || [] }, { status: 200 })
  } catch (error: unknown) {
    const err = error as Error
    console.error("[calendar/events] GET Error:", err.message || err)
    return NextResponse.json({ error: err.message || "Failed to list events" }, { status: 500 })
  }
}

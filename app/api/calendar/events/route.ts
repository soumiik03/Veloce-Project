import { NextRequest, NextResponse } from "next/server"
import { verifyAccessToken, extractTokenFromHeader } from "@/lib/auth/jwt"
import { createGoogleCalendarEvent } from "@/services/calendar/google-calendar"
import { corsair } from "@/lib/corsair"

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
    const { event, calendarId } = body

    if (!event) {
      return NextResponse.json({ error: "Event payload is required" }, { status: 400 })
    }

    const result = await createGoogleCalendarEvent(payload.userId, event, calendarId)
    return NextResponse.json(result, { status: 201 })
  } catch (error: any) {
    console.error("[calendar/events] POST Error:", error)
    return NextResponse.json({ error: error.message || "Failed to create event" }, { status: 500 })
  }
}

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
    const calendarId = searchParams.get("calendarId") || "primary"
    const timeMin = searchParams.get("timeMin") || new Date().toISOString()
    const timeMax = searchParams.get("timeMax") || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    const tenant = corsair.withTenant(payload.userId)
    const result = await tenant.googlecalendar.api.events.getMany({
      calendarId,
      timeMin,
      timeMax,
      singleEvents: true,
    })

    return NextResponse.json(result, { status: 200 })
  } catch (error: any) {
    console.error("[calendar/events] GET Error:", error)
    return NextResponse.json({ error: error.message || "Failed to list events" }, { status: 500 })
  }
}

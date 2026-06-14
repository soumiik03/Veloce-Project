import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth"
import { getValidAccessToken } from "@/lib/auth/google"

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const timeMin = searchParams.get("timeMin") || new Date().toISOString()
    
    // Default to +7 days if timeMax not provided
    const nextWeek = new Date()
    nextWeek.setDate(nextWeek.getDate() + 7)
    const timeMax = searchParams.get("timeMax") || nextWeek.toISOString()

    const accessToken = await getValidAccessToken(user.id)

    const calendarUrl = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events")
    calendarUrl.searchParams.set("timeMin", timeMin)
    calendarUrl.searchParams.set("timeMax", timeMax)
    calendarUrl.searchParams.set("singleEvents", "true")
    calendarUrl.searchParams.set("orderBy", "startTime")

    const listResponse = await fetch(calendarUrl.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store"
    })

    if (!listResponse.ok) {
      const errorData = await listResponse.json()
      console.error("[calendar] Failed to fetch events:", errorData)
      return NextResponse.json({ error: "Failed to fetch from Google Calendar" }, { status: listResponse.status })
    }

    const listData = await listResponse.json()
    return NextResponse.json({ items: listData.items || [] })
  } catch (error: any) {
    console.error("[calendar] Error:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch calendar events" }, { status: 500 })
  }
}

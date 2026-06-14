import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth"
import { getTenant, provisionTenant } from "@/lib/corsair/tenant"

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

    await provisionTenant(user.id)
    const tenant = getTenant(user.id)

    const result = await tenant.googlecalendar.api.events.patch({
      calendarId,
      eventId,
      requestBody: event
    })

    return NextResponse.json(result.data, { status: 200 })
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

    await provisionTenant(user.id)
    const tenant = getTenant(user.id)

    await tenant.googlecalendar.api.events.delete({
      calendarId,
      eventId
    })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error: any) {
    console.error("[calendar/events/[eventId]] DELETE Error:", error)
    return NextResponse.json({ error: error.message || "Failed to delete event" }, { status: 500 })
  }
}

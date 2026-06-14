import { getSessionUser } from "@/lib/auth"
import { corsair } from "@/lib/corsair"
import { provisionTenant } from "@/lib/corsair/tenant"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req)
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = user.id
    await provisionTenant(userId)
    const tenant = corsair.withTenant(userId)

    let gmailConnected = false
    let calendarConnected = false

    try {
      const gmailToken = await (tenant.gmail as any).keys.get_access_token()
      gmailConnected = !!gmailToken
    } catch (e) {
      console.warn("Failed to check gmail token:", e)
    }

    try {
      const calendarToken = await (tenant.googlecalendar as any).keys.get_access_token()
      calendarConnected = !!calendarToken
    } catch (e) {
      console.warn("Failed to check calendar token:", e)
    }

    return NextResponse.json({
      gmail: gmailConnected,
      googlecalendar: calendarConnected,
      connected: gmailConnected && calendarConnected,
    })
  } catch (error: any) {
    console.error("[onboarding/status] Error:", error)
    return NextResponse.json({ error: error.message || "Failed to check connection status" }, { status: 500 })
  }
}

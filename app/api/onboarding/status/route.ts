import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth"
import { db } from "@/db"
import { onboardingStatus } from "@/db/schema"
import { eq } from "drizzle-orm"



export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const [status] = await db
      .select()
      .from(onboardingStatus)
      .where(eq(onboardingStatus.userId, user.id))
      .limit(1)

    return NextResponse.json({
      gmail: status?.connectedGmail || false,
      googlecalendar: status?.connectedCalendar || false,
      connected: !!status?.completedAt,
    })
  } catch (error: any) {
    console.error("[onboarding/status] Error:", error)
    return NextResponse.json({ error: error.message || "Failed to check connection status" }, { status: 500 })
  }
}

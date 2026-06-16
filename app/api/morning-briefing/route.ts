import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth"
import { db } from "@/db"
import { users } from "@/db/schema/users"
import { sendMorningBriefingToUser } from "@/services/mail/morning-briefing"
import { eq } from "drizzle-orm"

export async function POST(req: NextRequest) {
  try {
    let email = ""
    let userId = ""
    let userRecord = null

    // Try to get session user from cookies
    const sessionUser = await getSessionUser(req).catch(() => null)
    if (sessionUser?.id) {
      userId = sessionUser.id
      email = sessionUser.email
      const records = await db.select().from(users).where(eq(users.clerkId, sessionUser.clerkId)).limit(1)
      userRecord = records[0]
    } else {
      // Fallback: Read userEmail from POST body (for cron job or manual trigger)
      try {
        const body = await req.json()
        if (body?.userEmail) {
          email = body.userEmail
          const records = await db.select().from(users).where(eq(users.email, email)).limit(1)
          if (records.length > 0) {
            userRecord = records[0]
            userId = userRecord.id
          }
        }
      } catch {}
    }

    if (!userRecord || !userId) {
      return NextResponse.json({ error: "User not found or unauthorized" }, { status: 401 })
    }

    const result = await sendMorningBriefingToUser(userId, email)
    return NextResponse.json({
      success: true,
      emailSent: result.success,
      briefing: result.briefing
    })
  } catch (error: any) {
    console.error("[api/morning-briefing] POST Error:", error)
    return NextResponse.json({ error: error.message || "Failed to generate briefing" }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { users } from "@/db/schema/users"
import { sendMorningBriefingToUser } from "@/services/mail/morning-briefing"
import { eq } from "drizzle-orm"

export async function GET(req: NextRequest) {
  return handleCronTrigger(req)
}

export async function POST(req: NextRequest) {
  return handleCronTrigger(req)
}

async function handleCronTrigger(req: NextRequest) {
  console.log("🌅 [Cron] Triggering Daily Morning Briefing...")

  try {
    const activeUsers = await db
      .select()
      .from(users)
      .where(eq(users.morningBriefingEnabled, true))

    if (activeUsers.length === 0) {
      console.log("🌅 [Cron] No active users with morning briefing enabled.")
      return NextResponse.json({ success: true, count: 0, message: "No active users with morning briefing enabled." })
    }

    console.log(`🌅 [Cron] Found ${activeUsers.length} users with morning briefing enabled. Processing...`)

    const results = await Promise.allSettled(
      activeUsers.map(async (user) => {
        try {
          console.log(`🌅 [Cron] Dispatching briefing for user: ${user.email} (id: ${user.id})`)
          const res = await sendMorningBriefingToUser(user.id, user.email)
          return { email: user.email, success: true, briefing: res.briefing }
        } catch (err: any) {
          console.error(`❌ [Cron] Failed to send briefing to ${user.email}:`, err.message)
          return { email: user.email, success: false, error: err.message }
        }
      })
    )

    const summary = results.map((r, idx) => {
      const user = activeUsers[idx]
      return {
        email: user.email,
        status: r.status === "fulfilled" && (r.value as any).success ? "sent" : "failed",
        reason: r.status === "rejected" ? r.reason : (r.value as any).error || null
      }
    })

    return NextResponse.json({
      success: true,
      count: activeUsers.length,
      summary
    })
  } catch (error: any) {
    console.error("❌ [Cron] Morning briefing execution failed:", error)
    return NextResponse.json({ error: error.message || "Cron execution failed" }, { status: 500 })
  }
}

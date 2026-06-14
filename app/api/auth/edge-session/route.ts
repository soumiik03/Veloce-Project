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

    const onboarded = !!status?.completedAt

    return NextResponse.json({
      id: user.id,
      onboarded,
    })
  } catch (err) {
    console.error("[edge-session] Error:", err)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

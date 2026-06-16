export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth"
import { db } from "@/db"
import { users } from "@/db/schema/users"
import { eq } from "drizzle-orm"

export async function GET(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser(req)
    if (!sessionUser?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const [userRecord] = await db
      .select({ morningBriefingEnabled: users.morningBriefingEnabled })
      .from(users)
      .where(eq(users.clerkId, sessionUser.clerkId))
      .limit(1)

    return NextResponse.json({
      morningBriefingEnabled: userRecord?.morningBriefingEnabled ?? true
    })
  } catch (error: any) {
    console.error("[api/settings/morning-briefing] GET Error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser(req)
    if (!sessionUser?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { morningBriefingEnabled } = body

    if (typeof morningBriefingEnabled !== "boolean") {
      return NextResponse.json({ error: "morningBriefingEnabled must be a boolean" }, { status: 400 })
    }

    await db
      .update(users)
      .set({ morningBriefingEnabled })
      .where(eq(users.clerkId, sessionUser.clerkId))

    return NextResponse.json({ success: true, morningBriefingEnabled })
  } catch (error: any) {
    console.error("[api/settings/morning-briefing] POST Error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth"
import { detectConflicts } from "@/services/background/conflict-detector"

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const conflicts = await detectConflicts(user.id)
    return NextResponse.json({ conflicts: conflicts || [] }, { status: 200 })
  } catch (error: any) {
    console.error("[api/calendar/conflicts] Error:", error)
    return NextResponse.json({ error: error.message || "Failed to retrieve conflicts" }, { status: 500 })
  }
}

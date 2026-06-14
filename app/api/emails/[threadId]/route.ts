import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth"
import { getThreadMessages } from "@/services/mail/thread-reader"
import { detectMeetingIntentFromThread } from "@/services/meeting/detect-meeting"
import { provisionTenant } from "@/lib/corsair/tenant"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  let userId = ""
  try {
    const { threadId } = await params
    const user = await getSessionUser(req)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    userId = user.id

    try {
      await provisionTenant(userId)
      const thread = await getThreadMessages(userId, threadId)
      const detection = await detectMeetingIntentFromThread(userId, threadId)

      return NextResponse.json({
        thread,
        detection,
      })
    } catch (apiErr) {
      console.error("[api/emails/[threadId]] Google API failed:", apiErr)
      throw apiErr
    }
  } catch (error: any) {
    console.error("[api/emails/[threadId]] GET Error:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch thread" }, { status: 500 })
  }
}

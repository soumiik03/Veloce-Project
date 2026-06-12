import { NextRequest, NextResponse } from "next/server"
import { verifyAccessToken, extractTokenFromHeader } from "@/lib/auth/jwt"
import { getThreadMessages } from "@/services/mail/thread-reader"
import { detectMeetingIntentFromThread } from "@/services/meeting/detect-meeting"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const { threadId } = await params
    const authHeader = req.headers.get("Authorization")
    let token = extractTokenFromHeader(authHeader)
    if (!token) {
      token = req.cookies.get("accessToken")?.value || null
    }

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = verifyAccessToken(token)
    if (!payload) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 })
    }

    const thread = await getThreadMessages(payload.userId, threadId)
    const detection = await detectMeetingIntentFromThread(payload.userId, threadId)

    return NextResponse.json({
      thread,
      detection,
    })
  } catch (error: any) {
    console.error("[api/emails/[threadId]] GET Error:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch thread" }, { status: 500 })
  }
}

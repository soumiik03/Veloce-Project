import { NextRequest, NextResponse } from "next/server"
import { verifyAccessToken, extractTokenFromHeader } from "@/lib/auth/jwt"
import { getThreadMessages } from "@/services/mail/thread-reader"
import { detectMeetingIntentFromThread } from "@/services/meeting/detect-meeting"
import { getSimulatedEmails } from "@/lib/simulated-data"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  let userId = ""
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
    userId = payload.userId

    try {
      const thread = await getThreadMessages(userId, threadId)
      const detection = await detectMeetingIntentFromThread(userId, threadId)

      return NextResponse.json({
        thread,
        detection,
      })
    } catch (apiErr) {
      console.warn("[api/emails/[threadId]] Google API failed, trying simulated fallback:", apiErr)
      const simulatedThreads = getSimulatedEmails(userId)
      const found = simulatedThreads.find((t) => t.id === threadId)
      if (found) {
        return NextResponse.json({
          thread: found,
          detection: {
            isMeetingRelated: found.subject.toLowerCase().includes("sync") || found.subject.toLowerCase().includes("meet") || found.subject.toLowerCase().includes("architecture"),
            isRescheduleRequest: found.snippet.toLowerCase().includes("reschedule") || found.snippet.toLowerCase().includes("conflict"),
            confidence: 0.95,
            attendees: [found.from, found.to].filter((x) => x && x !== "me"),
            suggestedTimes: [],
            subject: found.subject
          }
        })
      }
      throw apiErr
    }
  } catch (error: any) {
    console.error("[api/emails/[threadId]] GET Error:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch thread" }, { status: 500 })
  }
}

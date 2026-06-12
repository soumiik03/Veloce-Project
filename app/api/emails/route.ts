import { NextRequest, NextResponse } from "next/server"
import { verifyAccessToken, extractTokenFromHeader } from "@/lib/auth/jwt"
import { listInboxThreads, getThreadMessages } from "@/services/mail/thread-reader"

export async function GET(req: NextRequest) {
  try {
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

    const { searchParams } = new URL(req.url)
    const maxResults = parseInt(searchParams.get("maxResults") || "10")

    const listResult = await listInboxThreads(payload.userId, maxResults)
    const messages = listResult.messages || []

    const threadIds = Array.from(new Set(messages.map((m: any) => m.threadId)))
    const threads = await Promise.all(
      threadIds.slice(0, 8).map(async (threadId: any) => {
        try {
          const detail = await getThreadMessages(payload.userId, threadId)
          if (!detail || !detail.messages || detail.messages.length === 0) return null
          const latest = detail.messages[detail.messages.length - 1]
          const headers = latest.payload?.headers || []
          const getHeader = (name: string) => {
            const h = headers.find((x: any) => x.name.toLowerCase() === name.toLowerCase())
            return h ? h.value : null
          }
          return {
            id: threadId,
            subject: getHeader("subject") || latest.snippet || "No Subject",
            from: getHeader("from") || "Unknown Sender",
            date: getHeader("date") || "",
            snippet: latest.snippet || "",
          }
        } catch (err) {
          console.error("Error fetching thread details:", err)
          return null
        }
      })
    )

    return NextResponse.json({
      threads: threads.filter(Boolean),
    })
  } catch (error: any) {
    console.error("[api/emails] GET Error:", error)
    return NextResponse.json({ error: error.message || "Failed to list emails" }, { status: 500 })
  }
}

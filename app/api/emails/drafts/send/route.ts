import { NextRequest, NextResponse } from "next/server"
import { verifyAccessToken, extractTokenFromHeader } from "@/lib/auth/jwt"
import { sendDraftReply } from "@/services/mail/draft-reply"

export async function POST(req: NextRequest) {
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

    const body = await req.json()
    const { draftId } = body

    if (!draftId) {
      return NextResponse.json({ error: "draftId is required" }, { status: 400 })
    }

    const result = await sendDraftReply({
      userId: payload.userId,
      draftId,
    })

    return NextResponse.json(result, { status: 200 })
  } catch (error: any) {
    console.error("[api/emails/drafts/send] POST Error:", error)
    return NextResponse.json({ error: error.message || "Failed to send draft" }, { status: 500 })
  }
}

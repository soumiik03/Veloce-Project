import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth"
import { sendDraftReply } from "@/services/mail/draft-reply"

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { draftId } = body

    if (!draftId) {
      return NextResponse.json({ error: "draftId is required" }, { status: 400 })
    }

    const result = await sendDraftReply({
      userId: user.id,
      draftId,
    })

    return NextResponse.json(result, { status: 200 })
  } catch (error: any) {
    console.error("[api/emails/drafts/send] POST Error:", error)
    return NextResponse.json({ error: error.message || "Failed to send draft" }, { status: 500 })
  }
}

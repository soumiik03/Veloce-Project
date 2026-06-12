import { NextRequest, NextResponse } from "next/server"
import { verifyAccessToken, extractTokenFromHeader } from "@/lib/auth/jwt"
import { chatWithGemini } from "@/services/agent.service"

/**
 * Handle conversational chat commands for the workspace command bar.
 */
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
    const { message, context } = body

    if (!message || message.trim().length === 0) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    const reply = await chatWithGemini(message, context)

    return NextResponse.json({
      response: reply,
    })
  } catch (error: any) {
    console.error("[api/agent] POST Error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to process agent command" },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth"
import { chatWithGeminiStream } from "@/services/agent.service"
import { db } from "@/db"
import { agent_messages } from "@/db/schema"

/**
 * Handle conversational chat commands for the workspace command bar.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req)
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { message, context } = body

    if (!message || message.trim().length === 0) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    const userId = user.id

    // 1. Log user message to the database
    await db.insert(agent_messages).values({
      userId,
      role: "user",
      content: message,
    })

    // 2. Start streaming with Gemini
    const encoder = new TextEncoder()
    const rawStream = await chatWithGeminiStream(userId, message, context)

    const sseStream = new ReadableStream({
      async start(controller) {
        const reader = rawStream.getReader()
        let aggregatedResponse = ""
        let hasSaved = false

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) {
              break
            }
            if (value) {
              aggregatedResponse += value
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: value })}\n\n`))
            }
          }

          if (aggregatedResponse) {
            hasSaved = true
            await db.insert(agent_messages).values({
              userId,
              role: "assistant",
              content: aggregatedResponse,
            })
          }
        } catch (err) {
          console.error("[api/agent] Streaming error:", err)
          controller.error(err)
        } finally {
          if (!hasSaved && aggregatedResponse) {
            try {
              await db.insert(agent_messages).values({
                userId,
                role: "assistant",
                content: aggregatedResponse,
              })
            } catch (dbErr) {
              console.error("[api/agent] Failed to save partial assistant message:", dbErr)
            }
          }
          controller.close()
        }
      }
    })

    return new Response(sseStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      },
    })
  } catch (error: any) {
    console.error("[api/agent] POST Error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to process agent command" },
      { status: 500 }
    )
  }
}


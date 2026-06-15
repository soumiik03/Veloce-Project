import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth"
import { runAgentCoPilotStream } from "@/services/agent.service"
import { db } from "@/db"
import { agent_messages } from "@/db/schema"

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req)
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { message, threadId: reqThreadId, threadTitle: reqThreadTitle } = body

    if (!message || message.trim().length === 0) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    const userId = user.id
    const threadId = reqThreadId || crypto.randomUUID()
    const threadTitle = reqThreadTitle || (message.slice(0, 40) + (message.length > 40 ? "..." : ""))

    
    await db.insert(agent_messages).values({
      userId,
      threadId,
      threadTitle,
      role: "user",
      content: message,
    })

    
    const rawStream = await runAgentCoPilotStream(userId, message)
    
    
    const encoder = new TextEncoder()
    const decoder = new TextDecoder()
    
    const sseStream = new ReadableStream({
      async start(controller) {
        const reader = rawStream.getReader()
        let aggregatedResponse = ""
        let hasSaved = false

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            if (value) {
              
              controller.enqueue(value as any)

              
              const chunkStr = typeof value === "string" ? value : decoder.decode(value as any)
              const lines = chunkStr.split("\n")
              for (const line of lines) {
                const trimmed = line.trim()
                if (trimmed.startsWith("data:")) {
                  try {
                    const parsed = JSON.parse(trimmed.slice(5).trim())
                    if (parsed.text) {
                      aggregatedResponse += parsed.text
                    }
                  } catch {}
                }
              }
            }
          }

          if (aggregatedResponse) {
            hasSaved = true
            await db.insert(agent_messages).values({
              userId,
              threadId,
              threadTitle,
              role: "assistant",
              content: aggregatedResponse,
            })
          }
        } catch (err) {
          console.error("[api/agent] Streaming interception error:", err)
          controller.error(err)
        } finally {
          if (!hasSaved && aggregatedResponse) {
            try {
              await db.insert(agent_messages).values({
                userId,
                threadId,
                threadTitle,
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

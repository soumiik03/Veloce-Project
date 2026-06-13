import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth"
import { db } from "@/db"
import { agent_messages } from "@/db/schema"
import { eq, desc } from "drizzle-orm"
import { isDynamicUsageError } from "@/lib/auth/jwt"

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req)
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const messages = await db
      .select()
      .from(agent_messages)
      .where(eq(agent_messages.userId, user.id))
      .orderBy(desc(agent_messages.createdAt))

    const threadsMap = new Map()
    for (const msg of messages) {
      if (!threadsMap.has(msg.threadId)) {
        threadsMap.set(msg.threadId, {
          id: msg.threadId,
          subject: msg.threadTitle || msg.content.slice(0, 40) + (msg.content.length > 40 ? "..." : "") || "New conversation",
        })
      }
    }

    const threads = Array.from(threadsMap.values()).slice(0, 15)

    return NextResponse.json({ threads }, { status: 200 })
  } catch (error: any) {
    if (isDynamicUsageError(error)) {
      throw error
    }
    console.error("[api/agent/threads] GET Error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to list agent threads" },
      { status: 500 }
    )
  }
}

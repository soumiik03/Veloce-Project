import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth"
import { db } from "@/db"
import { agent_messages } from "@/db/schema"
import { eq, and, asc } from "drizzle-orm"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const { threadId } = await params
    const user = await getSessionUser(req)
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const messages = await db
      .select()
      .from(agent_messages)
      .where(
        and(
          eq(agent_messages.userId, user.id),
          eq(agent_messages.threadId, threadId)
        )
      )
      .orderBy(asc(agent_messages.createdAt))

    return NextResponse.json({ messages }, { status: 200 })
  } catch (error: any) {
    console.error("[api/agent/threads/[threadId]] GET Error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to retrieve thread messages" },
      { status: 500 }
    )
  }
}

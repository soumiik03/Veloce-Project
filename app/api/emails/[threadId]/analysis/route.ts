import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth"
import { getThreadMessages } from "@/services/mail/thread-reader"
import { provisionTenant } from "@/lib/corsair/tenant"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const { threadId } = await params
    const user = await getSessionUser(req)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = user.id

    // Get thread content
    let subject = ""
    let body = ""
    let from = ""

    try {
      await provisionTenant(userId)
      const thread = await getThreadMessages(userId, threadId)
      if (thread && thread.messages && thread.messages.length > 0) {
        const latest = thread.messages[thread.messages.length - 1]
        const headers = latest.payload?.headers || []
        subject = headers.find((h: any) => h.name.toLowerCase() === "subject")?.value || ""
        from = headers.find((h: any) => h.name.toLowerCase() === "from")?.value || ""
        body = thread.messages.map((m: any) => m.snippet || "").join("\n")
      }
    } catch (apiErr) {
      console.error("[api/emails/[threadId]/analysis] Failed to fetch thread content:", apiErr)
      throw apiErr
    }

    if (!body) {
      return NextResponse.json({
        summary: "No content available to analyze.",
        actionRequirements: [],
        priority: "Low",
        calendarRelevance: "None",
        suggestedReplies: ["Acknowledge receipt"]
      })
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.Gemini_API_KEY
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured")
    }

    const prompt = `
      Analyze the following email thread:
      From: ${from}
      Subject: ${subject}
      Content: ${body}

      Generate a JSON object containing:
      1. summary: A concise 2-3 sentence summary.
      2. actionRequirements: A list of key actions required from the recipient.
      3. priority: One of "High", "Medium", or "Low" based on urgency and sender.
      4. calendarRelevance: A brief description of how this email relates to meetings, scheduling, or dates.
      5. suggestedReplies: A list of 2-3 short, action-oriented reply suggestions.

      Return ONLY the JSON matching the required schema.
    `

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                summary: { type: "STRING" },
                actionRequirements: {
                  type: "ARRAY",
                  items: { type: "STRING" }
                },
                priority: { type: "STRING", enum: ["High", "Medium", "Low"] },
                calendarRelevance: { type: "STRING" },
                suggestedReplies: {
                  type: "ARRAY",
                  items: { type: "STRING" }
                }
              },
              required: ["summary", "actionRequirements", "priority", "calendarRelevance", "suggestedReplies"]
            }
          }
        })
      }
    )

    const geminiData = await geminiRes.json()
    if (!geminiRes.ok) {
      console.error("[Gemini Summary API Error]:", geminiData)
      throw new Error(geminiData.error?.message || "Failed to analyze thread with Gemini")
    }

    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text
    if (!rawText) {
      throw new Error("Empty response from Gemini")
    }

    return NextResponse.json(JSON.parse(rawText), { status: 200 })
  } catch (error: any) {
    console.error("[api/emails/[threadId]/analysis] Error:", error)
    return NextResponse.json({
      summary: "Failed to load automated summary due to a connection or key issue.",
      actionRequirements: ["Manual review required."],
      priority: "Medium",
      calendarRelevance: "Needs inspection.",
      suggestedReplies: ["Acknowledge email"]
    })
  }
}

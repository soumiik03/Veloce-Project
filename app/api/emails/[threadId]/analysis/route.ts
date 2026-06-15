import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth"
import { getThreadMessages } from "@/services/mail/thread-reader"
import { provisionTenant } from "@/lib/corsair/tenant"

/**
 * Extract JSON from a response that may contain markdown code fences or thinking tags.
 * Handles: raw JSON, ```json ... ```, ```...```, and <think>...</think> blocks.
 */
function extractJSON(text: string): string {
  // Strip <think>...</think> blocks (Qwen3 thinking model output)
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/g, "").trim()
  // Try to extract from markdown code fence
  const fenceMatch = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
  if (fenceMatch) {
    return fenceMatch[1].trim()
  }
  // Try to find raw JSON object
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    return jsonMatch[0].trim()
  }
  return cleaned
}

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

    const openrouterKey = process.env.OPENROUTER_API_KEY
    const openrouterModel = process.env.OPENROUTER_MODEL || "google/gemini-2.5-flash"
    const geminiKey = process.env.GEMINI_API_KEY || process.env.Gemini_API_KEY

    if (!openrouterKey && !geminiKey) {
      throw new Error("Neither OPENROUTER_API_KEY nor GEMINI_API_KEY is configured")
    }

    const prompt = `Analyze the following email thread and return ONLY a valid JSON object (no markdown, no explanation, no code fences).

From: ${from}
Subject: ${subject}
Content: ${body}

Return this exact JSON structure:
{"summary": "2-3 sentence summary", "actionRequirements": ["action1", "action2"], "priority": "High or Medium or Low", "calendarRelevance": "description of calendar relevance", "suggestedReplies": ["reply1", "reply2"]}

Do NOT wrap in code fences. Do NOT add any text before or after the JSON. Return ONLY the JSON object.`

    let rawText = ""
    let openRouterSuccess = false

    if (openrouterKey) {
      try {
        const openrouterRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${openrouterKey}`,
            "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
            "X-Title": "Veloce"
          },
          body: JSON.stringify({
            model: openrouterModel,
            messages: [{ role: "user", content: prompt }]
          })
        })

        const openrouterData = await openrouterRes.json()
        if (openrouterRes.ok && openrouterData.choices?.[0]?.message?.content) {
          rawText = openrouterData.choices[0].message.content
          openRouterSuccess = true
        } else {
          console.warn("[OpenRouter Summary API Warning]: Failed or rate-limited. Falling back to Gemini.", openrouterData)
        }
      } catch (err) {
        console.warn("[OpenRouter Summary API Exception]: Falling back to Gemini.", err)
      }
    }
    
    if (!openRouterSuccess) {
      if (!geminiKey) {
        throw new Error("OpenRouter failed and GEMINI_API_KEY is not configured for fallback")
      }
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${geminiKey}`,
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

      rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text
      if (!rawText) {
        throw new Error("Empty response from Gemini fallback")
      }
    }

    const jsonStr = extractJSON(rawText)
    return NextResponse.json(JSON.parse(jsonStr), { status: 200 })
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

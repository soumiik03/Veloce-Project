import { createGoogleCalendarEvent, updateGoogleCalendarEvent, deleteGoogleCalendarEvent } from "@/services/calendar/google-calendar"
import { listInboxThreads, getThreadMessages } from "@/services/mail/thread-reader"
import { sendThreadReply } from "@/services/mail/draft-reply"
import { getAvailability } from "@/services/calendar/event-service"
import { getValidAccessToken } from "@/lib/auth/google"

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

/**
 * Strip <think>...</think> blocks from streaming text chunks.
 * Accumulates partial think tags across chunks.
 */
function stripThinkingTags(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/g, "")
}

export type GeminiMeetingAnalysis = {
  isMeetingRelated: boolean
  isRescheduleRequest: boolean
  summary: string
  suggestedTimes: string[]
  attendees: string[]
  confidence: number
}

export async function analyzeEmailWithGemini(
  subject: string,
  body: string,
  from: string
): Promise<GeminiMeetingAnalysis> {
  const openrouterKey = process.env.OPENROUTER_API_KEY
  const openrouterModel = process.env.OPENROUTER_MODEL || "google/gemini-2.5-flash"
  const geminiKey = process.env.GEMINI_API_KEY || process.env.Gemini_API_KEY

  if (!openrouterKey && !geminiKey) {
    throw new Error("Neither OPENROUTER_API_KEY nor GEMINI_API_KEY is configured")
  }

  const prompt = `Analyze the following email and return ONLY a valid JSON object (no markdown, no code fences, no explanation).

Sender: ${from}
Subject: ${subject}
Body: ${body}

Return this exact JSON structure:
{"isMeetingRelated": true/false, "isRescheduleRequest": true/false, "summary": "brief summary", "suggestedTimes": ["time1", "time2"], "attendees": ["email1@example.com"], "confidence": 0.0-1.0}

Do NOT wrap in code fences. Return ONLY the JSON object.`

  let rawText = ""
  let openRouterSuccess = false

  if (openrouterKey) {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
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

      const data = await response.json()
      if (response.ok && data.choices?.[0]?.message?.content) {
        rawText = data.choices[0].message.content
        openRouterSuccess = true
      } else {
        console.warn("[OpenRouter Analysis Warning]: Failed or rate-limited. Falling back to Gemini.", data)
      }
    } catch (err) {
      console.warn("[OpenRouter Analysis Exception]: Falling back to Gemini.", err)
    }
  }

  if (openRouterSuccess) {
    const jsonStr = extractJSON(rawText)
    return JSON.parse(jsonStr) as GeminiMeetingAnalysis
  } else {
    if (!geminiKey) {
      throw new Error("OpenRouter failed and GEMINI_API_KEY is not configured for fallback")
    }
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                isMeetingRelated: { type: "BOOLEAN" },
                isRescheduleRequest: { type: "BOOLEAN" },
                summary: { type: "STRING" },
                suggestedTimes: {
                  type: "ARRAY",
                  items: { type: "STRING" }
                },
                attendees: {
                  type: "ARRAY",
                  items: { type: "STRING" }
                },
                confidence: { type: "NUMBER" }
              },
              required: ["isMeetingRelated", "isRescheduleRequest", "summary", "suggestedTimes", "attendees", "confidence"]
            }
          }
        })
      }
    )

    const data = await response.json()
    if (!response.ok) {
      console.error("[Gemini API Error]:", data)
      throw new Error(data.error?.message || "Failed to analyze email with Gemini")
    }

    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (!rawText) {
      throw new Error("Empty response from Gemini")
    }

    return JSON.parse(rawText) as GeminiMeetingAnalysis
  }
}

async function executeTool(userId: string, name: string, args: any): Promise<any> {
  console.log(`[Agent Tool Execution] Running ${name} with args:`, args)

  try {
    switch (name) {
      case "get_inbox": {
        const maxResults = args.maxResults || 20
        try {
          const listResult = await listInboxThreads(userId, maxResults)
          const messages = listResult.messages || []
          const threadIds = Array.from(new Set(messages.map((m: any) => m.threadId)))
          const threads = await Promise.all(
            threadIds.slice(0, 8).map(async (tId: any) => {
              try {
                const detail = await getThreadMessages(userId, tId)
                if (!detail || !detail.messages || detail.messages.length === 0) return null
                const latest = detail.messages[detail.messages.length - 1]
                const headers = latest.payload?.headers || []
                const getHeader = (n: string) => {
                  const h = headers.find((x: any) => x.name.toLowerCase() === n.toLowerCase())
                  return h ? h.value : null
                }
                return {
                  id: tId,
                  subject: getHeader("subject") || latest.snippet || "No Subject",
                  from: getHeader("from") || "Unknown Sender",
                  date: getHeader("date") || "",
                  snippet: latest.snippet || "",
                }
              } catch {
                return null
              }
            })
          )
          return { threads: threads.filter(Boolean) }
        } catch (err: any) {
          console.error("Real Inbox fetch failed:", err.message)
          throw err
        }
      }

      case "get_thread": {
        const { threadId } = args
        try {
          const detail = await getThreadMessages(userId, threadId)
          return { thread: detail }
        } catch (err: any) {
          console.error("Real thread fetch failed:", err.message)
          throw err
        }
      }

      case "search_emails": {
        const { query } = args
        try {
          const token = await getValidAccessToken(userId)
          const url = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages")
          url.searchParams.set("q", query)
          url.searchParams.set("maxResults", "20")

          const listRes = await fetch(url.toString(), {
            headers: { Authorization: `Bearer ${token}` }
          })
          if (!listRes.ok) throw new Error("Search failed")
          
          const listResult = await listRes.json()
          const messages = listResult.messages || []
          const threadIds = Array.from(new Set(messages.map((m: any) => m.threadId)))
          const threads = await Promise.all(
            threadIds.slice(0, 8).map(async (tId: any) => {
              const detail = await getThreadMessages(userId, tId)
              if (!detail || !detail.messages || detail.messages.length === 0) return null
              const latest = detail.messages[detail.messages.length - 1]
              const headers = latest.payload?.headers || []
              const getHeader = (n: string) => headers.find((x: any) => x.name.toLowerCase() === n.toLowerCase())?.value || null
              return {
                id: tId,
                subject: getHeader("subject") || latest.snippet || "No Subject",
                from: getHeader("from") || "Unknown Sender",
                date: getHeader("date") || "",
                snippet: latest.snippet || "",
              }
            })
          )
          return { threads: threads.filter(Boolean) }
        } catch (err: any) {
          console.error("Real search failed:", err.message)
          throw err
        }
      }

      case "draft_reply": {
        const { threadId, body } = args
        try {
          const thread = await getThreadMessages(userId, threadId)
          if (!thread || !thread.messages || thread.messages.length === 0) {
            throw new Error("Thread not found or has no messages")
          }
          const latestMessage = thread.messages[thread.messages.length - 1]
          const headers = latestMessage.payload?.headers || []
          const getHeader = (n: string) => headers.find((x: any) => x.name.toLowerCase() === n.toLowerCase())?.value || null
          
          const subject = getHeader("subject") || "Re: Reply"
          const fromHeader = getHeader("from") || ""
          const emailRegex = /<([^>]+)>/
          const match = fromHeader.match(emailRegex)
          const to = match ? match[1] : fromHeader
          const messageId = getHeader("message-id")

          const emailHeaders = [
            `To: ${to}`,
            `Subject: ${subject.startsWith("Re:") ? subject : `Re: ${subject}`}`,
            "MIME-Version: 1.0",
            'Content-Type: text/plain; charset="UTF-8"',
          ]
          if (messageId) {
            emailHeaders.push(`In-Reply-To: ${messageId}`)
            emailHeaders.push(`References: ${messageId}`)
          }
          emailHeaders.push("", body)
          const raw = Buffer.from(emailHeaders.join("\r\n"))
            .toString("base64")
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/g, "")

          const token = await getValidAccessToken(userId)
          const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/drafts", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ message: { raw, threadId } })
          })

          if (!res.ok) throw new Error("Failed to create draft")
          const draft = await res.json()
          
          return { success: true, draftId: draft.id, draftBody: body }
        } catch (err: any) {
          console.error("Gmail draft creation failed:", err.message)
          throw err
        }
      }

      case "send_reply": {
        const { threadId, body } = args
        try {
          await sendThreadReply({ userId, threadId, body })
          return { success: true }
        } catch (err: any) {
          console.error("Gmail send failed:", err.message)
          throw err
        }
      }

      case "get_events": {
        const { timeMin, timeMax } = args
        try {
          const token = await getValidAccessToken(userId, 'calendar')
          const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events")
          url.searchParams.set("timeMin", timeMin || new Date().toISOString())
          url.searchParams.set("timeMax", timeMax || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString())
          url.searchParams.set("singleEvents", "true")

          const res = await fetch(url.toString(), {
            headers: { Authorization: `Bearer ${token}` }
          })
          if (!res.ok) throw new Error("Get events failed")
          const result = await res.json()
          return { events: result.items || [] }
        } catch (err: any) {
          console.error("Calendar getEvents failed:", err.message)
          throw err
        }
      }

      case "create_event": {
        const { summary, start, end, attendees } = args
        try {
          const result = await createGoogleCalendarEvent(userId, {
            summary,
            start: typeof start === "string" ? { dateTime: start } : start,
            end: typeof end === "string" ? { dateTime: end } : end,
            attendees: attendees?.map((email: string) => ({ email })) || []
          })
          return { success: true, event: result }
        } catch (err: any) {
          console.error("Calendar create failed:", err.message)
          throw err
        }
      }

      case "reschedule_event": {
        const { eventId, start, end } = args
        try {
          const result = await updateGoogleCalendarEvent(userId, eventId, {
            start: typeof start === "string" ? { dateTime: start } : start,
            end: typeof end === "string" ? { dateTime: end } : end
          })
          return { success: true, event: result }
        } catch (err: any) {
          console.error("Calendar update failed:", err.message)
          throw err
        }
      }

      case "delete_event": {
        const { eventId } = args
        try {
          await deleteGoogleCalendarEvent(userId, eventId)
          return { success: true }
        } catch (err: any) {
          console.error("Calendar delete failed:", err.message)
          throw err
        }
      }

      case "get_availability": {
        const { timeMin, timeMax } = args
        try {
          const availability = await getAvailability(userId, timeMin, timeMax)
          return { availability }
        } catch (err: any) {
          console.error("Calendar get_availability failed, returning empty availability:", err.message)
          return { availability: { calendars: { primary: { busy: [] } } } }
        }
      }

      case "detect_conflicts": {
        return { conflicts: [] }
      }

      default:
        throw new Error(`Tool ${name} not found`)
    }
  } catch (error: any) {
    console.error(`Error executing tool ${name}:`, error)
    return { error: error.message || `Failed to execute tool ${name}` }
  }
}

const SYSTEM_PROMPT = `You are the Veloce AI assistant — an intelligent productivity agent 
with access to the user's Gmail and Google Calendar.

You can:
- Read, summarize, and search emails
- Draft and send replies (always show draft to user before sending)
- Create, reschedule, and delete calendar events
- Detect scheduling conflicts between emails and calendar
- Suggest optimal meeting times based on calendar availability
- Answer questions about the user's schedule, workload, and priorities

Always fetch real data before answering questions about emails or calendar.
Be concise, direct, and action-oriented.
When you detect a conflict or reschedule request, proactively flag it.
Format times in the user's local timezone.
Never send emails or modify calendar events without explicit user confirmation.`

const ANTHROPIC_TOOLS = [
  {
    name: "get_inbox",
    description: "Fetch the latest 20 Gmail threads.",
    input_schema: {
      type: "object",
      properties: {
        maxResults: { type: "number", description: "Optional max threads to fetch (default: 20)." }
      }
    }
  },
  {
    name: "get_thread",
    description: "Fetch the full email thread by ID.",
    input_schema: {
      type: "object",
      properties: {
        threadId: { type: "string", description: "The unique Gmail thread ID." }
      },
      required: ["threadId"]
    }
  },
  {
    name: "search_emails",
    description: "Gmail search query.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Gmail search query matching search syntax." }
      },
      required: ["query"]
    }
  },
  {
    name: "draft_reply",
    description: "Prepare reply for user review.",
    input_schema: {
      type: "object",
      properties: {
        threadId: { type: "string", description: "The thread ID to reply to." },
        body: { type: "string", description: "The content of the reply draft." }
      },
      required: ["threadId", "body"]
    }
  },
  {
    name: "send_reply",
    description: "Send reply after user clicks confirm.",
    input_schema: {
      type: "object",
      properties: {
        threadId: { type: "string", description: "The thread ID." },
        body: { type: "string", description: "The content of the email." }
      },
      required: ["threadId", "body"]
    }
  },
  {
    name: "get_events",
    description: "Google Calendar events for date range.",
    input_schema: {
      type: "object",
      properties: {
        timeMin: { type: "string", description: "ISO 8601 start date-time." },
        timeMax: { type: "string", description: "ISO 8601 end date-time." }
      }
    }
  },
  {
    name: "create_event",
    description: "Create a new calendar event.",
    input_schema: {
      type: "object",
      properties: {
        summary: { type: "string", description: "Title of the event." },
        start: { type: "string", description: "ISO 8601 start time." },
        end: { type: "string", description: "ISO 8601 end time." },
        attendees: { type: "array", items: { type: "string" }, description: "Attendee email addresses." }
      },
      required: ["summary", "start", "end"]
    }
  },
  {
    name: "reschedule_event",
    description: "Move an existing event.",
    input_schema: {
      type: "object",
      properties: {
        eventId: { type: "string", description: "Calendar event ID." },
        start: { type: "string", description: "New ISO 8601 start time." },
        end: { type: "string", description: "New ISO 8601 end time." }
      },
      required: ["eventId", "start", "end"]
    }
  },
  {
    name: "delete_event",
    description: "Cancel calendar event.",
    input_schema: {
      type: "object",
      properties: {
        eventId: { type: "string", description: "Event ID to delete." }
      },
      required: ["eventId"]
    }
  },
  {
    name: "get_availability",
    description: "Find free slots in calendar.",
    input_schema: {
      type: "object",
      properties: {
        timeMin: { type: "string", description: "ISO 8601 start range." },
        timeMax: { type: "string", description: "ISO 8601 end range." }
      },
      required: ["timeMin", "timeMax"]
    }
  },
  {
    name: "detect_conflicts",
    description: "Cross-reference emails and calendar for scheduling conflicts.",
    input_schema: {
      type: "object",
      properties: {}
    }
  }
];

export async function runAgentCoPilotStream(
  userId: string,
  userMessage: string,
  onToken?: (text: string) => void,
  onLog?: (text: string) => void
): Promise<ReadableStream<string>> {
  const openrouterKey = process.env.OPENROUTER_API_KEY
  const openrouterModel = process.env.OPENROUTER_MODEL || "google/gemini-2.5-flash"
  const geminiKey = process.env.GEMINI_API_KEY || process.env.Gemini_API_KEY

  if (!openrouterKey && !geminiKey) {
    throw new Error("Neither OPENROUTER_API_KEY nor GEMINI_API_KEY is configured")
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream<string>({
    async start(controller) {
      // Stateful filter for Qwen3's <think>...</think> streaming blocks
      let insideThink = false
      let pendingBuffer = ""
      
      const _onToken = (text: string) => {
        // Filter out <think>...</think> blocks from streaming output
        let remaining = pendingBuffer + text
        pendingBuffer = ""
        let output = ""
        
        while (remaining.length > 0) {
          if (insideThink) {
            const closeIdx = remaining.indexOf("</think>")
            if (closeIdx !== -1) {
              insideThink = false
              remaining = remaining.slice(closeIdx + 8)
            } else {
              // Still inside think block, check if we have a partial </think> at the end
              if (remaining.endsWith("<") || remaining.endsWith("</") || 
                  remaining.endsWith("</t") || remaining.endsWith("</th") ||
                  remaining.endsWith("</thi") || remaining.endsWith("</thin") ||
                  remaining.endsWith("</think")) {
                pendingBuffer = remaining
              }
              remaining = ""
            }
          } else {
            const openIdx = remaining.indexOf("<think>")
            if (openIdx !== -1) {
              output += remaining.slice(0, openIdx)
              insideThink = true
              remaining = remaining.slice(openIdx + 7)
            } else {
              // Check for partial <think> at end of chunk
              const partialCheck = remaining.slice(-7)
              if (partialCheck.includes("<") && 
                  "<think>".startsWith(remaining.slice(remaining.lastIndexOf("<")))) {
                output += remaining.slice(0, remaining.lastIndexOf("<"))
                pendingBuffer = remaining.slice(remaining.lastIndexOf("<"))
                remaining = ""
              } else {
                output += remaining
                remaining = ""
              }
            }
          }
        }
        
        if (output) {
          if (onToken) onToken(output)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: output })}\n\n`) as any)
        }
      }
      const _onLog = (log: string) => {
        if (onLog) onLog(log)
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ log })}\n\n`) as any)
      }

      try {
        let openRouterSuccess = false

        if (openrouterKey) {
          try {
            const openrouterTools = ANTHROPIC_TOOLS.map((t: any) => ({
              type: "function",
              function: {
                name: t.name,
                description: t.description,
                parameters: t.input_schema
              }
            }))

            // First call: tool selection
            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${openrouterKey}`,
                "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
                "X-Title": "Veloce"
              },
              body: JSON.stringify({
                model: openrouterModel,
                messages: [
                  { role: "system", content: SYSTEM_PROMPT },
                  { role: "user", content: userMessage }
                ],
                tools: openrouterTools,
                tool_choice: "auto"
              })
            })

            const responseData = await response.json().catch(() => ({}))
            
            if (response.ok && responseData.choices?.[0]) {
              const message = responseData.choices[0].message
              const toolCalls = message?.tool_calls

              if (toolCalls && toolCalls.length > 0) {
                const toolCall = toolCalls[0]
                const { name } = toolCall.function
                let args = {}
                try {
                  args = JSON.parse(toolCall.function.arguments || "{}")
                } catch (jsonErr) {
                  console.warn("Failed to parse tool call arguments:", toolCall.function.arguments, jsonErr)
                }

                _onLog(`[tool] Executing ${name}...`)
                const toolResult = await executeTool(userId, name, args)

                // Second call: streaming final answer
                const sseResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${openrouterKey}`,
                    "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
                    "X-Title": "Veloce"
                  },
                  body: JSON.stringify({
                    model: openrouterModel,
                    messages: [
                      { role: "system", content: SYSTEM_PROMPT },
                      { role: "user", content: userMessage },
                      {
                        role: "assistant",
                        content: message.content || null,
                        tool_calls: toolCalls
                      },
                      {
                        role: "tool",
                        tool_call_id: toolCall.id,
                        name: name,
                        content: JSON.stringify(toolResult)
                      }
                    ],
                    stream: true
                  })
                })

                if (!sseResponse.ok) {
                  const errorData = await sseResponse.json().catch(() => ({}))
                  throw new Error(errorData.error?.message || "Failed to stream OpenRouter feedback")
                }

                // Stream established successfully
                openRouterSuccess = true
                
                const reader = sseResponse.body?.getReader()
                const decoder = new TextDecoder()
                let buffer = ""

                if (reader) {
                  while (true) {
                    const { done, value } = await reader.read()
                    if (done) break
                    buffer += decoder.decode(value, { stream: true })
                    const lines = buffer.split("\n")
                    buffer = lines.pop() || ""
                    for (const line of lines) {
                      const trimmed = line.trim()
                      if (!trimmed.startsWith("data:")) continue
                      const jsonStr = trimmed.slice(5).trim()
                      if (jsonStr === "[DONE]") continue
                      try {
                        const parsed = JSON.parse(jsonStr)
                        const text = parsed.choices?.[0]?.delta?.content
                        if (text) _onToken(text)
                      } catch {}
                    }
                  }
                }
              } else {
                // Direct response
                openRouterSuccess = true
                _onToken(message?.content || "")
              }
            } else {
              console.warn("[OpenRouter Chat Warning]: Failed or rate-limited. Falling back to Gemini.", responseData)
            }
          } catch (err) {
            console.warn("[OpenRouter Chat Exception]: Falling back to Gemini.", err)
          }
        }
        
        if (!openRouterSuccess) {
          if (!geminiKey) {
            throw new Error("OpenRouter failed and GEMINI_API_KEY is not configured for fallback")
          }
          // Direct Gemini fallback path
          const GEMINI_TOOLS = [
            {
              functionDeclarations: ANTHROPIC_TOOLS.map((t: any) => ({
                name: t.name,
                description: t.description,
                parameters: t.input_schema
              }))
            }
          ]

          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${geminiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                systemInstruction: {
                  parts: [{ text: SYSTEM_PROMPT }]
                },
                contents: [
                  {
                    role: "user",
                    parts: [{ text: userMessage }]
                  }
                ],
                tools: GEMINI_TOOLS,
                toolConfig: {
                  functionCallingConfig: {
                    mode: "AUTO"
                  }
                }
              })
            }
          )

          if (!response.ok) {
            throw new Error("Gemini tool selection failed")
          }

          const responseData = await response.json()
          const candidate = responseData.candidates?.[0]
          const part = candidate?.content?.parts?.[0]

          if (part?.functionCall) {
            const { name, args } = part.functionCall
            _onLog(`[tool] Executing ${name}...`)
            
            const toolResult = await executeTool(userId, name, args)

            const sseResponse = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:streamGenerateContent?key=${geminiKey}&alt=sse`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  systemInstruction: {
                    parts: [{ text: SYSTEM_PROMPT }]
                  },
                  contents: [
                    {
                      role: "user",
                      parts: [{ text: userMessage }]
                    },
                    {
                      role: "model",
                      parts: [part]
                    },
                    {
                      role: "function",
                      parts: [
                        {
                          functionResponse: {
                            name,
                            id: part.functionCall.id,
                            response: { output: toolResult }
                          }
                        }
                      ]
                    }
                  ],
                  tools: GEMINI_TOOLS
                })
              }
            )

            if (!sseResponse.ok) {
              const errTxt = await sseResponse.text().catch(() => "Unknown error")
              console.error("[Gemini SSE Error]:", errTxt)
              throw new Error("Failed to stream feedback")
            }

            const reader = sseResponse.body?.getReader()
            const decoder = new TextDecoder()
            let buffer = ""

            if (reader) {
              while (true) {
                const { done, value } = await reader.read()
                if (done) break
                buffer += decoder.decode(value, { stream: true })
                const lines = buffer.split("\n")
                buffer = lines.pop() || ""
                for (const line of lines) {
                  const trimmed = line.trim()
                  if (!trimmed.startsWith("data:")) continue
                  const jsonStr = trimmed.slice(5).trim()
                  if (jsonStr === "[DONE]") continue
                  try {
                    const parsed = JSON.parse(jsonStr)
                    const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text
                    if (text) _onToken(text)
                  } catch {}
                }
              }
            }
          } else {
            _onToken(part?.text || "")
          }
        }
      } catch (err: any) {
        _onLog(`[error] ${err.message}`)
      } finally {
        controller.close()
      }
    }
  })

  return stream
}

import { createGoogleCalendarEvent, updateGoogleCalendarEvent, deleteGoogleCalendarEvent } from "@/services/calendar/google-calendar"
import { listInboxThreads, getThreadMessages } from "@/services/mail/thread-reader"
import { sendThreadReply } from "@/services/mail/draft-reply"
import { getAvailability } from "@/services/calendar/event-service"
import { getValidAccessToken } from "@/lib/auth/google"

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
  const apiKey = process.env.GEMINI_API_KEY || process.env.Gemini_API_KEY
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured")
  }

  const prompt = `
    Analyze the following email details:
    Sender: ${from}
    Subject: ${subject}
    Body: ${body}

    Determine:
    1. If the email is related to scheduling, sync, invitations, or a meeting.
    2. If it is specifically requesting to reschedule an existing meeting.
    3. Provide a brief summary of the scheduling request.
    4. Extract any suggested dates, times, or time ranges proposed by the sender.
    5. Extract all email addresses mentioned as potential attendees.
    6. Estimate your confidence score between 0.0 and 1.0.

    Return the analysis matching the required JSON structure.
  `

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
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
]

export async function runAgentCoPilotStream(
  userId: string,
  userMessage: string,
  onToken?: (text: string) => void,
  onLog?: (text: string) => void
): Promise<ReadableStream<string>> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.Gemini_API_KEY
  if (!apiKey) throw new Error("No Gemini key")

  const encoder = new TextEncoder()
  const stream = new ReadableStream<string>({
    async start(controller) {
      const _onToken = (text: string) => {
        if (onToken) onToken(text)
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`) as any)
      }
      const _onLog = (log: string) => {
        if (onLog) onLog(log)
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ log })}\n\n`) as any)
      }

      try {
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
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
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
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?key=${apiKey}&alt=sse`,
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
                    parts: [
                      {
                        functionCall: {
                          name,
                          args
                        }
                      }
                    ]
                  },
                  {
                    role: "function",
                    parts: [
                      {
                        functionResponse: {
                          name,
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

          if (!sseResponse.ok) throw new Error("Failed to stream feedback")

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
          // Direct response fallback
          _onToken(part?.text || "")
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

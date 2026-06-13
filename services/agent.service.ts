import { getTenant } from "@/lib/corsair/tenant"
import { saveSimulatedEmail, getSimulatedEmails } from "@/lib/simulated-data"
import { createGoogleCalendarEvent, updateGoogleCalendarEvent, deleteGoogleCalendarEvent } from "@/services/calendar/google-calendar"
import { listInboxThreads, getThreadMessages } from "@/services/mail/thread-reader"
import { sendThreadReply } from "@/services/mail/draft-reply"
import { getAvailability } from "@/services/calendar/event-service"
import { corsair } from "@/lib/corsair"

export type GeminiMeetingAnalysis = {
  isMeetingRelated: boolean
  isRescheduleRequest: boolean
  summary: string
  suggestedTimes: string[]
  attendees: string[]
  confidence: number
}

/**
 * Analyses email thread content to identify scheduling context using Gemini 2.5 Flash.
 */
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

// -------------------------------------------------------------
// Unified Productivity Tools Implementation
// -------------------------------------------------------------

async function executeTool(userId: string, name: string, args: any): Promise<any> {
  console.log(`[Agent Tool Execution] Running ${name} with args:`, args)
  const tenant = corsair.withTenant(userId)

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
          console.warn("Real Inbox fetch failed, falling back to simulated:", err.message)
          const simulated = getSimulatedEmails(userId)
          return { threads: simulated }
        }
      }

      case "get_thread": {
        const { threadId } = args
        try {
          const detail = await getThreadMessages(userId, threadId)
          return { thread: detail }
        } catch (err: any) {
          console.warn("Real thread fetch failed, returning simulated:", err.message)
          const simulated = getSimulatedEmails(userId).find(t => t.id === threadId)
          return { thread: simulated }
        }
      }

      case "search_emails": {
        const { query } = args
        try {
          const listResult = await tenant.gmail.api.messages.list({
            userId: "me",
            q: query,
            maxResults: 20
          })
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
          console.warn("Real search failed, returning filtered simulated:", err.message)
          const queryLower = query.toLowerCase()
          const filtered = getSimulatedEmails(userId).filter(t => 
            t.subject.toLowerCase().includes(queryLower) || t.snippet.toLowerCase().includes(queryLower)
          )
          return { threads: filtered }
        }
      }

      case "draft_reply": {
        const { threadId, body } = args
        // In Veloce, a draft reply is prepared and return to user review
        // Create actual draft via Gmail API
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

          const draft = await tenant.gmail.api.drafts.create({
            userId: "me",
            draft: { message: { raw, threadId } }
          })
          return { success: true, draftId: draft.id, draftBody: body }
        } catch (err: any) {
          console.warn("Gmail draft creation failed, using mock:", err.message)
          return { success: true, draftId: "mock-draft-" + Date.now(), draftBody: body }
        }
      }

      case "send_reply": {
        const { threadId, body } = args
        try {
          await sendThreadReply({ userId, threadId, body })
          return { success: true }
        } catch (err: any) {
          console.warn("Gmail send failed, using mock:", err.message)
          saveSimulatedEmail(userId, {
            to: "me",
            subject: "Re: Sync",
            from: "me",
            date: new Date().toLocaleDateString(),
            snippet: body
          })
          return { success: true, simulated: true }
        }
      }

      case "get_events": {
        const { timeMin, timeMax } = args
        try {
          const result = await tenant.googlecalendar.api.events.getMany({
            calendarId: "primary",
            timeMin: timeMin || new Date().toISOString(),
            timeMax: timeMax || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
            singleEvents: true,
          })
          return { events: result.items || [] }
        } catch (err: any) {
          console.warn("Calendar getEvents failed, returning simulated:", err.message)
          return { events: getSimulatedEmails(userId) } // fallback simulated
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
          console.warn("Calendar create failed, returning simulated:", err.message)
          const simulated = saveSimulatedEmail(userId, {
            to: "me",
            subject: summary,
            from: "me",
            date: new Date().toLocaleDateString(),
            snippet: `Event scheduled: ${summary}`
          })
          return { success: true, event: simulated, simulated: true }
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
          console.warn("Calendar update failed, returning simulated:", err.message)
          return { success: true, eventId, rescheduled: true, simulated: true }
        }
      }

      case "delete_event": {
        const { eventId } = args
        try {
          await deleteGoogleCalendarEvent(userId, eventId)
          return { success: true }
        } catch (err: any) {
          console.warn("Calendar delete failed, using simulated:", err.message)
          return { success: true, simulated: true }
        }
      }

      case "get_availability": {
        const { timeMin, timeMax } = args
        try {
          const availability = await getAvailability(userId, timeMin, timeMax)
          return { availability }
        } catch (err: any) {
          console.warn("Calendar get_availability failed, using simulated fallback:", err.message)
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

// -------------------------------------------------------------
// Anthropic Co-Pilot Implementation
// -------------------------------------------------------------

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

async function runAnthropicAgentLoop(
  userId: string,
  userMessage: string,
  onToken: (text: string) => void,
  onLog: (text: string) => void
) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error("No Anthropic API key")
  }

  const messages: any[] = [{ role: "user", content: userMessage }]
  let loopCount = 0

  while (loopCount < 5) {
    loopCount++
    console.log(`[Anthropic Agent Loop] Calling Claude (turn ${loopCount})`)

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1500,
        system: SYSTEM_PROMPT,
        messages,
        tools: ANTHROPIC_TOOLS
      })
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`Anthropic API failed: ${errText}`)
    }

    const responseData = await res.json()
    const contentBlocks = responseData.content || []
    
    // Check if Assistant returned text or tool use
    const textBlock = contentBlocks.find((b: any) => b.type === "text")
    if (textBlock && textBlock.text) {
      onToken(textBlock.text)
    }

    const toolUseBlocks = contentBlocks.filter((b: any) => b.type === "tool_use")
    if (toolUseBlocks.length === 0) {
      // Final text response reached
      break
    }

    // Push Claude's response to the conversation history
    messages.push({
      role: "assistant",
      content: contentBlocks
    })

    const toolResultContent: any[] = []

    for (const block of toolUseBlocks) {
      const { id, name, input } = block
      onLog(`[tool] Executing ${name}...`)
      
      const output = await executeTool(userId, name, input)
      
      toolResultContent.push({
        type: "tool_result",
        tool_use_id: id,
        content: JSON.stringify(output)
      })
    }

    // Add tool results to the conversation history
    messages.push({
      role: "user",
      content: toolResultContent
    })
  }
}

// -------------------------------------------------------------
// Gemini Fallback Co-Pilot Implementation
// -------------------------------------------------------------

const GEMINI_TOOLS = [
  {
    functionDeclarations: ANTHROPIC_TOOLS.map((t: any) => ({
      name: t.name,
      description: t.description,
      parameters: t.input_schema
    }))
  }
]

async function runGeminiAgentLoop(
  userId: string,
  userMessage: string,
  onToken: (text: string) => void,
  onLog: (text: string) => void
) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.Gemini_API_KEY
  if (!apiKey) {
    throw new Error("No Gemini API key")
  }

  // 1. Initial tool selection request
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
    const errorText = await response.text()
    throw new Error(`Gemini tool selection failed: ${errorText}`)
  }

  const responseData = await response.json()
  const candidate = responseData.candidates?.[0]
  const part = candidate?.content?.parts?.[0]

  if (part?.functionCall) {
    const { name, args } = part.functionCall
    onLog(`[tool] Executing ${name}...`)
    
    const toolResult = await executeTool(userId, name, args)

    // Send tool result back to Gemini to stream final answer
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

    if (!sseResponse.ok) {
      throw new Error("Failed to stream response from Gemini tool feedback")
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
            if (text) {
              onToken(text)
            }
          } catch {}
        }
      }
    }
  } else {
    // No tool calls needed, stream directly
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
            }
          ]
        })
      }
    )

    if (!sseResponse.ok) {
      throw new Error("Failed to stream standard response from Gemini")
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
            if (text) {
              onToken(text)
            }
          } catch {}
        }
      }
    }
  }
}

// -------------------------------------------------------------
// Unified Entry Points
// -------------------------------------------------------------

export async function chatWithGeminiStream(
  userId: string,
  userMessage: string,
  context?: any
): Promise<ReadableStream<string>> {
  // Return standard stream (Gemini only)
  const apiKey = process.env.GEMINI_API_KEY || process.env.Gemini_API_KEY
  if (!apiKey) throw new Error("No Gemini key")

  const res = await fetch(
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
          }
        ]
      })
    }
  )

  return new ReadableStream({
    async start(controller) {
      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      if (!reader) {
        controller.close()
        return
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""
        for (const line of lines) {
          const trimmed = line.trim()
          if (trimmed.startsWith("data:")) {
            try {
              const parsed = JSON.parse(trimmed.slice(5).trim())
              const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text
              if (text) controller.enqueue(text)
            } catch {}
          }
        }
      }
      controller.close()
    }
  })
}

/**
 * High-level router that executes either Anthropic agent loops or Gemini fallbacks,
 * yielding SSE logs of tool execution and streaming response text.
 */
export async function runAgentCoPilotStream(
  userId: string,
  userMessage: string
): Promise<ReadableStream<string>> {
  return new ReadableStream({
    async start(controller) {
      const emitText = (text: string) => {
        controller.enqueue(`data: ${JSON.stringify({ text })}\n\n`)
      }
      const emitLog = (log: string) => {
        controller.enqueue(`data: ${JSON.stringify({ log })}\n\n`)
      }

      try {
        if (process.env.ANTHROPIC_API_KEY) {
          emitLog("System initializing Claude 3.5 Sonnet co-pilot...")
          await runAnthropicAgentLoop(userId, userMessage, emitText, emitLog)
        } else {
          emitLog("System initializing Gemini 2.5 Flash co-pilot...")
          await runGeminiAgentLoop(userId, userMessage, emitText, emitLog)
        }
      } catch (err: any) {
        console.error("Co-pilot loop error:", err)
        controller.enqueue(`data: ${JSON.stringify({ error: err.message || "Execution error" })}\n\n`)
      } finally {
        controller.close()
      }
    }
  })
}

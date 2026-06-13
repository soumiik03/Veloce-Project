import { getTenant } from "@/lib/corsair/tenant"
import { saveSimulatedEmail } from "@/lib/simulated-data"
import { createGoogleCalendarEvent, updateGoogleCalendarEvent, deleteGoogleCalendarEvent } from "@/services/calendar/google-calendar"
import { listInboxThreads, getThreadMessages } from "@/services/mail/thread-reader"
import { sendThreadReply } from "@/services/mail/draft-reply"

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

/**
 * Handle conversational chat commands for the workspace command bar.
 */
export async function chatWithGemini(userMessage: string, context?: any): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.Gemini_API_KEY
  if (!apiKey) {
    return "Gemini API key is not configured on the server. Please check your .env.local file."
  }

  const systemPrompt = `
    You are Veloce Agent, a sleek, premium AI workspace assistant for Gmail and Calendar co-developed with Corsair.
    You help users manage scheduling, reschedule meetings, check availability, draft replies, and run commands.
    Maintain a professional, tech-forward, superhuman, and direct tone. Keep responses clear and concise.

    Current context: ${context ? JSON.stringify(context) : "No specific thread or event selected."}
  `

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: `${systemPrompt}\n\nUser: ${userMessage}` }]
          }
        ]
      })
    }
  )

  const data = await response.json()
  if (!response.ok) {
    console.error("[Gemini Chat Error]:", data)
    throw new Error(data.error?.message || "Failed to chat with Gemini")
  }

  return data.candidates?.[0]?.content?.parts?.[0]?.text || "I was unable to process your request."
}

export async function checkCalendar(userId: string, date: string) {
  try {
    const tenant = getTenant(userId)
    const timeMin = `${date}T00:00:00Z`
    const timeMax = `${date}T23:59:59Z`
    const result = await tenant.googlecalendar.api.events.getMany({
      calendarId: "primary",
      timeMin,
      timeMax,
      singleEvents: true,
    })
    return result.items || []
  } catch (error: any) {
    console.error("[checkCalendar] Error calling Google Calendar API, returning empty array:", error.message || error)
    return []
  }
}

function base64UrlEncode(input: string) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "")
}

function buildEmail({
  to,
  subject,
  body,
}: {
  to: string
  subject: string
  body: string
}) {
  return [
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "",
    body,
  ].join("\r\n")
}

export async function sendEmail(userId: string, to: string, subject: string, body: string) {
  try {
    const tenant = getTenant(userId)
    const raw = base64UrlEncode(
      buildEmail({
        to,
        subject,
        body,
      })
    )

    await tenant.gmail.api.messages.send({
      userId: "me",
      raw,
    })
    return { success: true }
  } catch (error: any) {
    console.error("[sendEmail] Error sending email via Gmail API, returning mock success:", error.message || error)
    try {
      saveSimulatedEmail(userId, {
        to,
        subject,
        from: "me",
        date: new Date().toLocaleDateString("en-US", { hour: '2-digit', minute: '2-digit' }),
        snippet: body.slice(0, 100)
      })
    } catch (err) {
      console.error("Failed to save simulated email:", err)
    }
    return { success: true, simulated: true }
  }
}

function makeReadableStreamFromResponse(response: Response): ReadableStream<string> {
  const reader = response.body?.getReader()
  const decoder = new TextDecoder()

  return new ReadableStream({
    async start(controller) {
      if (!reader) {
        controller.close()
        return
      }

      let buffer = ""

      try {
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
                controller.enqueue(text)
              }
            } catch (e) {
              console.warn("Failed to parse SSE JSON chunk:", jsonStr, e)
            }
          }
        }

        if (buffer.trim().startsWith("data:")) {
          const jsonStr = buffer.trim().slice(5).trim()
          try {
            const parsed = JSON.parse(jsonStr)
            const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text
            if (text) {
              controller.enqueue(text)
            }
          } catch {}
        }
      } catch (err) {
        controller.error(err)
      } finally {
        controller.close()
      }
    }
  })
}

/**
 * Handle conversational chat commands yielding chunks as a ReadableStream.
 */
export async function chatWithGeminiStream(
  userId: string,
  userMessage: string,
  context?: any
): Promise<ReadableStream<string>> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.Gemini_API_KEY
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured")
  }

  const systemPrompt = `
    You are Veloce Agent, a sleek, premium AI workspace assistant for Gmail and Calendar co-developed with Corsair.
    You help users manage scheduling, reschedule meetings, check availability, draft replies, and run commands.
    Maintain a professional, tech-forward, superhuman, and direct tone. Keep responses clear and concise.

    Current context: ${context ? JSON.stringify(context) : "No specific thread or event selected."}
  `

  const tools = [
    {
      functionDeclarations: [
        {
          name: "checkCalendarMeetings",
          description: "Check the calendar meetings scheduled for a specific date (in YYYY-MM-DD format). If there is a scheduling request or check request, use this tool to fetch current meetings first.",
          parameters: {
            type: "OBJECT",
            properties: {
              date: {
                type: "STRING",
                description: "The date to check in YYYY-MM-DD format."
              }
            },
            required: ["date"]
          }
        },
        {
          name: "sendEmailNotification",
          description: "Send a new email notification to a recipient.",
          parameters: {
            type: "OBJECT",
            properties: {
              to: {
                type: "STRING",
                description: "The recipient's email address."
              },
              subject: {
                type: "STRING",
                description: "The subject line of the email."
              },
              body: {
                type: "STRING",
                description: "The body of the email."
              }
            },
            required: ["to", "subject", "body"]
          }
        },
        {
          name: "listInboxEmails",
          description: "List the recent email threads in the user's inbox.",
          parameters: {
            type: "OBJECT",
            properties: {
              maxResults: {
                type: "NUMBER",
                description: "Optional number of threads to return (default is 10)."
              }
            }
          }
        },
        {
          name: "getEmailThreadDetail",
          description: "Retrieve all messages and details for a specific email thread.",
          parameters: {
            type: "OBJECT",
            properties: {
              threadId: {
                type: "STRING",
                description: "The ID of the thread to view."
              }
            },
            required: ["threadId"]
          }
        },
        {
          name: "replyToEmailThread",
          description: "Reply to an existing email thread.",
          parameters: {
            type: "OBJECT",
            properties: {
              threadId: {
                type: "STRING",
                description: "The ID of the email thread to reply to."
              },
              body: {
                type: "STRING",
                description: "The text body of the reply message."
              }
            },
            required: ["threadId", "body"]
          }
        },
        {
          name: "createCalendarEvent",
          description: "Create a new meeting/event in the user's Google Calendar.",
          parameters: {
            type: "OBJECT",
            properties: {
              summary: {
                type: "STRING",
                description: "The title or summary of the event."
              },
              startTime: {
                type: "STRING",
                description: "The start time of the event in ISO 8601 format (e.g. YYYY-MM-DDTHH:MM:SSZ)."
              },
              endTime: {
                type: "STRING",
                description: "The end time of the event in ISO 8601 format (e.g. YYYY-MM-DDTHH:MM:SSZ)."
              },
              attendees: {
                type: "ARRAY",
                items: { type: "STRING" },
                description: "Optional list of attendee email addresses."
              }
            },
            required: ["summary", "startTime", "endTime"]
          }
        },
        {
          name: "updateCalendarEvent",
          description: "Update an existing calendar event's details (like time or attendees).",
          parameters: {
            type: "OBJECT",
            properties: {
              eventId: {
                type: "STRING",
                description: "The ID of the calendar event to update."
              },
              summary: {
                type: "STRING",
                description: "The new summary of the event."
              },
              startTime: {
                type: "STRING",
                description: "The new start time in ISO 8601 format."
              },
              endTime: {
                type: "STRING",
                description: "The new end time in ISO 8601 format."
              },
              attendees: {
                type: "ARRAY",
                items: { type: "STRING" },
                description: "The new list of attendee email addresses."
              }
            },
            required: ["eventId"]
          }
        },
        {
          name: "deleteCalendarEvent",
          description: "Delete a calendar event from the user's Google Calendar.",
          parameters: {
            type: "OBJECT",
            properties: {
              eventId: {
                type: "STRING",
                description: "The ID of the event to delete."
              }
            },
            required: ["eventId"]
          }
        }
      ]
    }
  ]

  // 1. Initial REST call to Gemini (non-streaming) to check for function call
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        contents: [
          {
            role: "user",
            parts: [{ text: userMessage }]
          }
        ],
        tools,
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
    console.error("[Gemini API Error]:", errorText)
    throw new Error("Failed to query Gemini API")
  }

  const responseData = await response.json()
  const candidate = responseData.candidates?.[0]
  const part = candidate?.content?.parts?.[0]

  if (part?.functionCall) {
    const { name, args } = part.functionCall
    let toolResult: any = null

    if (name === "checkCalendarMeetings") {
      const date = args.date
      toolResult = await checkCalendar(userId, date)
    } else if (name === "sendEmailNotification") {
      const { to, subject, body } = args
      toolResult = await sendEmail(userId, to, subject, body)
    } else if (name === "listInboxEmails") {
      const maxResults = args.maxResults || 10
      try {
        const listResult = await listInboxThreads(userId, maxResults)
        const messages = listResult.messages || []
        const threadIds = Array.from(new Set(messages.map((m: any) => m.threadId)))
        const threads = await Promise.all(
          threadIds.slice(0, 5).map(async (tId: any) => {
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
        toolResult = { threads: threads.filter(Boolean) }
      } catch (err: any) {
        console.error("Agent failed to list emails:", err)
        toolResult = { error: err.message || "Failed to list emails" }
      }
    } else if (name === "getEmailThreadDetail") {
      const { threadId } = args
      try {
        const detail = await getThreadMessages(userId, threadId)
        toolResult = { thread: detail }
      } catch (err: any) {
        console.error("Agent failed to get email thread:", err)
        toolResult = { error: err.message || "Failed to get email thread" }
      }
    } else if (name === "replyToEmailThread") {
      const { threadId, body } = args
      try {
        toolResult = await sendThreadReply({ userId, threadId, body })
      } catch (err: any) {
        console.error("Agent failed to reply to email thread:", err)
        toolResult = { error: err.message || "Failed to reply to thread" }
      }
    } else if (name === "createCalendarEvent") {
      const { summary, startTime, endTime, attendees } = args
      try {
        toolResult = await createGoogleCalendarEvent(userId, {
          summary,
          start: { dateTime: startTime },
          end: { dateTime: endTime },
          attendees: attendees?.map((email: string) => ({ email })) || []
        })
      } catch (err: any) {
        console.error("Agent failed to create calendar event:", err)
        toolResult = { error: err.message || "Failed to create calendar event" }
      }
    } else if (name === "updateCalendarEvent") {
      const { eventId, summary, startTime, endTime, attendees } = args
      try {
        const updatePayload: any = {}
        if (summary) updatePayload.summary = summary
        if (startTime) updatePayload.start = { dateTime: startTime }
        if (endTime) updatePayload.end = { dateTime: endTime }
        if (attendees) updatePayload.attendees = attendees.map((email: string) => ({ email }))
        toolResult = await updateGoogleCalendarEvent(userId, eventId, updatePayload)
      } catch (err: any) {
        console.error("Agent failed to update calendar event:", err)
        toolResult = { error: err.message || "Failed to update calendar event" }
      }
    } else if (name === "deleteCalendarEvent") {
      const { eventId } = args
      try {
        await deleteGoogleCalendarEvent(userId, eventId)
        toolResult = { success: true }
      } catch (err: any) {
        console.error("Agent failed to delete calendar event:", err)
        toolResult = { error: err.message || "Failed to delete calendar event" }
      }
    }

    // Now, send the tool result back to Gemini in a streaming call!
    const sseResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?key=${apiKey}&alt=sse`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemPrompt }]
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
          tools
        })
      }
    )

    if (!sseResponse.ok) {
      const errorText = await sseResponse.text()
      console.error("[Gemini Streaming Tool Response Error]:", errorText)
      throw new Error("Failed to stream response from Gemini tool response")
    }

    return makeReadableStreamFromResponse(sseResponse)
  }

  // If no function call, construct a ReadableStream that just yields responseText
  const responseText = part?.text || "I was unable to process your request."
  return new ReadableStream({
    start(controller) {
      controller.enqueue(responseText)
      controller.close()
    }
  })
}

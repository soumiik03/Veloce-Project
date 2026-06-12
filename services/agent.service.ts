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
  const apiKey = process.env.GEMINI_API_KEY
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
  const apiKey = process.env.GEMINI_API_KEY
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

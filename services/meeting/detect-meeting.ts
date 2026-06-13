import { getThreadMessages } from "@/services/mail/thread-reader"
import { parseMeetingIntent } from "@/services/mail/thread-parser"
import { analyzeEmailWithGemini } from "@/services/agent.service"

/**
 * Extracts and decodes text/plain parts from the Gmail message payload.
 */
function getMessageBody(payload: any): string {
  if (!payload) return ""
  if (payload.mimeType === "text/plain" && payload.body?.data) {
    try {
      const base64 = payload.body.data.replace(/-/g, "+").replace(/_/g, "/")
      return Buffer.from(base64, "base64").toString("utf-8")
    } catch {
      return ""
    }
  }
  if (payload.parts) {
    return payload.parts.map((part: any) => getMessageBody(part)).filter(Boolean).join("\n")
  }
  return ""
}

export async function detectMeetingIntentFromThread(userId: string, threadId: string) {
  const thread = await getThreadMessages(userId, threadId)
  if (!thread || !thread.messages || thread.messages.length === 0) {
    throw new Error("Thread not found or has no messages")
  }

  const latestMessage = thread.messages[thread.messages.length - 1]
  const headers = latestMessage.payload?.headers || []

  const getHeader = (name: string) => {
    const header = headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())
    return header ? header.value : null
  }

  const subject = getHeader("subject") || latestMessage.snippet || ""
  const from = getHeader("from") || ""
  const messageId = getHeader("message-id") || null
  
  // Extract full decoded body or fall back to snippet
  const bodyText = getMessageBody(latestMessage.payload) || latestMessage.snippet || ""

  let intent
  try {
    const geminiAnalysis = await analyzeEmailWithGemini(subject, bodyText, from)
    intent = {
      isMeetingRelated: geminiAnalysis.isMeetingRelated,
      isRescheduleRequest: geminiAnalysis.isRescheduleRequest,
      subject: subject,
      suggestedTimes: geminiAnalysis.suggestedTimes,
      attendees: geminiAnalysis.attendees,
      confidence: geminiAnalysis.confidence,
    }
  } catch (error) {
    console.warn("[detect-meeting] Gemini analysis failed or unconfigured, falling back to keywords:", error)
    intent = parseMeetingIntent({
      subject,
      body: bodyText,
      from,
    })
  }

  return {
    intent,
    threadSubject: subject,
    lastMessageFrom: from,
    messageId,
  }
}

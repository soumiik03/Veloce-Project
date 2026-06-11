import { getThreadMessages } from "@/services/mail/thread-reader"
import { parseMeetingIntent } from "@/services/mail/thread-parser"

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
  const body = latestMessage.snippet || ""

  const intent = parseMeetingIntent({
    subject,
    body,
    from,
  })

  return {
    intent,
    threadSubject: subject,
    lastMessageFrom: from,
  }
}

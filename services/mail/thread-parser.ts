export type MeetingIntent = {
  isMeetingRelated: boolean
  isRescheduleRequest: boolean
  subject?: string | null
  suggestedTimes: string[]
  attendees: string[]
  confidence: number
}

function extractEmails(text: string): string[] {
  const matches = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g)
  return matches ? Array.from(new Set(matches.map((x) => x.toLowerCase()))) : []
}

function extractSuggestedTimes(text: string): string[] {
  const patterns = [
    /\b(?:tomorrow|today|next week|this week)\b[^.?!\n]*/gi,
    /\b\d{1,2}:\d{2}\s?(?:am|pm)?\b[^.?!\n]*/gi,
    /\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b[^.?!\n]*/gi,
  ]

  const found = patterns.flatMap((pattern) => text.match(pattern) ?? [])
  return Array.from(new Set(found.map((x) => x.trim()))).slice(0, 5)
}

export function parseMeetingIntent(input: {
  subject?: string | null
  body: string
  from?: string | null
}): MeetingIntent {
  const subject = input.subject?.trim() || null
  const body = input.body || ""
  const fullText = `${subject ?? ""}\n${body}`.toLowerCase()

  const meetingKeywords = [
    "meeting",
    "reschedule",
    "schedule",
    "call",
    "sync",
    "calendar",
    "available",
    "availability",
    "invite",
  ]

  const rescheduleKeywords = ["reschedule", "move", "postpone", "push", "shift"]

  const isMeetingRelated = meetingKeywords.some((k) => fullText.includes(k))
  const isRescheduleRequest = rescheduleKeywords.some((k) => fullText.includes(k))

  const attendees = extractEmails(`${input.from ?? ""} ${body}`)
  const suggestedTimes = extractSuggestedTimes(body)

  const confidence =
    (isMeetingRelated ? 0.5 : 0) +
    (isRescheduleRequest ? 0.2 : 0) +
    (attendees.length > 0 ? 0.15 : 0) +
    (suggestedTimes.length > 0 ? 0.15 : 0)

  return {
    isMeetingRelated,
    isRescheduleRequest,
    subject,
    suggestedTimes,
    attendees: Array.from(new Set(attendees)),
    confidence: Math.min(1, confidence),
  }
}

export interface Thread {
  id: string
  subject: string
  from: string
  date: string
  snippet: string
}

export interface Message {
  snippet: string
  from?: string | null
  date?: string | null
  subject?: string | null
}

export interface Intent {
  isMeetingRelated: boolean
  isRescheduleRequest: boolean
  confidence: number
  attendees: string[]
  suggestedTimes: string[]
  subject?: string | null
}

export interface Slot {
  start: string
  end: string
}

export interface CalendarEvent {
  id: string
  summary: string
  start: { dateTime?: string; date?: string }
  end: { dateTime?: string; date?: string }
  attendees?: { email: string }[]
  status?: string
}

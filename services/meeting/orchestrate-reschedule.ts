import { detectMeetingIntentFromThread } from "./detect-meeting"
import { recommendAlternativeSlot } from "./recommend-slot"
import { createNegotiationDraft } from "./create-draft"
import { createGoogleCalendarEvent, updateGoogleCalendarEvent } from "@/services/calendar/google-calendar"
import { getValidAccessToken } from "@/lib/auth/google"

export type OrchestrateInput = {
  userId: string
  threadId: string
  eventId?: string
  timeMin?: string
  timeMax?: string
  slotMinutes?: number
  calendarId?: string
}

export async function orchestrateReschedule(input: OrchestrateInput) {
  const { userId, threadId, eventId, slotMinutes = 30, calendarId = "primary" } = input

  const { intent, threadSubject, lastMessageFrom, messageId } = await detectMeetingIntentFromThread(userId, threadId)

  if (!intent.isMeetingRelated) {
    return {
      status: "skipped",
      reason: "NOT_MEETING_RELATED",
      detection: intent,
      recommendedSlot: null,
      draft: null,
      calendarEvent: null,
    }
  }

  const timeMin = input.timeMin || new Date().toISOString()
  const timeMax = input.timeMax || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const slot = await recommendAlternativeSlot({
    userId,
    timeMin,
    timeMax,
    slotMinutes,
  })

  
  let targetEventId = eventId
  if (!targetEventId) {
    try {
      const searchSubject = intent.subject || threadSubject || ""
      const cleanSubject = searchSubject.replace(/^Re:\s*/i, "").trim()
      
      if (cleanSubject) {
        const token = await getValidAccessToken(userId)
        const now = new Date()
        const futureLimit = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        
        const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`)
        url.searchParams.set("q", cleanSubject)
        url.searchParams.set("timeMin", now.toISOString())
        url.searchParams.set("timeMax", futureLimit.toISOString())
        url.searchParams.set("singleEvents", "true")

        const res = await fetch(url.toString(), {
          headers: { Authorization: `Bearer ${token}` }
        })
        
        if (res.ok) {
          const searchResult = await res.json()
          if (searchResult.items && searchResult.items.length > 0) {
            const matchedEvent = searchResult.items.find(
              (evt: any) => evt.summary?.toLowerCase() === cleanSubject.toLowerCase()
            ) || searchResult.items[0]
            
            if (matchedEvent && matchedEvent.id) {
              targetEventId = matchedEvent.id
              console.log(`[orchestrateReschedule] Automatically matched subject "${cleanSubject}" to event ID: ${targetEventId}`)
            }
          }
        }
      }
    } catch (searchErr) {
      console.warn("[orchestrateReschedule] Failed to automatically match calendar event by subject:", searchErr)
    }
  }

  if (!slot) {
    const draft = await createNegotiationDraft({
      userId,
      to: lastMessageFrom,
      subject: threadSubject,
      slot: null,
      threadId,
      messageId,
    })

    return {
      status: "partial_success",
      reason: "NO_FREE_SLOT_FOUND",
      detection: intent,
      recommendedSlot: null,
      draft: {
        id: draft.id,
        message: draft.message,
      },
      calendarEvent: null,
    }
  }

  const draft = await createNegotiationDraft({
    userId,
    to: lastMessageFrom,
    subject: threadSubject,
    slot,
    threadId,
    messageId,
  })

  let calendarEventResult = null
  if (targetEventId) {
    const updatedEvent = await updateGoogleCalendarEvent(
      userId,
      targetEventId,
      {
        summary: intent.subject || threadSubject || "Rescheduled Meeting",
        start: { dateTime: slot.start },
        end: { dateTime: slot.end },
        attendees: intent.attendees.map((email) => ({ email })),
      },
      calendarId
    )
    calendarEventResult = {
      action: "update",
      id: updatedEvent.id,
      status: updatedEvent.status,
    }
  } else {
    const createdEvent = await createGoogleCalendarEvent(
      userId,
      {
        summary: intent.subject || threadSubject || "Meeting",
        start: { dateTime: slot.start },
        end: { dateTime: slot.end },
        attendees: intent.attendees.map((email) => ({ email })),
      },
      calendarId
    )
    calendarEventResult = {
      action: "create",
      id: createdEvent.id,
      status: createdEvent.status,
    }
  }

  return {
    status: "success",
    detection: intent,
    recommendedSlot: slot,
    draft: {
      id: draft.id,
      message: draft.message,
    },
    calendarEvent: calendarEventResult,
  }
}

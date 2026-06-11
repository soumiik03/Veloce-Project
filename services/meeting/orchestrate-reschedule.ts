import { detectMeetingIntentFromThread } from "./detect-meeting"
import { recommendAlternativeSlot } from "./recommend-slot"
import { createNegotiationDraft } from "./create-draft"
import { createGoogleCalendarEvent, updateGoogleCalendarEvent } from "@/services/calendar/google-calendar"

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

  const { intent, threadSubject, lastMessageFrom } = await detectMeetingIntentFromThread(userId, threadId)

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

  if (!slot) {
    const draft = await createNegotiationDraft({
      userId,
      to: lastMessageFrom,
      subject: threadSubject,
      slot: null,
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
  })

  let calendarEventResult = null
  if (eventId) {
    const updatedEvent = await updateGoogleCalendarEvent(
      userId,
      eventId,
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

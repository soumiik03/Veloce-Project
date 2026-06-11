import { corsair } from "@/lib/corsair"

export type BusyWindow = {
  start: string
  end: string
}

export type TimeSlot = {
  start: string
  end: string
}

export async function getAvailability(userId: string, timeMin: string, timeMax: string) {
  if (!userId || !timeMin || !timeMax) {
    throw new Error("userId, timeMin, and timeMax are required")
  }

  const tenant = corsair.withTenant(userId)

  return tenant.googlecalendar.api.calendar.getAvailability({
    timeMin,
    timeMax,
  })
}

export function generateCandidateSlots(
  busyWindows: BusyWindow[],
  timeMin: string,
  timeMax: string,
  slotMinutes = 30
): TimeSlot[] {
  const start = new Date(timeMin).getTime()
  const end = new Date(timeMax).getTime()
  const slotMs = slotMinutes * 60 * 1000

  const busy = busyWindows
    .map((w) => ({
      start: new Date(w.start).getTime(),
      end: new Date(w.end).getTime(),
    }))
    .sort((a, b) => a.start - b.start)

  const slots: TimeSlot[] = []
  let cursor = start

  while (cursor + slotMs <= end) {
    const slotEnd = cursor + slotMs
    const overlaps = busy.some((w) => cursor < w.end && slotEnd > w.start)

    if (!overlaps) {
      slots.push({
        start: new Date(cursor).toISOString(),
        end: new Date(slotEnd).toISOString(),
      })
    }

    cursor += slotMs
  }

  return slots
}

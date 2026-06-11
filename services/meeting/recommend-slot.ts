import { getAvailability, generateCandidateSlots } from "@/services/calendar/event-service"

export async function recommendAlternativeSlot(input: {
  userId: string
  timeMin: string
  timeMax: string
  slotMinutes?: number
}) {
  const { userId, timeMin, timeMax, slotMinutes = 30 } = input

  const availability = await getAvailability(userId, timeMin, timeMax)
  const busyWindows: any[] = []

  if (availability.calendars) {
    for (const calId in availability.calendars) {
      const cal = availability.calendars[calId]
      if (cal.busy) {
        busyWindows.push(...cal.busy.map((w: any) => ({
          start: w.start || "",
          end: w.end || "",
        })))
      }
    }
  }

  const freeSlots = generateCandidateSlots(busyWindows, timeMin, timeMax, slotMinutes)
  return freeSlots.length > 0 ? freeSlots[0] : null
}

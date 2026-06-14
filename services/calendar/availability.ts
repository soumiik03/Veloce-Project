import { getValidAccessToken } from "@/lib/auth/google"

export type TimeSlot = {
  start: string
  end: string
}

export type FreeBusyWindow = {
  start: string
  end: string
}

export async function getFreeBusySlots(userId: string, timeMin: string, timeMax: string) {
  if (!userId || !timeMin || !timeMax) {
    throw new Error("userId, timeMin, and timeMax are required")
  }

  const token = await getValidAccessToken(userId, 'calendar')

  const res = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      timeMin,
      timeMax,
      items: [{ id: "primary" }]
    })
  })

  if (!res.ok) {
    throw new Error("Failed to get free/busy slots")
  }

  return res.json()
}

export function generateCandidateSlots(
  busyWindows: FreeBusyWindow[],
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
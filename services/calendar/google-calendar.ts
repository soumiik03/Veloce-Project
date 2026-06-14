import { getValidAccessToken } from "@/lib/auth/google"

export async function createGoogleCalendarEvent(userId: string, event: any, calendarId = "primary") {
  const token = await getValidAccessToken(userId)
  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(event)
  })
  if (!res.ok) throw new Error("Failed to create calendar event")
  return res.json()
}

export async function updateGoogleCalendarEvent(userId: string, eventId: string, event: any, calendarId = "primary") {
  const token = await getValidAccessToken(userId)
  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(event)
  })
  if (!res.ok) throw new Error("Failed to update calendar event")
  return res.json()
}

export async function deleteGoogleCalendarEvent(userId: string, eventId: string, calendarId = "primary") {
  const token = await getValidAccessToken(userId)
  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  })
  if (!res.ok) throw new Error("Failed to delete calendar event")
  return true
}

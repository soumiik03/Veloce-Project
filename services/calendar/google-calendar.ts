import { corsair } from "@/lib/corsair"

export async function createGoogleCalendarEvent(userId: string, event: any, calendarId = "primary") {
  const tenant = corsair.withTenant(userId)
  return tenant.googlecalendar.api.events.create({
    calendarId,
    event,
  })
}

export async function updateGoogleCalendarEvent(userId: string, eventId: string, event: any, calendarId = "primary") {
  const tenant = corsair.withTenant(userId)
  return tenant.googlecalendar.api.events.update({
    calendarId,
    id: eventId,
    event,
  })
}

export async function deleteGoogleCalendarEvent(userId: string, eventId: string, calendarId = "primary") {
  const tenant = corsair.withTenant(userId)
  return tenant.googlecalendar.api.events.delete({
    calendarId,
    id: eventId,
  })
}

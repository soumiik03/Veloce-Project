"use client"

import { useEffect, useState } from "react"
import { ScheduleTimeline } from "@/components/features/calendar/schedule-timeline"
import { ConflictQueue } from "@/components/features/calendar/conflict-queue"
import { Button } from "@/components/ui/button"
import { CalendarEvent } from "@/types"

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [error, setError] = useState("")

  const mockEvents: CalendarEvent[] = [
    {
      id: "mock-event-1",
      summary: "Project Architecture Sync",
      start: { dateTime: new Date(Date.now() + 24 * 3600 * 1000).toISOString() },
      end: { dateTime: new Date(Date.now() + 24 * 3600 * 1000 + 1800 * 1000).toISOString() },
      attendees: [{ email: "john.davis@company.com" }, { email: "soumik@example.com" }],
      status: "confirmed"
    },
    {
      id: "mock-event-2",
      summary: "Sync on Marketing Deck",
      start: { dateTime: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString() },
      end: { dateTime: new Date(Date.now() + 3 * 24 * 3600 * 1000 + 3600 * 1000).toISOString() },
      attendees: [{ email: "sarah.smith@marketing.com" }, { email: "soumik@example.com" }],
      status: "confirmed"
    }
  ]

  const fetchEvents = async () => {
    setLoading(true)
    try {
      const cookieVal = document.cookie
        .split("; ")
        .find(row => row.startsWith("accessToken="))
        ?.split("=")[1]

      const res = await fetch("/api/calendar/events", {
        headers: {
          "Authorization": `Bearer ${cookieVal || ""}`
        }
      })
      const data = await res.json()
      if (res.ok && data.items && data.items.length > 0) {
        setEvents(data.items)
        setIsDemoMode(false)
      } else {
        setEvents(mockEvents)
        setIsDemoMode(true)
      }
    } catch (err) {
      setEvents(mockEvents)
      setIsDemoMode(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEvents()
  }, [])

  const handleDeleteEvent = async (eventId: string) => {
    setError("")
    if (eventId.startsWith("mock-")) {
      setEvents(prev => prev.filter(e => e.id !== eventId))
      return
    }

    try {
      const cookieVal = document.cookie
        .split("; ")
        .find(row => row.startsWith("accessToken="))
        ?.split("=")[1]

      const res = await fetch(`/api/calendar/events/${eventId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${cookieVal || ""}`
        }
      })
      if (res.ok) {
        setEvents(prev => prev.filter(e => e.id !== eventId))
      } else {
        const data = await res.json()
        setError(data.error || "Failed to delete event")
      }
    } catch (err) {
      setError("Network error. Please try again.")
    }
  }

  const handleResolveConflict = (eventId: string) => {
    window.location.href = `/mail?eventId=${eventId}`
  }

  return (
    <div className="flex-1 flex flex-col gap-6 relative">
      <header className="flex justify-between items-center pb-4 border-b border-zinc-900">
        <div>
          <h1 className="text-2xl font-light text-zinc-100 tracking-tight">Calendar Workspace</h1>
          <p className="text-xs text-zinc-500 font-light mt-1">
            {isDemoMode ? "Operational Sandbox (Demo mode)" : "Connected to Google Calendar"}
          </p>
        </div>
        <Button variant="secondary" onClick={fetchEvents} className="cursor-pointer">
          Sync Calendar
        </Button>
      </header>

      {error && <div className="p-3 bg-red-950/20 border border-red-500/20 text-red-400 text-xs rounded">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start flex-1">
        <div className="lg:col-span-9 bg-[#1a1f16]/90 border border-zinc-850/80 rounded-xl p-5 shadow-md backdrop-blur-md">
          <span className="text-[10px] font-mono text-zinc-500 tracking-wider uppercase block mb-4">7-Day schedule Grid</span>
          {loading ? (
            <div className="h-[500px] flex items-center justify-center text-xs text-zinc-500 font-mono animate-pulse">
              SYNCING SCHEDULE TIMELINE...
            </div>
          ) : (
            <ScheduleTimeline events={events} onDelete={handleDeleteEvent} />
          )}
        </div>

        <div className="lg:col-span-3 h-[565px]">
          <ConflictQueue events={events} onReschedule={handleResolveConflict} />
        </div>
      </div>
    </div>
  )
}

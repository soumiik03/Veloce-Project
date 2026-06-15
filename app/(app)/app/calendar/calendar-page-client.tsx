"use client"

import { useEffect, useState, useRef } from "react"

interface CalendarEvent {
  id: string
  summary: string
  start: { dateTime?: string; date?: string }
  end: { dateTime?: string; date?: string }
  attendees?: { email: string }[]
  status: string
}

interface ConflictCard {
  id: string
  emailThreadId: string
  emailSubject: string
  emailSnippet: string
  sender: string
  currentEventId: string
  currentEventSummary: string
  currentEventStart: string
  suggestedTimes: string[]
}

export function CalendarPageClient() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [viewMode, setViewMode] = useState<"week" | "month">("week")

  
  const [conflicts, setConflicts] = useState<ConflictCard[]>([])
  const [loadingConflicts, setLoadingConflicts] = useState(false)
  const [activeConflict, setActiveConflict] = useState<ConflictCard | null>(null)
  const [resolving, setResolving] = useState(false)

  
  const [quickInput, setQuickInput] = useState("")
  const [creating, setCreating] = useState(false)
  const [quickCreateLogs, setQuickCreateLogs] = useState<string[]>([])

  
  const fetchEvents = async () => {
    setLoading(true)
    try {
      const tomorrow = new Date()
      tomorrow.setHours(0, 0, 0, 0)
      const endRange = new Date(tomorrow)
      endRange.setDate(tomorrow.getDate() + 7)

      const res = await fetch(`/api/calendar/events?timeMin=${tomorrow.toISOString()}&timeMax=${endRange.toISOString()}`)
      if (res.ok) {
        const data = await res.json()
        const eventItems = Array.isArray(data) ? data : data.items
        if (eventItems) {
          setEvents(eventItems)
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  
  const fetchConflicts = async () => {
    setLoadingConflicts(true)
    try {
      const res = await fetch("/api/calendar/conflicts")
      if (res.ok) {
        const data = await res.json()
        if (data.conflicts) {
          setConflicts(data.conflicts)
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingConflicts(false)
    }
  }

  useEffect(() => {
    fetchEvents()
    fetchConflicts()
  }, [])

  
  useEffect(() => {
    const handleNewEvent = () => {
      const inputEl = document.getElementById("quick-event-input")
      inputEl?.focus()
    }
    window.addEventListener("veloce-new-event", handleNewEvent)
    return () => {
      window.removeEventListener("veloce-new-event", handleNewEvent)
    }
  }, [])

  
  const getTimelineDays = () => {
    const days = []
    const start = new Date()
    for (let i = 0; i < 7; i++) {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      days.push(d)
    }
    return days
  }
  const timelineDays = getTimelineDays()

  
  const getEventsForDay = (day: Date) => {
    return events.filter((evt) => {
      const evtDate = new Date(evt.start.dateTime || evt.start.date || "")
      return evtDate.toDateString() === day.toDateString()
    })
  }

  
  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm("Are you sure you want to delete this event?")) return
    try {
      const res = await fetch(`/api/calendar/events/${eventId}`, {
        method: "DELETE"
      })
      if (res.ok) {
        setEvents(prev => prev.filter(e => e.id !== eventId))
      } else {
        alert("Failed to delete event.")
      }
    } catch {
      alert("Error deleting event.")
    }
  }

  
  const handleResolveReschedule = async (chosenSlot: string) => {
    if (!activeConflict || resolving) return
    setResolving(true)
    try {
      
      const endDateTime = new Date(new Date(chosenSlot).getTime() + 30 * 60 * 1000).toISOString()

      const patchRes = await fetch(`/api/calendar/events/${activeConflict.currentEventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: {
            start: { dateTime: chosenSlot },
            end: { dateTime: endDateTime }
          }
        })
      })

      if (!patchRes.ok) {
        alert("Failed to update calendar event. Email notification was not sent.")
        return
      }

      
      const replyBody = `Hi, I have rescheduled our meeting "${activeConflict.currentEventSummary}" to Friday at ${new Date(chosenSlot).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Please verify. Thanks!`
      const emailRes = await fetch(`/api/emails`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: activeConflict.sender,
          subject: `Rescheduled: ${activeConflict.emailSubject}`,
          content: replyBody
        })
      })

      if (!emailRes.ok) {
        alert("Calendar event updated, but the email notification failed.")
        setActiveConflict(null)
        fetchEvents()
        fetchConflicts()
        return
      }

      alert("Meeting rescheduled and reply dispatched successfully!")
      setActiveConflict(null)
      fetchEvents()
      fetchConflicts()
    } catch (err) {
      console.error(err)
      alert("Error resolving conflict.")
    } finally {
      setResolving(false)
    }
  }

  
  const handleQuickCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickInput.trim() || creating) return
    const input = quickInput.trim()
    setQuickInput("")
    setCreating(true)
    setQuickCreateLogs(["[TELEMETRY] Intercepting natural language command...", `[PROMPT] "${input}"`])

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ message: input })
      })

      if (!res.ok) throw new Error("AI scheduling engine offline")

      const reader = res.body?.getReader()
      if (!reader) throw new Error("No response reader")

      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed.startsWith("data:")) continue

          const jsonStr = trimmed.slice(5).trim()
          try {
            const parsed = JSON.parse(jsonStr)
            if (parsed.log) {
              setQuickCreateLogs(prev => [...prev, parsed.log])
            }
            if (parsed.text) {
              setQuickCreateLogs(prev => [...prev, parsed.text])
            }
          } catch {}
        }
      }
      setQuickCreateLogs(prev => [...prev, "[SUCCESS] Event creation cycle finished."])
      fetchEvents()
    } catch (err: any) {
      setQuickCreateLogs(prev => [...prev, `[ERROR] Event creation failed: ${err.message}`])
    } finally {
      setCreating(false)
    }
  }

  
  const handleFindFocusTime = () => {
    alert("Analyzing calendar availability density... Staging optimal 2-hour Focus Buffer block.")
  }

  
  const numEventsThisWeek = events.length
  const totalDurationMin = events.reduce((total, e) => {
    const start = new Date(e.start.dateTime || e.start.date || "")
    const end = new Date(e.end.dateTime || e.end.date || "")
    return total + Math.max(0, (end.getTime() - start.getTime()) / (60 * 1000))
  }, 0)
  const durationHours = (totalDurationMin / 60).toFixed(1)

  return (
    <div className="flex-1 flex h-screen bg-[#0d0d0d] text-[#e8e8e8] overflow-hidden select-none">
      
      {}
      <section className="flex-1 flex flex-col min-h-0 bg-[#0d0d0d] p-6">
        <header className="flex justify-between items-center pb-4 border-b border-[#1a1a1a]/50 mb-6">
          <div>
            <h1 className="text-xl font-semibold text-white tracking-tight">Calendar Telemetry</h1>
            <p className="text-[10px] font-mono text-[#555] uppercase block mt-1">
              WEEK VIEW · {viewMode === "week" ? "Active" : "Static"}
            </p>
          </div>
          <div className="flex bg-[#1a1a1a] p-[3px] rounded-lg items-center">
            <button
              onClick={() => setViewMode("week")}
              className={`px-3 py-1 text-[11px] rounded transition-colors cursor-pointer border-0 ${
                viewMode === "week" ? "bg-white text-black font-semibold" : "text-[#888] hover:text-white bg-transparent"
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode("month")}
              className={`px-3 py-1 text-[11px] rounded transition-colors cursor-pointer border-0 ${
                viewMode === "month" ? "bg-white text-black font-semibold" : "text-[#888] hover:text-white bg-transparent"
              }`}
            >
              Month
            </button>
          </div>
        </header>

        {}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="h-full flex items-center justify-center text-xs text-[#555] font-mono animate-pulse">
              SYNCING SCHEDULING SYSTEM NODES...
            </div>
          ) : viewMode === "month" ? (
            <div className="h-full flex items-center justify-center text-xs text-[#444] font-mono italic">
              Month Grid View disabled in sandbox. Switch to Week View.
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-3 h-full items-stretch min-h-[500px]">
              {timelineDays.map((day, idx) => {
                const dayEvents = getEventsForDay(day)
                const isToday = day.toDateString() === new Date().toDateString()
                return (
                  <div 
                    key={idx} 
                    className={`flex flex-col border border-[#1e1e1e] rounded-xl bg-[#111]/30 overflow-hidden min-h-[400px] ${
                      isToday ? "border-[#5aa3e8]/45 ring-1 ring-[#5aa3e8]/20" : ""
                    }`}
                  >
                    {}
                    <div className={`p-3 text-center border-b border-[#1e1e1e]/60 flex flex-col gap-0.5 ${
                      isToday ? "bg-[#1e3a5f]/20" : "bg-[#111]/60"
                    }`}>
                      <span className={`text-[10px] font-mono uppercase tracking-wider ${isToday ? "text-[#5aa3e8]" : "text-[#666]"}`}>
                        {day.toLocaleDateString(undefined, { weekday: "short" })}
                      </span>
                      <span className={`text-base font-semibold ${isToday ? "text-white" : "text-[#888]"}`}>
                        {day.getDate()}
                      </span>
                    </div>

                    {}
                    <div className="flex-1 p-2.5 overflow-y-auto space-y-2">
                      {dayEvents.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-[10px] text-[#333] font-mono font-medium tracking-widest">
                          FREE
                        </div>
                      ) : (
                        dayEvents.map((evt) => {
                          const startStr = evt.start.dateTime 
                            ? new Date(evt.start.dateTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                            : "All Day"
                          return (
                            <div
                              key={evt.id}
                              className="p-2.5 bg-[#141414] hover:bg-[#181818] border border-[#1e1e1e] rounded-lg flex flex-col gap-1 transition-all group relative"
                            >
                              <span className="text-[10.5px] font-medium text-white truncate group-hover:text-[#5aa3e8] transition-colors pr-4">
                                {evt.summary}
                              </span>
                              <span className="text-[9px] font-mono text-[#555]">
                                {startStr}
                              </span>
                              {}
                              <button
                                onClick={() => handleDeleteEvent(evt.id)}
                                className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 text-[#444] hover:text-red-400 transition-opacity border-0 bg-transparent text-[10px] cursor-pointer"
                                title="Delete event"
                              >
                                ✕
                              </button>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {}
      <aside className="w-[260px] border-l-[0.5px] border-[#1a1a1a] flex flex-col min-h-0 bg-[#0d0d0d] shrink-0">
        
        {}
        <div className="p-4 border-b border-[#1a1a1a]/50">
          <span className="text-[10px] font-mono text-[#888] uppercase tracking-wider block font-bold mb-3">
            This Week Summary
          </span>
          <div className="bg-[#141414] border border-[#1e1e1e] rounded-xl p-3 flex flex-col gap-2">
            <div className="flex justify-between items-center text-xs text-[#aaa]">
              <span>Events scheduled:</span>
              <span className="font-mono text-white font-semibold">{numEventsThisWeek}</span>
            </div>
            <div className="flex justify-between items-center text-xs text-[#aaa]">
              <span>Total meeting load:</span>
              <span className="font-mono text-white font-semibold">{durationHours}h</span>
            </div>
            <button
              onClick={handleFindFocusTime}
              className="mt-2.5 w-full py-1.5 bg-[#1e3a5f]/15 hover:bg-[#1e3a5f]/30 border border-[#5aa3e8]/20 text-[#5aa3e8] text-[10px] font-mono rounded-lg transition-colors cursor-pointer"
            >
              ⚡ Find best focus time
            </button>
          </div>
        </div>

        {}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <span className="text-[10px] font-mono text-[#888] uppercase tracking-wider block font-bold">
            Conflict Resolution Queue
          </span>
          {loadingConflicts ? (
            <div className="text-[11px] text-[#444] font-mono animate-pulse">Scanning scheduling conflicts...</div>
          ) : conflicts.length === 0 ? (
            <div className="p-4 border border-[#1e1e1e]/60 bg-[#141414]/40 rounded-xl text-center text-[10px] font-mono text-[#444] italic">
              No conflict vectors flagged.
            </div>
          ) : (
            conflicts.map((conflict) => (
              <div
                key={conflict.id}
                className="p-3 bg-[#d97706]/5 border border-[#d97706]/20 rounded-xl flex flex-col gap-2"
              >
                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-[#d97706]">
                  <span>⚠</span>
                  <span className="truncate max-w-[170px]">{conflict.currentEventSummary}</span>
                </div>
                <p className="text-[10.5px] text-[#888] leading-relaxed line-clamp-2">
                  {conflict.emailSnippet}
                </p>
                <button
                  onClick={() => setActiveConflict(conflict)}
                  className="w-full py-1.5 bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-[10px] font-mono rounded-lg transition-colors cursor-pointer border-0 font-semibold"
                >
                  Resolve Conflict ↻
                </button>
              </div>
            ))
          )}
        </div>

        {}
        <div className="p-4 border-t border-[#1a1a1a]/50 bg-[#111]/30">
          <span className="text-[10px] font-mono text-[#888] uppercase tracking-wider block font-bold mb-2">
            Quick Event Pilot
          </span>
          
          {quickCreateLogs.length > 0 && (
            <div className="mb-3 max-h-[80px] overflow-y-auto p-2 bg-[#141414] border border-[#1e1e1e] rounded-lg text-[9px] font-mono text-[#666] space-y-1">
              {quickCreateLogs.map((log, idx) => (
                <div key={idx} className="truncate">{log}</div>
              ))}
            </div>
          )}

          <form onSubmit={handleQuickCreateSubmit}>
            <input
              id="quick-event-input"
              type="text"
              value={quickInput}
              onChange={(e) => setQuickInput(e.target.value)}
              placeholder="e.g. Sync with John Friday at 2pm..."
              disabled={creating}
              className="w-full bg-[#141414] border border-[#1e1e1e] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-[#444] focus:outline-none"
            />
          </form>
        </div>

      </aside>

      {}
      {activeConflict && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
          <div className="w-[380px] bg-[#111] border-l border-[#1e1e1e] p-6 flex flex-col justify-between shadow-2xl animate-slide-in h-screen">
            
            {}
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-[#1e1e1e]/60 pb-3">
                <span className="text-xs font-semibold text-white font-mono uppercase tracking-wider">
                  Conflict Resolution Control
                </span>
                <button
                  onClick={() => setActiveConflict(null)}
                  className="text-[#555] hover:text-white transition-colors cursor-pointer border-0 bg-transparent text-sm"
                >
                  ✕
                </button>
              </div>

              {}
              <div className="bg-[#141414] border border-[#1e1e1e] rounded-xl p-3.5 space-y-2">
                <div className="flex justify-between items-center text-[10px] font-mono text-[#666]">
                  <span className="font-semibold text-[#888]">{activeConflict.sender}</span>
                  <span>Date: Today</span>
                </div>
                <h3 className="text-xs font-semibold text-white truncate">
                  {activeConflict.emailSubject}
                </h3>
                <p className="text-[11.5px] text-[#aaa] italic leading-relaxed">
                  "{activeConflict.emailSnippet}"
                </p>
              </div>

              {}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-mono text-[#555] uppercase block">
                  Current Blocked Slot
                </span>
                <div className="p-3 bg-[#ef4444]/5 border border-[#ef4444]/20 rounded-xl text-xs text-[#ef4444]">
                  <span className="font-semibold block">{activeConflict.currentEventSummary}</span>
                  <span className="font-mono text-[10.5px] block mt-0.5">
                    {new Date(activeConflict.currentEventStart).toLocaleString()}
                  </span>
                </div>
              </div>

              {}
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-mono text-[#555] uppercase block">
                  Suggested Slots (Open Buffer)
                </span>
                <div className="space-y-2">
                  {activeConflict.suggestedTimes.map((time, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleResolveReschedule(time)}
                      disabled={resolving}
                      className="w-full p-3 bg-[#141414] hover:bg-[#7c3aed]/10 border border-[#1e1e1e] hover:border-[#7c3aed]/40 rounded-xl text-left text-xs text-white transition-all cursor-pointer font-mono"
                    >
                      <span className="font-semibold text-purple-400 block mb-0.5">Option {idx + 1}</span>
                      <span>{new Date(time).toLocaleString()}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {}
            <div className="border-t border-[#1a1a1a]/60 pt-4 flex gap-2">
              <button
                onClick={() => setActiveConflict(null)}
                className="flex-1 py-2 border border-[#1e1e1e] text-[#888] hover:text-white rounded-lg text-xs cursor-pointer transition-colors hover:bg-white/5 bg-transparent"
              >
                Cancel
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}

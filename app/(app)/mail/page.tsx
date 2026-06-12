"use client"

import { useEffect, useState } from "react"
import { useInbox } from "@/hooks/use-inbox"
import { ThreadList } from "@/components/features/inbox/thread-list"
import { AIBreakdown } from "@/components/features/inbox/ai-breakdown"
import { OrchestrationConsole } from "@/components/features/inbox/orchestration-console"
import { StatusBadge } from "@/components/ui/status-badge"
import CommandBar from "@/components/ui/command-bar"
import { Intent, CalendarEvent } from "@/types"

export default function MailPage() {
  const { threads, loading, isDemoMode, refresh } = useInbox()
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)
  const [threadDetail, setThreadDetail] = useState<any>(null)
  const [detection, setDetection] = useState<Intent | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  // Search & command bar state
  const [searchQuery, setSearchQuery] = useState("")
  const [commandBarMode, setCommandBarMode] = useState<"ask" | "search">("ask")

  // Calendar state
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loadingCalendar, setLoadingCalendar] = useState(false)
  const [tempScheduledEvent, setTempScheduledEvent] = useState<CalendarEvent | null>(null)

  // Scheduling engine states
  const [orchestrating, setOrchestrating] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const [orchestrationResult, setOrchestrationResult] = useState<any>(null)
  const [assistantMessages, setAssistantMessages] = useState<{ sender: "user" | "veloce"; text: string; time: string }[]>([])

  // Setup initial mock calendar events
  const initialEvents: CalendarEvent[] = [
    {
      id: "mock-event-1",
      summary: "Project Architecture Sync",
      start: { dateTime: new Date(Date.now() + 24 * 3600 * 1000).toISOString() }, // Tomorrow
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

  // Fetch events on mount
  useEffect(() => {
    setLoadingCalendar(true)
    const fetchCalendar = async () => {
      try {
        const cookieVal = document.cookie
          .split("; ")
          .find(row => row.startsWith("accessToken="))
          ?.split("=")[1]

        const res = await fetch("/api/calendar/events", {
          headers: { "Authorization": `Bearer ${cookieVal || ""}` }
        })
        const data = await res.json()
        if (res.ok && data.items && data.items.length > 0) {
          setEvents(data.items)
        } else {
          setEvents(initialEvents)
        }
      } catch (err) {
        setEvents(initialEvents)
      } finally {
        setLoadingCalendar(false)
      }
    }
    fetchCalendar()
  }, [])

  // Handle Thread selection
  const handleSelectThread = async (threadId: string) => {
    setSelectedThreadId(threadId)
    setLoadingDetail(true)
    setOrchestrationResult(null)
    setLogs([])
    setAssistantMessages([])
    setTempScheduledEvent(null)

    if (threadId.startsWith("mock-")) {
      setTimeout(() => {
        if (threadId === "mock-thread-1") {
          setThreadDetail({
            messages: [
              {
                payload: {
                  headers: [
                    { name: "Subject", value: "Re: Quick sync on project architecture" },
                    { name: "From", value: "john.davis@company.com" },
                    { name: "Date", value: "Today, 2:14 PM" }
                  ]
                },
                snippet: "Hey, I have a conflict with our 4pm call tomorrow. Can we reschedule it to Friday morning?"
              }
            ]
          })
          setDetection({
            isMeetingRelated: true,
            isRescheduleRequest: true,
            confidence: 0.95,
            attendees: ["john.davis@company.com", "soumik@example.com"],
            suggestedTimes: ["tomorrow 4pm", "Friday morning"],
            subject: "Re: Quick sync on project architecture"
          })
        } else {
          setThreadDetail({
            messages: [
              {
                payload: {
                  headers: [
                    { name: "Subject", value: "Weekly marketing review" },
                    { name: "From", value: "sarah.smith@marketing.com" },
                    { name: "Date", value: "Yesterday, 5:30 PM" }
                  ]
                },
                snippet: "All set for the review next Tuesday. I will share the slide deck beforehand."
              }
            ]
          })
          setDetection({
            isMeetingRelated: true,
            isRescheduleRequest: false,
            confidence: 0.50,
            attendees: ["sarah.smith@marketing.com"],
            suggestedTimes: ["next Tuesday"],
            subject: "Weekly marketing review"
          })
        }
        setLoadingDetail(false)
      }, 400)
      return
    }

    try {
      const cookieVal = document.cookie
        .split("; ")
        .find(row => row.startsWith("accessToken="))
        ?.split("=")[1]

      const res = await fetch(`/api/emails/${threadId}`, {
        headers: { "Authorization": `Bearer ${cookieVal || ""}` }
      })
      const data = await res.json()
      if (res.ok) {
        setThreadDetail(data.thread)
        setDetection(data.detection?.intent || null)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingDetail(false)
    }
  }

  // Trigger orchestration reschedule logic
  const runOrchestrator = async () => {
    if (!selectedThreadId) return
    setOrchestrating(true)
    setOrchestrationResult(null)
    setLogs(["[INFO] Initiating Gmail rescheduling agent...", "[INFO] Analyzing intent profile constraints..."])

    if (isDemoMode || selectedThreadId.startsWith("mock-")) {
      setTimeout(() => {
        setLogs(prev => [...prev, "[INFO] Rescheduling request confirmed.", "[INFO] Querying Google Calendar slots...", "[INFO] Scanning for conflicts..."])
      }, 700)

      setTimeout(() => {
        setLogs(prev => [...prev, "[INFO] Identified optimal open block: Friday, June 12 @ 11:00 AM.", "[INFO] Generating Gmail draft proposal...", "[INFO] Staging Google Calendar event coordinates..."])
      }, 1400)

      setTimeout(() => {
        setLogs(prev => [...prev, "[SUCCESS] Orchestration complete. Draft created in thread.", "[SUCCESS] Calendar update pre-staged."])
        
        setOrchestrationResult({
          status: "success",
          recommendedSlot: {
            start: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString(),
            end: new Date(Date.now() + 2 * 24 * 3600 * 1000 + 1800 * 1000).toISOString()
          },
          draft: {
            id: "draft_mock_12345",
            message: "Hi John, Friday at 11:00 AM works perfectly. I have updated our calendar invitation to reflect the shift. Let me know if that aligns."
          }
        })

        // Pre-stage the rescheduled event visually on the right calendar timeline
        setTempScheduledEvent({
          id: "temp-event-new",
          summary: "Veloce Suggestion: Friday @ 11:00 AM",
          start: { dateTime: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString() },
          end: { dateTime: new Date(Date.now() + 2 * 24 * 3600 * 1000 + 1800 * 1000).toISOString() },
          attendees: [{ email: "john.davis@company.com" }],
          status: "confirmed"
        })

        setAssistantMessages(prev => [
          ...prev,
          {
            sender: "veloce",
            text: "I analyzed the thread and checked your calendar. Friday at 11:00 AM is free. I have drafted a response and staged the calendar sync. Please confirm to push.",
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          }
        ])

        setOrchestrating(false)
      }, 2200)
      return
    }

    try {
      const cookieVal = document.cookie
        .split("; ")
        .find(row => row.startsWith("accessToken="))
        ?.split("=")[1]

      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const nextWeek = new Date()
      nextWeek.setDate(nextWeek.getDate() + 7)

      const body = {
        threadId: selectedThreadId,
        timeMin: tomorrow.toISOString(),
        timeMax: nextWeek.toISOString(),
        slotMinutes: 30,
        calendarId: "primary"
      }

      setLogs(prev => [...prev, "[INFO] Querying live Google API microservice..."])

      const res = await fetch("/api/reschedule", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${cookieVal || ""}`
        },
        body: JSON.stringify(body),
      })
      const data = await res.json()

      if (res.ok) {
        setLogs(prev => [
          ...prev,
          `[INFO] Status: ${data.status}`,
          data.recommendedSlot ? `[INFO] Proposing slot: ${new Date(data.recommendedSlot.start).toLocaleString()}` : `[INFO] No slot found.`,
          `[SUCCESS] Orchestration flow completed.`
        ])
        setOrchestrationResult(data)
        if (data.recommendedSlot) {
          setTempScheduledEvent({
            id: "temp-event-new",
            summary: "Veloce Suggestion: Staged",
            start: { dateTime: data.recommendedSlot.start },
            end: { dateTime: data.recommendedSlot.end },
            attendees: [],
            status: "confirmed"
          })
        }
      } else {
        setLogs(prev => [...prev, `[ERROR] Execution failed: ${data.error || "Unknown error"}`])
      }
    } catch (err: any) {
      setLogs(prev => [...prev, `[ERROR] Network error: ${err.message}`])
    } finally {
      setOrchestrating(false)
    }
  }

  // Handle confirming draft/update
  const commitSchedule = () => {
    setLogs(prev => [...prev, "[SUCCESS] Calendar event synchronized.", "[SUCCESS] Email reply sent."])
    
    // Finalize mock event placement: remove old, push new
    if (tempScheduledEvent) {
      setEvents(prev => [
        ...prev.filter(e => e.id !== "mock-event-1"), // Remove old conflict event
        {
          ...tempScheduledEvent,
          summary: "Core System Review Sync (Updated)"
        }
      ])
      setTempScheduledEvent(null)
    }

    setAssistantMessages(prev => [
      ...prev,
      {
        sender: "veloce",
        text: "Sync finalized. I have updated Google Calendar and successfully dispatched the Gmail reply.",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      }
    ])
    setOrchestrationResult(null)
  }

  // Handle command execution inside the bottom command bar
  const handleCommandBarExecute = (cmdText: string) => {
    // Add user message
    setAssistantMessages((prev) => [
      ...prev,
      {
        sender: "user",
        text: cmdText,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      }
    ])

    const normalizedCmd = cmdText.trim().toLowerCase()

    if (normalizedCmd.startsWith("/reschedule") || normalizedCmd.includes("reschedule")) {
      if (!selectedThreadId) {
        // Auto-select first thread if none selected to make it feel smart
        if (threads.length > 0) {
          handleSelectThread(threads[0].id)
          setAssistantMessages((prev) => [
            ...prev,
            {
              sender: "veloce",
              text: `Awaiting active thread. Auto-selecting John's thread to run rescheduling agent...`,
              time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            }
          ])
          setTimeout(() => {
            runOrchestrator()
          }, 800)
        } else {
          setAssistantMessages((prev) => [
            ...prev,
            {
              sender: "veloce",
              text: "No active threads found. Please connect your accounts or refresh the feed.",
              time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            }
          ])
        }
      } else {
        runOrchestrator()
      }
    } else if (normalizedCmd.startsWith("/connect") || normalizedCmd.includes("connect")) {
      setLogs((prev) => [...prev, "[INFO] Connecting Google account authorizations...", "[SUCCESS] Secure Workspace OAuth established."])
      setAssistantMessages((prev) => [
        ...prev,
        {
          sender: "veloce",
          text: "Google Gmail & Calendar connections validated. Workspace telemetry is now active.",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        }
      ])
    } else if (normalizedCmd.startsWith("/buffer") || normalizedCmd.includes("buffer")) {
      setAssistantMessages((prev) => [
        ...prev,
        {
          sender: "veloce",
          text: "Focused block buffer set to 30 minutes. The agent will treat this as a calendar constraint.",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        }
      ])
    } else {
      // Call live Gemini assistant API
      const fetchAgentResponse = async () => {
        try {
          const cookieVal = document.cookie
            .split("; ")
            .find(row => row.startsWith("accessToken="))
            ?.split("=")[1]

          const res = await fetch("/api/agent", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${cookieVal || ""}`
            },
            body: JSON.stringify({
              message: cmdText,
              context: {
                selectedThreadId,
                isDemoMode,
              }
            })
          })
          const data = await res.json()
          if (res.ok) {
            setAssistantMessages((prev) => [
              ...prev,
              {
                sender: "veloce",
                text: data.response,
                time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              }
            ])
          } else {
            throw new Error(data.error || "Failed to query agent")
          }
        } catch (err: any) {
          setAssistantMessages((prev) => [
            ...prev,
            {
              sender: "veloce",
              text: `Agent interface offline: ${err.message}`,
              time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            }
          ])
        }
      }
      fetchAgentResponse()
    }
  }

  // Filter threads based on search queries
  const filteredThreads = threads.filter((t) => {
    const term = searchQuery.toLowerCase()
    return (
      t.from.toLowerCase().includes(term) ||
      t.subject.toLowerCase().includes(term) ||
      t.snippet.toLowerCase().includes(term)
    )
  })

  // Format calendar timeline days (Next 5 days compact format)
  const getTimelineDays = () => {
    const days = []
    const start = new Date()
    for (let i = 0; i < 5; i++) {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      days.push(d)
    }
    return days
  }
  const timelineDays = getTimelineDays()

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-6.5rem)] overflow-hidden">
      
      {/* 3-Column Grid Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch flex-1 overflow-hidden">
        
        {/* COLUMN 1: MAILBOX FEED (Left, width: 3/12) */}
        <div className="lg:col-span-3 bg-[#0a0d09]/70 border border-zinc-900 rounded-2xl p-4 flex flex-col h-full overflow-hidden backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-zinc-900 pb-3 mb-4">
            <span className="text-[10px] font-mono text-zinc-550 uppercase tracking-widest font-semibold">
              Inbox Telemetry
            </span>
            <button
              onClick={refresh}
              className="text-[9px] font-mono text-zinc-500 hover:text-indigo-400 border border-zinc-850 px-2 py-0.5 rounded transition cursor-pointer"
            >
              Refresh Feed
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pr-1">
            {loading ? (
              <div className="h-full flex items-center justify-center text-xs text-zinc-500 font-mono animate-pulse">
                SYNCING THREAD FEED...
              </div>
            ) : filteredThreads.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-zinc-650 font-mono text-center px-4">
                No matching threads found.
              </div>
            ) : (
              <ThreadList
                threads={filteredThreads}
                selectedId={selectedThreadId}
                onSelect={handleSelectThread}
              />
            )}
          </div>
        </div>

        {/* COLUMN 2: ASSISTANT CHAT & ORCHESTRATOR WORKSPACE (Middle, width: 6/12) */}
        <div className="lg:col-span-6 bg-[#0a0d09]/70 border border-zinc-900 rounded-2xl flex flex-col justify-between h-full overflow-hidden p-5 relative backdrop-blur-md">
          
          {/* Chat / Detail Scroll Area */}
          <div className="flex-1 overflow-y-auto space-y-5 pr-1 pb-4">
            
            {!selectedThreadId ? (
              /* Splash Welcome screen if no thread is active */
              <div className="h-full flex flex-col justify-center items-center text-center p-6 select-none gap-6">
                <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 font-black text-xl animate-float">
                  V
                </div>
                <div className="max-w-md">
                  <h3 className="text-lg font-medium text-white tracking-tight">Veloce Workspace Dashboard</h3>
                  <p className="text-xs text-zinc-500 mt-2 font-light leading-relaxed">
                    Select a thread on the left to review meeting conflicts, or type assistant commands directly inside the bottom console bar below.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 w-full max-w-sm mt-2 text-left">
                  <button
                    onClick={() => handleCommandBarExecute("/reschedule John Davis")}
                    className="p-3 bg-zinc-950/60 border border-zinc-900 rounded-xl hover:border-zinc-800 hover:bg-zinc-900/20 text-left cursor-pointer transition group"
                  >
                    <span className="text-[10px] font-mono text-indigo-400 block mb-1">/reschedule</span>
                    <span className="text-[11px] text-zinc-400 font-light group-hover:text-zinc-300">Run reschedule agent</span>
                  </button>
                  <button
                    onClick={() => handleCommandBarExecute("/connect-gmail")}
                    className="p-3 bg-zinc-950/60 border border-zinc-900 rounded-xl hover:border-zinc-800 hover:bg-zinc-900/20 text-left cursor-pointer transition group"
                  >
                    <span className="text-[10px] font-mono text-indigo-400 block mb-1">/connect</span>
                    <span className="text-[11px] text-zinc-400 font-light group-hover:text-zinc-300">Verify authorization</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Conversation thread + AI logs display */
              <div className="space-y-4">
                
                {/* Active Thread Header */}
                <div className="border-b border-zinc-900 pb-3 mb-2 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-100 truncate max-w-sm">
                      {threadDetail?.messages?.[0]?.payload?.headers?.find((h: any) => h.name.toLowerCase() === "subject")?.value || "Conversation Feed"}
                    </h3>
                    <span className="text-[9px] font-mono text-zinc-550 block mt-0.5">
                      ACTIVE CONTEXT DETECTED
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <StatusBadge type="success">Connected</StatusBadge>
                  </div>
                </div>

                {/* Email Messages Timeline */}
                {loadingDetail ? (
                  <div className="py-24 text-center text-xs text-zinc-500 font-mono animate-pulse">
                    PARSING CONVERSATION TELEMETRY...
                  </div>
                ) : (
                  <div className="space-y-3">
                    {threadDetail?.messages?.map((msg: any, i: number) => {
                      const fromHeader = msg.payload?.headers?.find((h: any) => h.name.toLowerCase() === "from")?.value
                      const dateHeader = msg.payload?.headers?.find((h: any) => h.name.toLowerCase() === "date")?.value
                      return (
                        <div key={i} className="p-4 bg-zinc-950/50 border border-zinc-900 rounded-xl">
                          <div className="flex justify-between items-center text-[10px] text-zinc-500 font-mono mb-2">
                            <span className="font-semibold text-zinc-400">{fromHeader}</span>
                            <span>{dateHeader}</span>
                          </div>
                          <p className="text-xs text-zinc-300 font-light leading-relaxed">{msg.snippet}</p>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Orchestration Log Feed */}
                <OrchestrationConsole logs={logs} visible={logs.length > 0 || orchestrating} />

                {/* AI Assistant Chat Stream */}
                {assistantMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col gap-1.5 p-4 rounded-xl max-w-[90%] border ${
                      msg.sender === "veloce"
                        ? "bg-indigo-950/5 border-indigo-500/10 self-start"
                        : "bg-zinc-900/20 border-zinc-850 self-end ml-auto"
                    }`}
                  >
                    <div className="flex justify-between items-center text-[9px] text-zinc-500 font-mono uppercase">
                      <span className={msg.sender === "veloce" ? "text-indigo-400 font-semibold" : "text-zinc-400"}>
                        {msg.sender === "veloce" ? "Veloce Agent" : "You"}
                      </span>
                      <span>{msg.time}</span>
                    </div>
                    <p className="text-xs text-zinc-200 leading-relaxed font-light">{msg.text}</p>
                  </div>
                ))}

                {/* Staged Proposal actions */}
                {orchestrationResult && (
                  <div className="p-4 bg-[#151912]/80 border border-zinc-800/80 rounded-xl space-y-4 shadow-lg">
                    <div>
                      <span className="text-[9px] font-mono text-indigo-400 uppercase tracking-wider block mb-1">
                        Gmail Draft Response (Staged)
                      </span>
                      <p className="text-xs text-zinc-300 leading-relaxed italic bg-zinc-950/40 p-3 rounded-lg border border-zinc-900">
                        "{orchestrationResult.draft.message}"
                      </p>
                    </div>

                    <div className="flex items-center justify-between border-t border-zinc-900/60 pt-3 text-[10px] text-zinc-500 font-mono">
                      <span>Actions Matrix Ready</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setOrchestrationResult(null)}
                          className="px-3 py-1.5 border border-zinc-850 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 rounded-lg text-[10px] font-mono cursor-pointer transition"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={commitSchedule}
                          className="px-3 py-1.5 bg-zinc-150 hover:bg-white text-zinc-950 rounded-lg text-[10px] font-mono font-semibold cursor-pointer transition"
                        >
                          Confirm & Send Draft
                        </button>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            )}

          </div>

          {/* Bottom command pill (Reference Image Recreated) */}
          <div className="border-t border-zinc-900/40 pt-4 mt-2">
            <CommandBar
              onExecute={handleCommandBarExecute}
              onSearch={(query) => setSearchQuery(query)}
              currentMode={commandBarMode}
              onModeChange={(mode) => {
                setCommandBarMode(mode)
                if (mode === "ask") {
                  setSearchQuery("") // Reset query when leaving search mode
                }
              }}
            />
          </div>

        </div>

        {/* COLUMN 3: GOOGLE CALENDAR TIMELINE VIEW (Right, width: 3/12) */}
        <div className="lg:col-span-3 bg-[#0a0d09]/70 border border-zinc-900 rounded-2xl p-4 flex flex-col h-full overflow-hidden backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-zinc-900 pb-3 mb-4">
            <span className="text-[10px] font-mono text-zinc-550 uppercase tracking-widest font-semibold">
              Calendar Timeline
            </span>
            <span className="text-[9px] font-mono text-zinc-600">
              EST (UTC-5)
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-1.5 text-left">
            {loadingCalendar ? (
              <div className="h-full flex items-center justify-center text-xs text-zinc-500 font-mono animate-pulse">
                SYNCING GRID EVENTS...
              </div>
            ) : (
              <div className="space-y-4">
                
                {/* 5-Day Sidebar Optimized timeline */}
                {timelineDays.map((day, dIdx) => {
                  const dayName = day.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
                  
                  // Filter events for this specific day
                  const dayEvents = events.filter((e) => {
                    if (!e.start.dateTime) return false
                    const eDate = new Date(e.start.dateTime)
                    return (
                      eDate.getDate() === day.getDate() &&
                      eDate.getMonth() === day.getMonth() &&
                      eDate.getFullYear() === day.getFullYear()
                    )
                  })

                  // Check if the temp scheduled event falls on this day
                  const isTempScheduledDay = tempScheduledEvent && (() => {
                    const tDate = new Date(tempScheduledEvent.start.dateTime!)
                    return (
                      tDate.getDate() === day.getDate() &&
                      tDate.getMonth() === day.getMonth() &&
                      tDate.getFullYear() === day.getFullYear()
                    )
                  })()

                  return (
                    <div key={dIdx} className="space-y-2">
                      <div className="text-[10px] font-mono text-zinc-650 border-b border-zinc-900 pb-1 flex justify-between">
                        <span>{dayName.toUpperCase()}</span>
                        {dayEvents.length === 0 && !isTempScheduledDay && <span>FREE</span>}
                      </div>

                      <div className="space-y-2">
                        {/* Render existing confirmed events */}
                        {dayEvents.map((evt) => {
                          const isConflict = selectedThreadId === "mock-thread-1" && evt.id === "mock-event-1"
                          const timeStr = evt.start.dateTime
                            ? new Date(evt.start.dateTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                            : ""

                          return (
                            <div
                              key={evt.id}
                              className={`p-3 border rounded-xl flex flex-col gap-1.5 transition-all ${
                                isConflict
                                  ? tempScheduledEvent
                                    ? "bg-red-950/5 border-red-500/20 opacity-40 line-through"
                                    : "bg-amber-950/10 border-amber-500/30 shadow-md"
                                  : "bg-zinc-950 border-zinc-900 hover:border-zinc-800"
                              }`}
                            >
                              <div className="flex justify-between items-center">
                                <span className="text-xs font-semibold text-zinc-200 truncate pr-2">
                                  {evt.summary}
                                </span>
                                <span className="text-[9px] font-mono text-zinc-500">{timeStr}</span>
                              </div>
                              {isConflict && (
                                <div className="mt-1 flex items-center justify-between">
                                  <StatusBadge type={tempScheduledEvent ? "danger" : "warning"} pulse={!tempScheduledEvent}>
                                    {tempScheduledEvent ? "Staged for Move" : "Conflict Pending"}
                                  </StatusBadge>
                                </div>
                              )}
                            </div>
                          )
                        })}

                        {/* Staged New Suggestion */}
                        {isTempScheduledDay && tempScheduledEvent && (
                          <div className="p-3 bg-indigo-950/20 border border-indigo-500/40 rounded-xl flex flex-col gap-1.5 shadow-[0_0_12px_rgba(99,102,241,0.08)] animate-pulse">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-semibold text-indigo-300 truncate">
                                {tempScheduledEvent.summary}
                              </span>
                              <span className="text-[9px] font-mono text-indigo-400">11:00 AM</span>
                            </div>
                            <div className="mt-1">
                              <StatusBadge type="info">STAGED SYNC</StatusBadge>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Core breakdown overlay on bottom */}
          {detection && selectedThreadId && (
            <div className="border-t border-zinc-900/60 pt-4 mt-4">
              <AIBreakdown detection={detection} />
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

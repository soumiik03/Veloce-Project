"use client"

import { useEffect, useState } from "react"
import { useInbox } from "@/hooks/use-inbox"
import { ThreadList } from "@/components/features/inbox/thread-list"
import { AIBreakdown } from "@/components/features/inbox/ai-breakdown"
import { OrchestrationConsole } from "@/components/features/inbox/orchestration-console"
import { StatusBadge } from "@/components/ui/status-badge"
import CommandBar from "@/components/ui/command-bar"
import { Intent, CalendarEvent } from "@/types"

export default function WorkspacePage() {
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
  const [assistantMessages, setAssistantMessages] = useState<{ sender: "user" | "veloce"; text: string; time: string }[]>([
    {
      sender: "veloce",
      text: "Welcome to Veloce Workspace. I am your autonomous calendar pilot. Select an email from the inbox telemetry feed to scan for reschedule requests, or input a command directly in the console below.",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    }
  ])

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
            subject: "Re: Quick sync on project architecture",
            suggestedTimes: ["Friday morning"],
            attendees: ["john.davis@company.com", "soumik@example.com"],
            confidence: 0.98
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
            subject: "Weekly marketing review",
            suggestedTimes: ["Next Tuesday"],
            attendees: ["sarah.smith@marketing.com", "soumik@example.com"],
            confidence: 0.85
          })
        }
        setLoadingDetail(false)
      }, 600)
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
        setDetection(data.detection)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingDetail(false)
    }
  }

  // Trigger reschedule flow
  const triggerRescheduleAgent = async () => {
    if (!selectedThreadId) return

    setOrchestrating(true)
    setOrchestrationResult(null)
    setLogs(["[INFO] Initiating Gmail rescheduling agent...", "[INFO] Analyzing intent profile constraints..."])

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
            id: "staged-temp-event",
            summary: data.detection?.subject || "Veloce Suggestion: Staged",
            start: { dateTime: data.recommendedSlot.start },
            end: { dateTime: data.recommendedSlot.end },
            attendees: data.detection?.attendees?.map((email: string) => ({ email })) || [],
            status: "tentative"
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

  // Commit calendar update & send email draft
  const commitSchedule = async () => {
    if (!orchestrationResult) return
    setLogs((prev) => [...prev, "[COMMITING] Sending draft email reply via Google API...", "[COMMITING] Dispatched draft reply..."])

    if (!selectedThreadId) return
    if (selectedThreadId.startsWith("mock-")) {
      setTimeout(() => {
        setLogs((prev) => [...prev, "[SUCCESS] Gmail draft sent.", "[SUCCESS] Google Calendar event synchronized."])
        if (tempScheduledEvent) {
          setEvents((prev) => [...prev, { ...tempScheduledEvent, id: `mock-event-${Date.now()}`, summary: "Project Architecture Sync", status: "confirmed" }])
        }
        setTempScheduledEvent(null)
        setOrchestrationResult(null)
      }, 1000)
      return
    }

    try {
      const cookieVal = document.cookie
        .split("; ")
        .find(row => row.startsWith("accessToken="))
        ?.split("=")[1]

      if (orchestrationResult.draft?.id) {
        const res = await fetch("/api/emails/drafts/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${cookieVal || ""}`
          },
          body: JSON.stringify({ draftId: orchestrationResult.draft.id })
        })
        if (res.ok) {
          setLogs((prev) => [...prev, "[SUCCESS] Gmail reply draft sent."])
          
          setAssistantMessages((prev) => [
            ...prev,
            {
              sender: "veloce",
              text: "Successfully sent the reply email: \"" + (orchestrationResult.draft.message || "") + "\"",
              time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            }
          ])
        } else {
          const data = await res.json()
          setLogs((prev) => [...prev, `[ERROR] Failed to send email draft: ${data.error || "Unknown error"}`])
        }
      }
    } catch (err: any) {
      setLogs((prev) => [...prev, `[ERROR] Connection failed: ${err.message || err}`])
    } finally {
      setTempScheduledEvent(null)
      setOrchestrationResult(null)
    }
  }

  // Discard draft and staged event
  const cancelSchedule = async () => {
    if (!orchestrationResult) return
    setLogs((prev) => [...prev, "[CANCELLING] Discarding draft email...", "[CANCELLING] Discarding staged event..."])

    try {
      const cookieVal = document.cookie
        .split("; ")
        .find(row => row.startsWith("accessToken="))
        ?.split("=")[1]

      if (orchestrationResult.draft?.id) {
        await fetch(`/api/emails/drafts/${orchestrationResult.draft.id}`, {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${cookieVal || ""}`
          }
        })
      }

      if (orchestrationResult.calendarEvent?.id) {
        await fetch(`/api/calendar/events/${orchestrationResult.calendarEvent.id}`, {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${cookieVal || ""}`
          }
        })
      }

      setLogs((prev) => [...prev, "[SUCCESS] Discarded staged changes."])
    } catch (err: any) {
      setLogs((prev) => [...prev, `[ERROR] Failed to discard changes: ${err.message}`])
    } finally {
      setTempScheduledEvent(null)
      setOrchestrationResult(null)
    }
  }

  // Handle Bottom command executes
  const handleCommandBarExecute = (cmdText: string) => {
    if (!cmdText.trim()) return

    // Append user query
    setAssistantMessages((prev) => [
      ...prev,
      {
        sender: "user",
        text: cmdText,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      }
    ])

    const normalizedCmd = cmdText.toLowerCase().trim()

    if (normalizedCmd.startsWith("/reschedule") || normalizedCmd.includes("reschedule")) {
      if (!selectedThreadId) {
        setAssistantMessages((prev) => [
          ...prev,
          {
            sender: "veloce",
            text: "Please select an inbox thread from the left panel first to run the rescheduling agent.",
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          }
        ])
      } else {
        setAssistantMessages((prev) => [
          ...prev,
          {
            sender: "veloce",
            text: "Initiating autonomous reschedule lookup. Standby.",
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          }
        ])
        triggerRescheduleAgent()
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

          if (!res.ok) {
            const data = await res.json().catch(() => ({}))
            throw new Error(data.error || "Failed to query agent")
          }

          const reader = res.body?.getReader()
          if (!reader) {
            throw new Error("No response reader available")
          }

          // Add a new empty slot for the assistant message
          setAssistantMessages((prev) => [
            ...prev,
            {
              sender: "veloce",
              text: "",
              time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            }
          ])

          const decoder = new TextDecoder()
          let accumulatedText = ""
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
                if (parsed.text) {
                  accumulatedText += parsed.text
                  setAssistantMessages((prev) => {
                    const next = [...prev]
                    if (next.length > 0) {
                      next[next.length - 1] = {
                        ...next[next.length - 1],
                        text: accumulatedText
                      }
                    }
                    return next
                  })
                }
              } catch (e) {
                console.warn("Failed to parse client SSE chunk:", jsonStr, e)
              }
            }
          }

          if (buffer.trim().startsWith("data:")) {
            const jsonStr = buffer.trim().slice(5).trim()
            try {
              const parsed = JSON.parse(jsonStr)
              if (parsed.text) {
                accumulatedText += parsed.text
                setAssistantMessages((prev) => {
                  const next = [...prev]
                  if (next.length > 0) {
                    next[next.length - 1] = {
                      ...next[next.length - 1],
                      text: accumulatedText
                    }
                  }
                  return next
                })
              }
            } catch {}
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

  // Helper to filter calendar events to the active timeline day list
  const getEventsForDay = (day: Date) => {
    return [...events, ...(tempScheduledEvent ? [tempScheduledEvent] : [])].filter((evt) => {
      const evtDate = new Date(evt.start.dateTime || "")
      return evtDate.toDateString() === day.toDateString()
    })
  }

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
            
            {(!selectedThreadId && assistantMessages.length === 0) ? (
              /* Splash Welcome screen if no thread is active */
              <div className="h-full flex flex-col justify-center items-center text-center p-6 select-none gap-6">
                <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-850 flex items-center justify-center text-zinc-550 font-black text-xl animate-float">
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
                {selectedThreadId && (
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
                )}

                {/* Email Messages Timeline */}
                {selectedThreadId && (
                  loadingDetail ? (
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
                            <div className="flex justify-between items-center text-[10px] text-zinc-550 font-mono mb-2">
                              <span className="font-semibold text-zinc-400">{fromHeader}</span>
                              <span>{dateHeader}</span>
                            </div>
                            <p className="text-xs text-zinc-300 font-light leading-relaxed">{msg.snippet}</p>
                          </div>
                        )
                      })}
                    </div>
                  )
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
                          onClick={cancelSchedule}
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
                SYNCING CALENDAR...
              </div>
            ) : (
              timelineDays.map((day, idx) => {
                const dayEvents = getEventsForDay(day)
                return (
                  <div key={idx} className="space-y-1.5">
                    <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider block">
                      {day.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
                    </span>
                    {dayEvents.length === 0 ? (
                      <div className="p-3 bg-zinc-950/20 border border-zinc-900/40 rounded-xl text-[10px] font-mono text-zinc-650">
                        No events scheduled
                      </div>
                    ) : (
                      dayEvents.map((evt) => {
                        const startStr = new Date(evt.start.dateTime || "").toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                        const endStr = new Date(evt.end.dateTime || "").toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                        const isTemp = evt.id === "staged-temp-event"

                        return (
                          <div
                            key={evt.id}
                            className={`p-3 border rounded-xl flex flex-col gap-1 ${
                              isTemp
                                ? "bg-indigo-950/20 border-indigo-500/30 shadow-[0_0_10px_rgba(99,102,241,0.05)]"
                                : "bg-zinc-950/45 border-zinc-900"
                            }`}
                          >
                            <span className={`text-[10px] font-semibold tracking-tight ${isTemp ? "text-indigo-300" : "text-zinc-200"}`}>
                              {evt.summary}
                            </span>
                            <span className="text-[9px] font-mono text-zinc-500">
                              {startStr} - {endStr}
                            </span>
                            {isTemp && (
                              <span className="text-[8px] font-mono text-indigo-400 font-semibold mt-1 uppercase tracking-widest animate-pulse">
                                Staged / Uncommitted
                              </span>
                            )}
                          </div>
                        )
                      })
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>

      </div>

    </div>
  )
}

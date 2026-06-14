"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"

interface MailThread {
  id: string
  subject: string
  from: string
  date: string
  snippet: string
  isReschedule?: boolean
}

interface MailPageClientProps {
  initialThreadId?: string
}

export function MailPageClient({ initialThreadId }: MailPageClientProps) {
  const router = useRouter()
  const [threads, setThreads] = useState<MailThread[]>([])
  const [loadingThreads, setLoadingThreads] = useState(false)
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(initialThreadId || null)
  const [threadDetail, setThreadDetail] = useState<any>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeFolder, setActiveFolder] = useState("inbox")

  // Reply Draft box states
  const [replyText, setReplyText] = useState("")
  const [draftingAI, setDraftingAI] = useState(false)

  // AI Sidebar analysis states
  const [analysis, setAnalysis] = useState<{
    summary: string
    actionRequirements: string[]
    priority: string
    calendarRelevance: string
    suggestedReplies: string[]
  } | null>(null)
  const [loadingAnalysis, setLoadingAnalysis] = useState(false)
  const [aiChatQuery, setAiChatQuery] = useState("")
  const [aiChatLogs, setAiChatLogs] = useState<{ role: "user" | "assistant"; text: string }[]>([])
  const [sendingAiQuery, setSendingAiQuery] = useState(false)

  // Compose Modal states
  const [showCompose, setShowCompose] = useState(false)
  const [composeTo, setComposeTo] = useState("")
  const [composeCc, setComposeCc] = useState("")
  const [composeBcc, setComposeBcc] = useState("")
  const [composeSubject, setComposeSubject] = useState("")
  const [composeContent, setComposeContent] = useState("")
  const [writingAI, setWritingAI] = useState(false)
  const [sendingMail, setSendingMail] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Fetch threads on mount
  const fetchThreads = async () => {
    setLoadingThreads(true)
    try {
      const res = await fetch("/api/emails?maxResults=20")
      if (res.ok) {
        const data = await res.json()
        if (data.threads) {
          // Cross reference with conflict detector state if needed (or detect simple vectors)
          const parsed: MailThread[] = data.threads.map((t: any) => ({
            ...t,
            isReschedule: (t.snippet || "").toLowerCase().includes("reschedule") || 
                          (t.snippet || "").toLowerCase().includes("conflict") ||
                          (t.subject || "").toLowerCase().includes("reschedule")
          }))
          setThreads(parsed)
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingThreads(false)
    }
  }

  useEffect(() => {
    fetchThreads()
  }, [])

  // Sync route param threadId
  useEffect(() => {
    if (initialThreadId) {
      setSelectedThreadId(initialThreadId)
    }
  }, [initialThreadId])

  // Fetch thread details and AI Analysis
  useEffect(() => {
    if (!selectedThreadId) {
      setThreadDetail(null)
      setAnalysis(null)
      setAiChatLogs([])
      return
    }

    const fetchThreadDetail = async () => {
      setLoadingDetail(false)
      setLoadingAnalysis(true)
      try {
        // Fetch thread details
        setLoadingDetail(true)
        const detailRes = await fetch(`/api/emails/${selectedThreadId}`)
        if (detailRes.ok) {
          const detailData = await detailRes.json()
          setThreadDetail(detailData.thread)
        }
        setLoadingDetail(false)

        // Fetch AI Analysis summary
        const analysisRes = await fetch(`/api/emails/${selectedThreadId}/analysis`)
        if (analysisRes.ok) {
          const analysisData = await analysisRes.json()
          setAnalysis(analysisData)
        }
      } catch (err) {
        console.error("Error fetching details/analysis:", err)
      } finally {
        setLoadingDetail(false)
        setLoadingAnalysis(false)
      }
    }

    fetchThreadDetail()
  }, [selectedThreadId])

  // Listen to Compose event from persistent layout
  useEffect(() => {
    const handleNewMail = () => {
      setShowCompose(true)
    }
    window.addEventListener("veloce-new-mail", handleNewMail)
    return () => {
      window.removeEventListener("veloce-new-mail", handleNewMail)
    }
  }, [])

  // Action pills search execute
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) {
      fetchThreads()
      return
    }
    setLoadingThreads(true)
    try {
      const res = await fetch(`/api/agent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: `/search ${searchQuery}` })
      })
      // Let's reload threads list from standard list and filter locally
      fetchThreads()
    } catch {
      setLoadingThreads(false)
    }
  }

  // Filter threads based on Search Query locally
  const filteredThreads = threads.filter(t => {
    if (activeFolder === "sent") return (t.from || "").includes("me") || (t.from || "").includes("Soumik")
    const matchQuery = (t.subject || "").toLowerCase().includes(searchQuery.toLowerCase()) || 
                       (t.from || "").toLowerCase().includes(searchQuery.toLowerCase()) || 
                       (t.snippet || "").toLowerCase().includes(searchQuery.toLowerCase())
    return matchQuery
  })

  // Stream AI Reply Draft
  const handleAIDraft = async () => {
    if (!threadDetail || draftingAI) return
    setReplyText("")
    setDraftingAI(true)

    const latestMessage = threadDetail.messages?.[threadDetail.messages.length - 1] || threadDetail
    const subject = threadDetail.subject || "Re: Sync"
    const content = latestMessage.snippet || latestMessage.content || ""

    try {
      const fromHeader = latestMessage.payload?.headers?.find((h: any) => h.name.toLowerCase() === "from")?.value || ""
      const prompt = `Write a professional reply to the following email thread:
Subject: "${subject}"
Sender: "${fromHeader}"
Content: "${content}"

Keep the response concise, clear, and direct. Output only the email body without any email header tokens.`

      const res = await fetch("/api/agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ message: prompt })
      })

      if (!res.ok) throw new Error("AI draft service offline")

      const reader = res.body?.getReader()
      if (!reader) throw new Error("No response reader")

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
              setReplyText(accumulatedText)
            }
          } catch {}
        }
      }
    } catch (err: any) {
      console.error(err)
      setReplyText(`Failed to generate AI Draft: ${err.message}`)
    } finally {
      setDraftingAI(false)
    }
  }

  // Send Reply Email
  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedThreadId) return
    setDraftingAI(true)
    try {
      const res = await fetch(`/api/agent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: replyText,
          threadId: selectedThreadId
        })
      })

      if (res.ok) {
        setReplyText("")
        alert("Reply successfully sent!")
        // Reload details
        const detailRes = await fetch(`/api/emails/${selectedThreadId}`)
        if (detailRes.ok) {
          const detailData = await detailRes.json()
          setThreadDetail(detailData.thread)
        }
      } else {
        alert("Failed to send reply.")
      }
    } catch (err) {
      console.error(err)
      alert("Error sending reply.")
    } finally {
      setDraftingAI(false)
    }
  }

  // Compose Email (AI Write helper)
  const handleAIWrite = async () => {
    if (!composeSubject.trim() || writingAI) {
      alert("Please enter a subject first so the AI can capture the context.")
      return
    }
    setComposeContent("")
    setWritingAI(true)
    try {
      const prompt = `Write a clean professional email with the subject "${composeSubject}". Please output only the email body without any email header tokens.`

      const res = await fetch("/api/agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ message: prompt })
      })

      if (!res.ok) throw new Error("AI engine offline")

      const reader = res.body?.getReader()
      if (!reader) throw new Error("No response reader")

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
              setComposeContent(accumulatedText)
            }
          } catch {}
        }
      }
    } catch (err: any) {
      alert(`AI Write failed: ${err.message}`)
    } finally {
      setWritingAI(false)
    }
  }

  // Submit Composed Email
  const handleSendCompose = async () => {
    if (!composeTo.trim() || !composeSubject.trim() || !composeContent.trim()) {
      alert("Please fill in To, Subject, and Content fields.")
      return
    }
    setSendingMail(true)
    try {
      const res = await fetch("/api/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          to: composeTo,
          cc: composeCc || undefined,
          bcc: composeBcc || undefined,
          subject: composeSubject,
          content: composeContent
        })
      })

      if (res.ok) {
        alert("Email sent successfully!")
        setShowCompose(false)
        setComposeTo("")
        setComposeCc("")
        setComposeBcc("")
        setComposeSubject("")
        setComposeContent("")
        fetchThreads()
      } else {
        alert("Failed to send email.")
      }
    } catch (err) {
      console.error(err)
      alert("Error sending email.")
    } finally {
      setSendingMail(false)
    }
  }

  // Submit AI Query on selected thread
  const handleSendAiQuery = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!aiChatQuery.trim() || !selectedThreadId || sendingAiQuery) return
    const query = aiChatQuery.trim()
    setAiChatQuery("")
    setSendingAiQuery(true)

    setAiChatLogs(prev => [...prev, { role: "user", text: query }])

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ message: query })
      })

      if (!res.ok) throw new Error("AI agent offline")

      const reader = res.body?.getReader()
      if (!reader) throw new Error("No response reader")

      setAiChatLogs(prev => [...prev, { role: "assistant", text: "" }])

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
              setAiChatLogs(prev => {
                const next = [...prev]
                const last = { ...next[next.length - 1] }
                last.text = accumulatedText
                next[next.length - 1] = last
                return next
              })
            }
          } catch {}
        }
      }
    } catch (err: any) {
      setAiChatLogs(prev => [...prev, { role: "assistant", text: `Error: ${err.message}` }])
    } finally {
      setSendingAiQuery(false)
    }
  }

  // Quick reply action helpers
  const handleSuggestedReplyClick = (reply: string) => {
    setReplyText(reply)
  }

  return (
    <div className="flex-1 flex h-screen bg-[#0d0d0d] text-[#e8e8e8] overflow-hidden select-none">
      
      {/* PANEL 1: Inbox Navigation and Feed (280px) */}
      <aside className="w-[280px] border-r-[0.5px] border-[#1a1a1a] flex flex-col min-h-0 bg-[#0d0d0d] shrink-0">
        
        {/* Folder items list */}
        <div className="p-4 flex flex-col gap-1 border-b border-[#1a1a1a]/50">
          {["inbox", "sent", "drafts", "trash"].map((folder) => (
            <button
              key={folder}
              onClick={() => setActiveFolder(folder)}
              className={`flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-colors border-0 cursor-pointer ${
                activeFolder === folder 
                  ? "bg-white/5 text-white font-medium" 
                  : "text-[#666] hover:text-[#aaa] bg-transparent"
              }`}
            >
              <span className="capitalize">{folder}</span>
              {folder === "inbox" && filteredThreads.length > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] bg-[#1a1a1a] text-[#888] rounded-full font-mono">
                  {filteredThreads.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="p-3 border-b border-[#1a1a1a]/50">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search all mail..."
            className="w-full bg-[#141414] border border-[#1e1e1e] rounded-lg px-3 py-1.5 text-xs text-white placeholder-[#444] focus:outline-none"
          />
        </form>

        {/* Email Feed */}
        <div className="flex-1 overflow-y-auto">
          {loadingThreads ? (
            <div className="p-8 text-center text-xs text-[#555] font-mono animate-pulse">
              SYNCING INBOX TELEMETRY...
            </div>
          ) : filteredThreads.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#444] font-mono italic">
              No threads found
            </div>
          ) : (
            filteredThreads.map((thread) => (
              <button
                key={thread.id}
                onClick={() => setSelectedThreadId(thread.id)}
                className={`w-full text-left p-4 border-b border-[#1a1a1a]/40 hover:bg-white/[0.01] transition-colors flex flex-col gap-1.5 border-0 cursor-pointer ${
                  selectedThreadId === thread.id ? "bg-white/[0.02] border-l-2 border-white" : "bg-transparent"
                }`}
              >
                <div className="flex justify-between items-center text-[11px] font-mono">
                  <span className="text-[#888] font-medium truncate max-w-[150px]">{thread.from}</span>
                  <span className="text-[#444] shrink-0">{thread.date}</span>
                </div>
                <span className="text-xs text-white font-medium truncate w-full">
                  {thread.subject}
                </span>
                <p className="text-[11px] text-[#666] line-clamp-2 leading-relaxed">
                  {thread.snippet}
                </p>
                {thread.isReschedule && (
                  <span className="inline-block mt-0.5 text-[9px] font-mono text-[#d97706] bg-[#d97706]/10 px-2 py-0.5 rounded-md font-semibold tracking-wider w-max">
                    [⚠ RESCHEDULE VECTOR DETECTED]
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </aside>

      {/* PANEL 2: Selected Thread Detail & Compose replies (flex: 1) */}
      <section className="flex-1 flex flex-col min-h-0 bg-[#0d0d0d]">
        {selectedThreadId ? (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Header */}
            <header className="p-6 border-b border-[#1a1a1a]/50 flex justify-between items-center">
              <div>
                <h1 className="text-[16px] font-semibold text-white tracking-tight leading-snug">
                  {threadDetail?.subject || "Loading thread subject..."}
                </h1>
                <p className="text-[10px] font-mono text-[#555] uppercase block mt-1">
                  THREAD ID: {selectedThreadId}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                {["Reply", "Reply All", "Forward", "Archive", "Delete"].map((action) => (
                  <button
                    key={action}
                    onClick={() => {
                      if (action === "Reply" || action === "Reply All") {
                        textareaRef.current?.focus()
                      } else {
                        alert(`${action} triggered.`)
                      }
                    }}
                    className="px-2.5 py-1 bg-[#141414] hover:bg-[#1c1c1c] border border-[#1e1e1e] text-[11px] text-[#888] hover:text-white rounded-md transition-colors cursor-pointer"
                  >
                    {action}
                  </button>
                ))}
              </div>
            </header>

            {/* Email Message Detail History */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {loadingDetail ? (
                <div className="py-24 text-center text-xs text-[#555] font-mono animate-pulse">
                  PARSING TELEMETRY STREAM...
                </div>
              ) : threadDetail?.messages ? (
                threadDetail.messages.map((msg: any, i: number) => {
                  const fromHeader = msg.payload?.headers?.find((h: any) => h.name.toLowerCase() === "from")?.value || "Unknown Sender"
                  const dateHeader = msg.payload?.headers?.find((h: any) => h.name.toLowerCase() === "date")?.value || ""
                  return (
                    <div key={i} className="bg-[#111] border border-[#1e1e1e]/60 rounded-xl p-4 flex flex-col gap-3">
                      <div className="flex justify-between items-center text-[11px] font-mono border-b border-[#1e1e1e]/40 pb-2">
                        <span className="text-white font-medium">{fromHeader}</span>
                        <span className="text-[#555]">{dateHeader}</span>
                      </div>
                      <p className="text-[13px] text-[#ccc] leading-relaxed font-light whitespace-pre-wrap">
                        {msg.snippet || msg.content || "Empty content"}
                      </p>
                    </div>
                  )
                })
              ) : (
                /* Detail Fallback */
                <div className="bg-[#111] border border-[#1e1e1e]/60 rounded-xl p-4 flex flex-col gap-3">
                  <div className="flex justify-between items-center text-[11px] font-mono border-b border-[#1e1e1e]/40 pb-2">
                    <span className="text-white font-medium">{threadDetail?.from || "Veloce"}</span>
                    <span className="text-[#555]">{threadDetail?.date || ""}</span>
                  </div>
                  <p className="text-[13px] text-[#ccc] leading-relaxed font-light whitespace-pre-wrap">
                    {threadDetail?.snippet || ""}
                  </p>
                </div>
              )}
            </div>

            {/* Bottom reply compose box */}
            <div className="p-6 border-t border-[#1a1a1a]/50 bg-[#111]/30">
              <div className="bg-[#141414] border border-[#1e1e1e] rounded-xl p-3 flex flex-col gap-3">
                <textarea
                  ref={textareaRef}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your reply here..."
                  rows={3}
                  className="w-full bg-transparent text-white placeholder-[#444] text-xs focus:outline-none resize-none leading-relaxed"
                />
                
                <div className="flex items-center justify-between border-t border-[#1e1e1e]/60 pt-3">
                  <button
                    onClick={handleAIDraft}
                    disabled={draftingAI}
                    className="px-3 py-1.5 bg-[#d97706]/10 border border-[#d97706]/20 text-[#d97706] hover:bg-[#d97706]/20 text-[11px] font-mono rounded-lg transition-colors cursor-pointer font-semibold"
                  >
                    {draftingAI ? "Writing AI Draft..." : "✨ AI Draft"}
                  </button>

                  <button
                    onClick={handleSendReply}
                    disabled={!replyText.trim() || draftingAI}
                    className="px-4 py-1.5 bg-white text-black hover:bg-neutral-200 disabled:opacity-40 text-xs font-semibold rounded-lg transition-colors cursor-pointer border-0"
                  >
                    Send Reply
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col justify-center items-center select-none text-center p-6 gap-3">
            <svg className="w-10 h-10 text-[#222]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
            </svg>
            <h3 className="text-sm font-medium text-white font-mono">No Email Thread Selected</h3>
            <p className="text-xs text-[#555] font-sans font-light">
              Select an email thread from the left list telemetry to read, summarize, or draft responses.
            </p>
          </div>
        )}
      </section>

      {/* PANEL 3: AI Mail Sidebar (220px) */}
      {selectedThreadId && (
        <aside className="w-[220px] border-l-[0.5px] border-[#1a1a1a] flex flex-col min-h-0 bg-[#0d0d0d] shrink-0">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            
            {/* Summary */}
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-mono text-[#888] uppercase tracking-wider block border-b border-[#1a1a1a]/50 pb-1.5 font-bold">
                AI Summary
              </span>
              {loadingAnalysis ? (
                <div className="text-[11px] text-[#444] font-mono animate-pulse">Running telemetry scan...</div>
              ) : (
                <p className="text-xs text-[#aaa] leading-relaxed font-light">
                  {analysis?.summary || "Automated email analysis not generated."}
                </p>
              )}
            </div>

            {/* Action Requirements */}
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-mono text-[#888] uppercase tracking-wider block border-b border-[#1a1a1a]/50 pb-1.5 font-bold">
                Action Items
              </span>
              {loadingAnalysis ? (
                <div className="text-[11px] text-[#444] font-mono animate-pulse">Scanning requirements...</div>
              ) : analysis?.actionRequirements && analysis.actionRequirements.length > 0 ? (
                <ul className="list-disc pl-4 space-y-1 text-xs text-[#aaa] font-light">
                  {analysis.actionRequirements.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              ) : (
                <span className="text-[11px] text-[#444] font-mono italic">No actions identified.</span>
              )}
            </div>

            {/* Metadata (Priority & Calendar) */}
            <div className="flex flex-col gap-3">
              <span className="text-[10px] font-mono text-[#888] uppercase tracking-wider block border-b border-[#1a1a1a]/50 pb-1.5 font-bold">
                Context Signals
              </span>
              <div className="flex flex-col gap-2 text-xs text-[#aaa] font-light">
                <div className="flex justify-between items-center">
                  <span>Priority:</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                    analysis?.priority === "High" 
                      ? "bg-red-500/10 text-red-400 border border-red-500/20" 
                      : "bg-[#181818] text-[#888] border border-[#222]"
                  }`}>
                    {analysis?.priority || "Medium"}
                  </span>
                </div>
                <div>
                  <span className="block mb-0.5">Calendar Relevance:</span>
                  <p className="text-[11px] text-[#777] italic leading-normal">
                    {analysis?.calendarRelevance || "Scan complete."}
                  </p>
                </div>
              </div>
            </div>

            {/* Suggested Replies */}
            {analysis?.suggestedReplies && analysis.suggestedReplies.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-mono text-[#888] uppercase tracking-wider block border-b border-[#1a1a1a]/50 pb-1.5 font-bold">
                  Suggested Replies
                </span>
                <div className="flex flex-col gap-1.5">
                  {analysis.suggestedReplies.map((reply, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSuggestedReplyClick(reply)}
                      className="w-full text-left px-2.5 py-1.5 bg-[#141414] hover:bg-[#1a1a1a] border border-[#1e1e1e] rounded-lg text-[11px] text-[#aaa] hover:text-white transition-colors cursor-pointer text-ellipsis overflow-hidden"
                      title={reply}
                    >
                      {reply}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Mini Chat log */}
            {aiChatLogs.length > 0 && (
              <div className="flex flex-col gap-2.5 pt-2 border-t border-[#1a1a1a]/50">
                <span className="text-[10px] font-mono text-[#888] uppercase tracking-wider block font-bold">
                  Sidebar Chat
                </span>
                <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1">
                  {aiChatLogs.map((chat, idx) => (
                    <div key={idx} className="text-[11px] flex flex-col gap-0.5 leading-relaxed">
                      <span className="font-mono text-[#555] uppercase">{chat.role === "user" ? "You" : "AI"}</span>
                      <p className="text-[#999] font-light">{chat.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Ask sidebar input */}
          <form onSubmit={handleSendAiQuery} className="p-3 border-t border-[#1a1a1a]/50 bg-[#111]/30">
            <input
              type="text"
              value={aiChatQuery}
              onChange={(e) => setAiChatQuery(e.target.value)}
              placeholder="Ask AI about thread..."
              disabled={sendingAiQuery}
              className="w-full bg-[#141414] border border-[#1e1e1e] rounded-lg px-2.5 py-1.5 text-[11px] text-white placeholder-[#555] focus:outline-none"
            />
          </form>
        </aside>
      )}

      {/* Compose Email Modal */}
      {showCompose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
          <div className="w-full max-w-[500px] bg-[#111] border border-[#1e1e1e] rounded-xl flex flex-col shadow-2xl">
            
            {/* Modal Header */}
            <header className="p-4 border-b border-[#1a1a1a]/60 flex justify-between items-center">
              <span className="text-xs font-semibold text-white font-mono">NEW EMAIL</span>
              <button 
                onClick={() => setShowCompose(false)}
                className="text-[#666] hover:text-white transition-colors cursor-pointer border-0 bg-transparent"
              >
                ✕
              </button>
            </header>

            {/* Modal Form */}
            <div className="p-5 flex flex-col gap-4">
              
              {/* To/Cc/Bcc row */}
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-[#555] font-mono w-10 text-right">To:</span>
                  <input
                    type="email"
                    value={composeTo}
                    onChange={(e) => setComposeTo(e.target.value)}
                    placeholder="recipient@example.com"
                    className="flex-1 bg-[#141414] border border-[#1e1e1e] rounded-md px-2.5 py-1 text-white placeholder-[#444] focus:outline-none text-xs"
                  />
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-[#555] font-mono w-10 text-right">Cc:</span>
                  <input
                    type="text"
                    value={composeCc}
                    onChange={(e) => setComposeCc(e.target.value)}
                    placeholder="cc@example.com"
                    className="flex-1 bg-[#141414] border border-[#1e1e1e] rounded-md px-2.5 py-1 text-white placeholder-[#444] focus:outline-none text-xs"
                  />
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-[#555] font-mono w-10 text-right">Bcc:</span>
                  <input
                    type="text"
                    value={composeBcc}
                    onChange={(e) => setComposeBcc(e.target.value)}
                    placeholder="bcc@example.com"
                    className="flex-1 bg-[#141414] border border-[#1e1e1e] rounded-md px-2.5 py-1 text-white placeholder-[#444] focus:outline-none text-xs"
                  />
                </div>
              </div>

              {/* Subject */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-[#555] font-mono w-10 text-right">Subj:</span>
                <input
                  type="text"
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  placeholder="Subject title"
                  className="flex-1 bg-[#141414] border border-[#1e1e1e] rounded-md px-2.5 py-1 text-white placeholder-[#444] focus:outline-none text-xs font-semibold"
                />
              </div>

              {/* Content textarea */}
              <textarea
                value={composeContent}
                onChange={(e) => setComposeContent(e.target.value)}
                placeholder="Email content goes here..."
                rows={8}
                className="w-full bg-[#141414] border border-[#1e1e1e] rounded-md p-3 text-xs text-white placeholder-[#444] focus:outline-none resize-none leading-relaxed"
              />

              {/* Action Buttons */}
              <div className="flex justify-between items-center border-t border-[#1a1a1a]/50 pt-4 mt-2">
                <button
                  onClick={handleAIWrite}
                  disabled={writingAI}
                  className="px-3 py-1.5 bg-[#d97706]/10 border border-[#d97706]/20 text-[#d97706] hover:bg-[#d97706]/20 text-[11px] font-mono rounded-lg transition-colors cursor-pointer font-semibold"
                >
                  {writingAI ? "AI Writing..." : "✨ AI Write"}
                </button>

                <div className="flex gap-2">
                  <button
                    onClick={() => setShowCompose(false)}
                    className="px-3.5 py-1.5 border border-[#1e1e1e] hover:bg-white/5 text-xs rounded-lg transition-colors cursor-pointer text-[#888] bg-transparent"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendCompose}
                    disabled={sendingMail || writingAI}
                    className="px-4 py-1.5 bg-white text-black hover:bg-neutral-200 disabled:opacity-40 text-xs font-semibold rounded-lg transition-colors cursor-pointer border-0"
                  >
                    Send Email
                  </button>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  )
}

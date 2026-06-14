"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"

interface ChatMessage {
  id?: string
  role: "user" | "assistant"
  content: string
  createdAt?: string
}

interface ChatPageClientProps {
  id?: string
}

export function ChatPageClient({ id }: ChatPageClientProps) {
  const router = useRouter()
  const { user } = useAuth()
  
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputText, setInputText] = useState("")
  const [loading, setLoading] = useState(false)
  const [streamingMessage, setStreamingMessage] = useState("")
  
  // Model Selector
  const [activeModel, setActiveModel] = useState("Sonnet 4.6")
  const [showModels, setShowModels] = useState(false)
  const models = ["Sonnet 4.6", "Haiku 1.0", "Gemini 2.5 Pro"]

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-grow input textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }, [inputText])

  // Scroll to bottom on new message or stream
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, streamingMessage])

  // Load message history if thread ID is present
  useEffect(() => {
    if (!id) {
      setMessages([])
      return
    }

    let active = true
    const fetchHistory = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/agent/threads/${id}`, { credentials: "include" })
        if (res.ok) {
          const data = await res.json()
          if (active && data.messages) {
            setMessages(data.messages)
          }
        }
      } catch (err) {
        console.error("Error loading chat history:", err)
      } finally {
        if (active) setLoading(false)
      }
    }

    fetchHistory()
    return () => {
      active = false
    }
  }, [id])

  // Listen for new chat trigger from sidebar
  useEffect(() => {
    const handleNewChat = () => {
      setMessages([])
      setInputText("")
      setStreamingMessage("")
    }

    window.addEventListener("veloce-new-chat", handleNewChat)
    return () => {
      window.removeEventListener("veloce-new-chat", handleNewChat)
    }
  }, [])

  // Send message handler
  const handleSend = async (textToSend?: string) => {
    const messageContent = (textToSend || inputText).trim()
    if (!messageContent) return

    if (!textToSend) {
      setInputText("")
    }

    // Determine target thread ID (existing or brand new)
    const activeThreadId = id || crypto.randomUUID()
    const isNewThread = !id
    const threadTitle = isNewThread
      ? messageContent.slice(0, 40) + (messageContent.length > 40 ? "..." : "")
      : undefined

    // Add user message to local state
    const userMsg: ChatMessage = { role: "user", content: messageContent }
    setMessages(prev => [...prev, userMsg])
    setStreamingMessage("")

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          message: messageContent,
          threadId: activeThreadId,
          threadTitle
        })
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to process chat")
      }

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
              setStreamingMessage(accumulatedText)
            }
          } catch (e) {
            console.warn("Failed to parse client stream chunk:", jsonStr, e)
          }
        }
      }

      // Finalize the streaming message
      if (accumulatedText) {
        setMessages(prev => [...prev, { role: "assistant", content: accumulatedText }])
        setStreamingMessage("")
      }

      // If it's a new thread, navigate to the specific thread route silently to prevent remounting
      if (isNewThread) {
        window.history.replaceState(null, '', `/app/chat/${activeThreadId}`)
      }
    } catch (err: any) {
      console.error(err)
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: `Error: ${err.message || "Failed to connect to AI agent."}` }
      ])
      setStreamingMessage("")
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Quick Action Pills Handler
  const handleQuickAction = (pill: string) => {
    if (pill === "reschedule") {
      handleSend("Scan my inbox for reschedule requests and find alternative spots.")
    } else if (pill === "sync") {
      handleSend("Sync my Google Calendar events.")
    } else if (pill === "buffer") {
      handleSend("Set a focus buffer constraint of 15 minutes for meetings.")
    }
  }

  const activeDayName = new Date().toLocaleDateString("en-US", { weekday: "long" })
  const firstName = user?.name ? user.name.split(" ")[0] : "Productivity Pilot"

  return (
    <div className="flex-1 flex flex-col h-screen bg-[#0d0d0d] text-[#e8e8e8] overflow-hidden">
      
      {/* Scrollable Chat History */}
      <div className="flex-1 overflow-y-auto px-6 py-8 md:px-12 lg:px-24">
        {messages.length === 0 && !streamingMessage ? (
          /* Home State */
          <div className="h-full flex flex-col justify-center items-center select-none max-w-2xl mx-auto text-center gap-10">
            <h1 className="text-4xl md:text-5xl font-serif italic font-normal text-white animate-fade-in tracking-tight">
              Happy {activeDayName}, {firstName}
            </h1>
            
            {/* Centered prompt card */}
            <div className="w-full bg-[#141414] border border-[#1e1e1e] rounded-2xl p-4 shadow-xl text-left flex flex-col gap-3">
              <textarea
                ref={textareaRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Veloce to draft an email, plan your week, or check calendar conflicts..."
                rows={2}
                className="w-full bg-transparent text-white placeholder-[#555] text-[14px] focus:outline-none resize-none leading-relaxed font-sans font-light"
              />
              
              <div className="flex items-center justify-between border-t border-[#1e1e1e]/60 pt-3 mt-1 text-[#555]">
                {/* Left controls */}
                <div className="flex items-center gap-3">
                  <button className="hover:text-white transition-colors cursor-pointer" title="Add context">
                    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                  </button>
                </div>
                
                {/* Right controls */}
                <div className="flex items-center gap-3.5 relative">
                  <button 
                    onClick={() => setShowModels(!showModels)}
                    className="text-[12px] font-mono text-[#888] hover:text-white cursor-pointer select-none flex items-center gap-1 bg-transparent border-0"
                  >
                    {activeModel}
                    <svg className="w-3 h-3 text-[#555]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </button>
                  
                  {showModels && (
                    <div className="absolute bottom-full right-14 mb-2 w-36 bg-[#161616] border border-[#222] rounded-xl p-1 shadow-2xl flex flex-col gap-0.5 z-30">
                      {models.map((m) => (
                        <button
                          key={m}
                          onClick={() => {
                            setActiveModel(m)
                            setShowModels(false)
                          }}
                          className={`w-full text-left px-2.5 py-1.5 text-xs rounded-lg transition-colors cursor-pointer border-0 ${
                            activeModel === m ? "bg-white/5 text-white" : "text-[#888] hover:text-white hover:bg-white/[0.02]"
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  )}

                  <button className="hover:text-white transition-colors cursor-pointer" title="Voice input">
                    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                    </svg>
                  </button>
                  
                  <button 
                    onClick={() => handleSend()}
                    disabled={!inputText.trim()}
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition cursor-pointer border-0 ${
                      inputText.trim()
                        ? "bg-white text-black hover:bg-neutral-200 shadow-md"
                        : "bg-[#222] text-[#444] cursor-not-allowed opacity-50"
                    }`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Action Pills */}
            <div className="flex flex-wrap items-center justify-center gap-2 max-w-lg">
              <button 
                onClick={() => handleQuickAction("reschedule")}
                className="px-4 py-1.5 bg-[#141414] hover:bg-[#1a1a1a] text-xs text-[#888] hover:text-white rounded-full border border-[#1e1e1e] transition-colors cursor-pointer"
              >
                Reschedule Thread
              </button>
              <button 
                onClick={() => handleQuickAction("sync")}
                className="px-4 py-1.5 bg-[#141414] hover:bg-[#1a1a1a] text-xs text-[#888] hover:text-white rounded-full border border-[#1e1e1e] transition-colors cursor-pointer"
              >
                Sync Calendar
              </button>
              <button 
                onClick={() => handleQuickAction("buffer")}
                className="px-4 py-1.5 bg-[#141414] hover:bg-[#1a1a1a] text-xs text-[#888] hover:text-white rounded-full border border-[#1e1e1e] transition-colors cursor-pointer"
              >
                Add Buffer Constraint
              </button>
            </div>
          </div>
        ) : (
          /* Active Chat Stream State */
          <div className="max-w-2xl mx-auto flex flex-col gap-6 pb-24">
            {loading ? (
              <div className="py-12 text-center text-xs text-[#555] font-mono animate-pulse">
                LOADING CHAT LOGS...
              </div>
            ) : (
              <>
                {messages.map((msg, i) => (
                  <div 
                    key={i} 
                    className={`flex flex-col gap-1.5 ${msg.role === "user" ? "items-end ml-auto max-w-[85%]" : "items-start mr-auto max-w-[85%]"}`}
                  >
                    <span className="text-[10px] font-mono uppercase text-[#444] tracking-wider">
                      {msg.role === "user" ? "You" : "Veloce"}
                    </span>
                    <div 
                      className={`p-4 text-sm leading-relaxed rounded-2xl ${
                        msg.role === "user"
                          ? "bg-[#181818] border border-[#252525] text-white"
                          : "bg-transparent text-[#dcdcdc] px-0 py-1"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
                
                {/* Streaming response */}
                {streamingMessage && (
                  <div className="flex flex-col gap-1.5 items-start mr-auto max-w-[85%]">
                    <span className="text-[10px] font-mono uppercase text-[#444] tracking-wider">
                      Veloce
                    </span>
                    <div className="p-4 text-sm leading-relaxed text-[#dcdcdc] px-0 py-1">
                      {streamingMessage}
                      <span className="inline-block w-1.5 h-3 bg-white ml-0.5 animate-pulse"></span>
                    </div>
                  </div>
                )}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Floating Bottom Input Box (Only in Active State) */}
      {(messages.length > 0 || streamingMessage) && (
        <div className="bg-gradient-to-t from-[#0d0d0d] via-[#0d0d0d] to-transparent pt-6 pb-6 px-6 relative z-10 shrink-0">
          <div className="bg-[#141414] border border-[#1e1e1e] rounded-2xl p-3 flex items-center gap-3 max-w-2xl mx-auto w-full relative shadow-2xl">
            <button className="text-[#555] hover:text-white transition-colors cursor-pointer" title="Add context">
              <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </button>
            
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message or trigger actions..."
              rows={1}
              className="flex-1 bg-transparent text-white placeholder-[#555] text-sm focus:outline-none resize-none leading-relaxed font-sans font-light"
              style={{ height: "24px" }}
            />
            
            <div className="flex items-center gap-3">
              <button className="text-[#555] hover:text-white transition-colors cursor-pointer" title="Voice input">
                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                </svg>
              </button>
              
              <button 
                onClick={() => handleSend()}
                disabled={!inputText.trim()}
                className={`w-7 h-7 rounded-full flex items-center justify-center transition cursor-pointer border-0 ${
                  inputText.trim()
                    ? "bg-white text-black hover:bg-neutral-200 shadow-md"
                    : "bg-[#222] text-[#444] cursor-not-allowed opacity-50"
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

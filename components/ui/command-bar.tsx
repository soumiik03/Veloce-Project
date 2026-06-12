"use client"

import { useState, useRef, useEffect } from "react"

interface CommandBarProps {
  onExecute: (cmd: string) => void
  onSearch: (query: string) => void
  currentMode: "ask" | "search"
  onModeChange: (mode: "ask" | "search") => void
}

const MODELS = [
  { id: "veloce-pro", name: "Veloce Pro 1.0" },
  { id: "veloce-lite", name: "Veloce Lite" },
  { id: "gpt-4o", name: "GPT-4o Workspace" },
]

const SLASH_COMMANDS = [
  { cmd: "/reschedule", desc: "Run reschedule agent on selected thread" },
  { cmd: "/draft", desc: "Draft response details on selected thread" },
  { cmd: "/connect-gmail", desc: "Re-authorize secure Gmail connection" },
  { cmd: "/connect-calendar", desc: "Re-authorize Google Calendar connection" },
  { cmd: "/buffer", desc: "Adjust meeting focus block buffer times" },
]

export default function CommandBar({
  onExecute,
  onSearch,
  currentMode,
  onModeChange,
}: CommandBarProps) {
  const [inputText, setInputText] = useState("")
  const [selectedModel, setSelectedModel] = useState(MODELS[0])
  const [showModels, setShowModels] = useState(false)
  const [showCommands, setShowCommands] = useState(false)
  const [isListening, setIsListening] = useState(false)
  
  const commandRef = useRef<HTMLDivElement>(null)

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (commandRef.current && !commandRef.current.contains(e.target as Node)) {
        setShowModels(false)
        setShowCommands(false)
      }
    }
    document.addEventListener("mousedown", handleOutsideClick)
    return () => document.removeEventListener("mousedown", handleOutsideClick)
  }, [])

  // Handle Enter press
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      triggerExecute()
    }
    // Show quick commands if typing '/'
    if (e.key === "/") {
      setShowCommands(true)
    }
  }

  const triggerExecute = () => {
    if (!inputText.trim()) return
    onExecute(inputText)
    setInputText("")
    setShowCommands(false)
  }

  const selectSlashCommand = (cmd: string) => {
    setInputText(cmd)
    setShowCommands(false)
  }

  const triggerVoiceEmulation = () => {
    setIsListening(true)
    setInputText("")
    
    // Emulate voice capture
    const phrases = ["Reschedule John's architectural sync tomorrow", "Search for emails from Alex Chen", "Check calendar slots for Friday morning"]
    const phrase = phrases[Math.floor(Math.random() * phrases.length)]
    
    let charIdx = 0
    const interval = setInterval(() => {
      if (charIdx < phrase.length) {
        setInputText((prev) => prev + phrase.charAt(charIdx))
        charIdx++
      } else {
        clearInterval(interval)
        setIsListening(false)
      }
    }, 45)
  }

  return (
    <div ref={commandRef} className="relative w-full max-w-2xl mx-auto z-40 select-none">
      
      {/* 1. SLASH COMMANDS DROP-UP */}
      {showCommands && (
        <div className="absolute bottom-full mb-3 left-0 right-0 bg-zinc-950 border border-zinc-900 rounded-xl p-2 shadow-2xl backdrop-blur-md flex flex-col gap-1 z-50">
          <div className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest px-3 py-1.5 border-b border-zinc-900 mb-1">
            Quick Actions & Commands
          </div>
          {SLASH_COMMANDS.map((sc, i) => (
            <button
              key={i}
              onClick={() => selectSlashCommand(sc.cmd)}
              className="w-full flex items-center justify-between text-left px-3 py-2 rounded-lg hover:bg-indigo-600/10 hover:text-indigo-200 group text-xs text-zinc-400 transition cursor-pointer font-mono"
            >
              <span className="text-zinc-200 group-hover:text-indigo-300 font-medium">{sc.cmd}</span>
              <span className="text-zinc-550 group-hover:text-indigo-400/80 font-sans text-[11px] font-light">{sc.desc}</span>
            </button>
          ))}
        </div>
      )}

      {/* 2. MODEL SELECTOR DROP-UP */}
      {showModels && (
        <div className="absolute bottom-full right-14 mb-3 w-48 bg-zinc-950 border border-zinc-900 rounded-xl p-1.5 shadow-2xl backdrop-blur-md flex flex-col gap-1 z-50">
          <div className="text-[9px] font-mono text-zinc-600 uppercase tracking-wider px-2.5 py-1.5 border-b border-zinc-900 mb-1">
            Operational Model
          </div>
          {MODELS.map((model) => (
            <button
              key={model.id}
              onClick={() => {
                setSelectedModel(model)
                setShowModels(false)
              }}
              className={`w-full text-left px-3 py-2 text-xs rounded-lg transition cursor-pointer font-sans ${
                selectedModel.id === model.id
                  ? "bg-indigo-600/15 text-indigo-300 font-medium"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
              }`}
            >
              {model.name}
            </button>
          ))}
        </div>
      )}

      {/* 3. THE MAIN COMMAND BAR PILL (Ref Image Style) */}
      <div className="bg-[#121411]/95 border border-zinc-800/70 rounded-2xl p-4 shadow-2xl backdrop-blur-md flex flex-col gap-3">
        
        {/* Input Text Area */}
        <textarea
          value={inputText}
          onChange={(e) => {
            setInputText(e.target.value)
            if (currentMode === "search") {
              onSearch(e.target.value)
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={
            currentMode === "search"
              ? "Search conversations or threads..."
              : isListening
              ? "Listening to voice input..."
              : "Ask a follow-up or type '/' for commands..."
          }
          rows={1}
          className="w-full bg-transparent text-zinc-150 placeholder-zinc-600 text-sm focus:outline-none resize-none min-h-[22px] leading-relaxed font-light font-sans"
        />

        {/* Action Controls Row */}
        <div className="flex items-center justify-between border-t border-zinc-900/40 pt-2.5">
          
          {/* Left Actions */}
          <div className="flex items-center gap-3.5">
            {/* Plus / Command Toggle */}
            <button
              onClick={() => setShowCommands(!showCommands)}
              className="text-zinc-500 hover:text-zinc-200 p-0.5 rounded-md hover:bg-zinc-900/50 transition cursor-pointer"
              title="Quick Commands"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </button>

            {/* Mode Selector Pill (Ref Image Style) */}
            <button
              onClick={() => {
                const newMode = currentMode === "ask" ? "search" : "ask"
                onModeChange(newMode)
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-mono transition-all duration-300 cursor-pointer ${
                currentMode === "search"
                  ? "bg-indigo-600/10 border-indigo-500/40 text-indigo-300"
                  : "bg-zinc-950/40 border-zinc-850 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.637 10.637Z" />
              </svg>
              <span>{currentMode === "search" ? "Search Active" : "Search"}</span>
              <svg className="w-2.5 h-2.5 text-zinc-550" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-4">
            
            {/* Model Selector Dropdown */}
            <button
              onClick={() => setShowModels(!showModels)}
              className="flex items-center gap-1 text-[11px] font-mono text-zinc-400 hover:text-zinc-200 cursor-pointer"
            >
              <span>{selectedModel.name}</span>
              <svg className="w-3 h-3 text-zinc-550" fill="none" stroke="currentColor" strokeWidth="2.1" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>

            {/* Voice Mic Toggle */}
            <button
              onClick={triggerVoiceEmulation}
              className={`p-0.5 rounded-full transition cursor-pointer relative ${
                isListening
                  ? "text-red-500 scale-110"
                  : "text-zinc-500 hover:text-zinc-200"
              }`}
              title="Voice input"
            >
              {isListening && (
                <span className="absolute inset-0 rounded-full bg-red-500/20 animate-ping"></span>
              )}
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
              </svg>
            </button>

            {/* Execute Send Button (Ref Image Style: circle with up arrow) */}
            <button
              onClick={triggerExecute}
              disabled={!inputText.trim()}
              className={`w-7 h-7 rounded-full flex items-center justify-center transition cursor-pointer ${
                inputText.trim()
                  ? "bg-zinc-200 hover:bg-white text-zinc-950 shadow-md active:scale-95"
                  : "bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-50"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18" />
              </svg>
            </button>

          </div>

        </div>

      </div>
    </div>
  )
}

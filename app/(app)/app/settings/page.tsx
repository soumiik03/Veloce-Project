"use client"

import { useState, useEffect, Suspense } from "react"
import { useAuth } from "@/hooks/use-auth"
import { useSearchParams } from "next/navigation"

function SettingsContent() {
  const { logout } = useAuth()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  
  
  const [connectionStatus, setConnectionStatus] = useState<{
    gmail: boolean
    googlecalendar: boolean
    connected: boolean
  }>({ gmail: false, googlecalendar: false, connected: false })

  
  const [selectedModel, setSelectedModel] = useState("veloce pro")
  const [bufferSize, setBufferSize] = useState(15)
  const [timezone, setTimezone] = useState("America/New_York")
  const [workingHoursStart, setWorkingHoursStart] = useState("09:00")
  const [workingHoursEnd, setWorkingHoursEnd] = useState("17:00")
  
  
  const [conflictAlerts, setConflictAlerts] = useState(true)
  const [dailySummary, setDailySummary] = useState(true)

  
  useEffect(() => {
    const errorParam = searchParams.get("error")
    if (errorParam) {
      setError(errorParam)
    }
  }, [searchParams])

  
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/onboarding/status")
        if (res.ok) {
          const data = await res.json()
          setConnectionStatus(data)
        }
      } catch (err) {
        console.error("Failed to fetch connection status in settings:", err)
      }
    }
    fetchStatus()
  }, [])

  const handleDisconnect = async (plugin: "gmail" | "googlecalendar") => {
    alert(`Disconnecting ${plugin}... Workspace auth will clear on reload.`)
    
    setConnectionStatus(prev => ({
      ...prev,
      [plugin]: false,
      connected: false
    }))
  }

  const handleReconnect = (plugin: "gmail" | "googlecalendar") => {
    
    window.location.href = `/api/auth/corsair/connect?plugin=${plugin}`
  }

  return (
    <div className="flex-1 flex flex-col h-screen bg-[#0d0d0d] text-[#e8e8e8] overflow-y-auto p-6 md:p-12 max-w-4xl mx-auto w-full select-none">
      
      {}
      <header className="pb-6 border-b border-[#1a1a1a] mb-8">
        <h1 className="text-2xl font-semibold text-white tracking-tight">Settings Calibration</h1>
        <p className="text-xs text-[#888] font-sans font-light mt-1.5">
          Configure external OAuth telemetry coordinates and AI agent operational constraints.
        </p>
        {error && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 font-mono">
            ⚠ Connection error: {error}
          </div>
        )}
      </header>

      {}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {}
        <div className="lg:col-span-8 space-y-8">
          
          {}
          <section className="bg-[#111] border border-[#1e1e1e] rounded-xl p-6 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-white font-mono uppercase tracking-wider">Connected Accounts</h3>
              <p className="text-[11px] text-[#666] font-sans mt-1">Manage external auth tunnels for Google Gmail & Calendar.</p>
            </div>

            <div className="space-y-3">
              {}
              <div className="p-4 bg-[#141414] border border-[#1e1e1e] rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#1e3a5f]/15 border border-[#5aa3e8]/20 flex items-center justify-center text-xs font-mono font-bold text-[#5aa3e8]">
                    M
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-white block">Gmail Connection Tunnel</span>
                    <span className="text-[10px] text-[#555] font-light block">Reads threads and writes replies</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {connectionStatus.gmail ? (
                    <>
                      <span className="text-[9px] font-mono text-green-400 bg-green-500/5 border border-green-500/10 px-2 py-0.5 rounded-full uppercase">
                        Active
                      </span>
                      <button
                        onClick={() => handleDisconnect("gmail")}
                        className="text-[10px] font-mono text-[#555] hover:text-red-400 transition-colors bg-transparent border-0 cursor-pointer"
                      >
                        Disconnect
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleReconnect("gmail")}
                      className="px-2.5 py-1 bg-white hover:bg-neutral-255 text-black text-[10px] font-mono rounded font-semibold transition-colors cursor-pointer border-0"
                    >
                      Connect
                    </button>
                  )}
                </div>
              </div>

              {}
              <div className="p-4 bg-[#141414] border border-[#1e1e1e] rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#1e3a5f]/15 border border-[#5aa3e8]/20 flex items-center justify-center text-xs font-mono font-bold text-[#5aa3e8]">
                    C
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-white block">Google Calendar Tunnel</span>
                    <span className="text-[10px] text-[#555] font-light block">Syncs schedule events and limits</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {connectionStatus.googlecalendar ? (
                    <>
                      <span className="text-[9px] font-mono text-green-400 bg-green-500/5 border border-green-500/10 px-2 py-0.5 rounded-full uppercase">
                        Active
                      </span>
                      <button
                        onClick={() => handleDisconnect("googlecalendar")}
                        className="text-[10px] font-mono text-[#555] hover:text-red-400 transition-colors bg-transparent border-0 cursor-pointer"
                      >
                        Disconnect
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleReconnect("googlecalendar")}
                      className="px-2.5 py-1 bg-white hover:bg-neutral-255 text-black text-[10px] font-mono rounded font-semibold transition-colors cursor-pointer border-0"
                    >
                      Connect
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>

          {}
          <section className="bg-[#111] border border-[#1e1e1e] rounded-xl p-6 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-white font-mono uppercase tracking-wider">AI Model Selection</h3>
              <p className="text-[11px] text-[#666] font-sans mt-1">Calibrate model parameters for the streaming co-pilot agent.</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { name: "veloce pro", desc: "Highest intelligence" },
                { name: "Haiku 1.0", desc: "Fastest response time" },
                { name: "Opus 3.0", desc: "Complex reasonings" }
              ].map((model) => (
                <button
                  key={model.name}
                  onClick={() => setSelectedModel(model.name)}
                  className={`p-3 bg-[#141414] hover:bg-[#1a1a1a] border rounded-lg text-left transition-all cursor-pointer ${
                    selectedModel === model.name ? "border-[#5aa3e8]/50 ring-1 ring-[#5aa3e8]/20" : "border-[#1e1e1e]"
                  }`}
                >
                  <span className="text-xs font-semibold text-white block">{model.name}</span>
                  <span className="text-[9px] text-[#555] font-light mt-0.5 block">{model.desc}</span>
                </button>
              ))}
            </div>
          </section>

          {}
          <section className="bg-[#111] border border-[#1e1e1e] rounded-xl p-6 space-y-5">
            <div>
              <h3 className="text-sm font-semibold text-white font-mono uppercase tracking-wider">Meeting Preferences</h3>
              <p className="text-[11px] text-[#666] font-sans mt-1">Define focus constraints for scheduler routing.</p>
            </div>

            <div className="space-y-4 text-xs">
              {}
              <div className="flex items-center justify-between">
                <span className="text-[#aaa]">Meeting Buffer Size:</span>
                <select
                  value={bufferSize}
                  onChange={(e) => setBufferSize(parseInt(e.target.value))}
                  className="bg-[#141414] border border-[#1e1e1e] text-white rounded px-2.5 py-1 focus:outline-none"
                >
                  <option value={0}>No buffer</option>
                  <option value={5}>5 minutes</option>
                  <option value={10}>10 minutes</option>
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                </select>
              </div>

              {}
              <div className="flex items-center justify-between">
                <span className="text-[#aaa]">Working Hours Range:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={workingHoursStart}
                    onChange={(e) => setWorkingHoursStart(e.target.value)}
                    className="bg-[#141414] border border-[#1e1e1e] text-white rounded px-2.5 py-1 focus:outline-none text-[11px]"
                  />
                  <span className="text-[#555] font-mono">to</span>
                  <input
                    type="time"
                    value={workingHoursEnd}
                    onChange={(e) => setWorkingHoursEnd(e.target.value)}
                    className="bg-[#141414] border border-[#1e1e1e] text-white rounded px-2.5 py-1 focus:outline-none text-[11px]"
                  />
                </div>
              </div>

              {}
              <div className="flex items-center justify-between">
                <span className="text-[#aaa]">Default Timezone:</span>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="bg-[#141414] border border-[#1e1e1e] text-white rounded px-2.5 py-1 focus:outline-none"
                >
                  <option value="America/New_York">Eastern Time (EST/EDT)</option>
                  <option value="America/Chicago">Central Time (CST/CDT)</option>
                  <option value="America/Denver">Mountain Time (MST/MDT)</option>
                  <option value="America/Los_Angeles">Pacific Time (PST/PDT)</option>
                  <option value="UTC">Coordinated Universal Time (UTC)</option>
                </select>
              </div>
            </div>
          </section>

        </div>

        {}
        <div className="lg:col-span-4 space-y-6">
          
          {}
          <section className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5 space-y-4">
            <span className="text-[10px] font-mono text-[#888] uppercase tracking-wider block font-bold border-b border-[#1e1e1e]/40 pb-2">
              Notification System
            </span>
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#aaa]">Conflict Alerts</span>
                <button
                  onClick={() => setConflictAlerts(!conflictAlerts)}
                  className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer border-0 ${
                    conflictAlerts ? "bg-[#5aa3e8]" : "bg-[#222]"
                  }`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full transition-transform ${conflictAlerts ? "translate-x-4" : "translate-x-0"}`} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#aaa]">Daily Summaries</span>
                <button
                  onClick={() => setDailySummary(!dailySummary)}
                  className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer border-0 ${
                    dailySummary ? "bg-[#5aa3e8]" : "bg-[#222]"
                  }`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full transition-transform ${dailySummary ? "translate-x-4" : "translate-x-0"}`} />
                </button>
              </div>
            </div>
          </section>

          {}
          <section className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5 space-y-3">
            <span className="text-[10px] font-mono text-[#888] uppercase tracking-wider block font-bold border-b border-[#1e1e1e]/40 pb-2">
              Keyboard Shortcuts
            </span>
            <div className="space-y-2 text-[11px] font-mono text-[#777]">
              <div className="flex justify-between">
                <span>NEW CHAT:</span>
                <span className="text-[#888] bg-[#1a1a1a] px-1 py-0.5 rounded">⌘ N</span>
              </div>
              <div className="flex justify-between">
                <span>COMPOSE EMAIL:</span>
                <span className="text-[#888] bg-[#1a1a1a] px-1 py-0.5 rounded">⌘ M</span>
              </div>
              <div className="flex justify-between">
                <span>SYNC TELEMETRY:</span>
                <span className="text-[#888] bg-[#1a1a1a] px-1 py-0.5 rounded">⌘ R</span>
              </div>
              <div className="flex justify-between">
                <span>SETTINGS SHIFT:</span>
                <span className="text-[#888] bg-[#1a1a1a] px-1 py-0.5 rounded">⌘ ,</span>
              </div>
            </div>
          </section>

          {}
          <section className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5">
            <button
              onClick={logout}
              className="w-full py-2.5 bg-red-950/20 hover:bg-red-950/40 text-red-400 border border-red-900/20 hover:border-red-900/40 text-xs font-semibold rounded-lg transition-all cursor-pointer"
            >
              Sign out of Veloce
            </button>
          </section>

        </div>

      </div>

    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-1 items-center justify-center bg-[#0d0d0d] text-[#888888] font-mono text-[13px] h-screen select-none">
        <span>RETRIEVING SETTINGS PROFILE...</span>
      </div>
    }>
      <SettingsContent />
    </Suspense>
  )
}


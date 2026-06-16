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

  
  const [morningBriefingEnabled, setMorningBriefingEnabled] = useState(true)
  const [triggeringBriefing, setTriggeringBriefing] = useState(false)

  
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
    const fetchBriefingStatus = async () => {
      try {
        const res = await fetch("/api/settings/morning-briefing", { credentials: "include" })
        if (res.ok) {
          const data = await res.json()
          setMorningBriefingEnabled(data.morningBriefingEnabled)
        }
      } catch (err) {
        console.error("Failed to fetch briefing status:", err)
      }
    }
    fetchStatus()
    fetchBriefingStatus()
  }, [])

  const handleToggleMorningBriefing = async () => {
    const nextVal = !morningBriefingEnabled
    setMorningBriefingEnabled(nextVal)
    try {
      await fetch("/api/settings/morning-briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ morningBriefingEnabled: nextVal })
      })
    } catch (err) {
      console.error("Failed to toggle morning briefing:", err)
    }
  }

  const handleTriggerBriefingTest = async () => {
    setTriggeringBriefing(true)
    try {
      const res = await fetch("/api/morning-briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include"
      })
      if (res.ok) {
        const data = await res.json()
        if (data.emailSent) {
          alert("⚡ Morning Briefing generated and sent successfully to your email!")
        } else {
          alert("Briefing generated but failed to send email. Check Google API keys.")
        }
      } else {
        alert("Failed to generate morning briefing.")
      }
    } catch (err) {
      console.error(err)
      alert("Error generating morning briefing.")
    } finally {
      setTriggeringBriefing(false)
    }
  }

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
        <div className="lg:col-span-7 space-y-8">
          
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

        </div>

        {}
        <div className="lg:col-span-5 space-y-6">
          
          {}
          <section className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5 space-y-4">
            <span className="text-[10px] font-mono text-[#888] uppercase tracking-wider block font-bold border-b border-[#1e1e1e]/40 pb-2">
              Notification System
            </span>
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[#aaa] block font-mono">Morning Briefing</span>
                  <span className="text-[9px] text-[#555] block">30-sec digest sent at 8 AM IST</span>
                </div>
                <button
                  onClick={handleToggleMorningBriefing}
                  className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer border-0 ${
                    morningBriefingEnabled ? "bg-[#5aa3e8]" : "bg-[#222]"
                  }`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full transition-transform ${morningBriefingEnabled ? "translate-x-4" : "translate-x-0"}`} />
                </button>
              </div>

              <div className="flex items-center justify-between border-t border-[#1e1e1e]/40 pt-3 mt-1">
                <div>
                  <span className="text-[#aaa] block font-mono">Test Briefing</span>
                  <span className="text-[9px] text-[#555] block">Send one to your email now</span>
                </div>
                <button
                  onClick={handleTriggerBriefingTest}
                  disabled={triggeringBriefing}
                  className="px-2.5 py-1 bg-[#5aa3e8]/10 hover:bg-[#5aa3e8]/20 border border-[#5aa3e8]/20 text-[#5aa3e8] text-[10px] font-mono rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {triggeringBriefing ? "Wait..." : "Send"}
                </button>
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


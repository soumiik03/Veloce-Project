"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"

export default function OnboardingPage() {
  const router = useRouter()
  const [gmailConnected, setGmailConnected] = useState(false)
  const [calendarConnected, setCalendarConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/onboarding/status")
      if (res.status === 401) {
        setLoading(false)
        return
      }
      if (res.ok) {
        const data = await res.json()
        setGmailConnected(data.gmail)
        setCalendarConnected(data.googlecalendar)

        // The middleware should prevent us from even seeing this page if both are connected,
        // but just in case we land here and they are connected, redirect.
        if (data.gmail && data.googlecalendar) {
          router.push("/app/chat")
        }
      }
    } catch (err) {
      console.error("Failed to check Google connection status:", err)
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    checkStatus()
  }, [checkStatus])

  const handleConnect = () => {
    setConnecting(true)
    // Redirect to the combined Google OAuth consent flow
    window.location.href = "/api/auth/google"
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-[#050505] text-[#888888] font-mono text-[13px] h-screen select-none">
        <div className="flex flex-col items-center gap-3">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse"></span>
          <span>RETRIEVING CONNECTION PROFILE...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 min-h-screen bg-[#050505] relative overflow-hidden select-none">
      {/* Background glow */}
      <div className="pointer-events-none absolute w-[400px] h-[400px] rounded-full bg-indigo-500/5 blur-[100px] -z-10 animate-pulse"></div>

      <div className="text-center mb-12 max-w-lg">
        <h1 className="text-3xl font-bold text-white tracking-tight uppercase font-sans mb-3 bg-gradient-to-r from-white via-neutral-200 to-neutral-400 bg-clip-text text-transparent">
          Connect Gmail & Calendar
        </h1>
        <p className="text-xs text-neutral-400 font-light leading-relaxed">
          Veloce reads incoming schedule signals, checks calendar conflicts, and drafts replies. 
          Grant permissions below via secure Google OAuth.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl mb-10">
        {/* Gmail Card */}
        <div className={`p-6 border rounded-2xl flex flex-col justify-between h-[220px] transition-all duration-300 relative overflow-hidden ${
          gmailConnected 
            ? "bg-emerald-950/10 border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.02)]" 
            : "bg-[#0d0d0d] border-white/5 hover:border-white/10"
        }`}>
          {gmailConnected && (
            <div className="absolute top-3 right-3 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </div>
          )}
          <div>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-mono text-sm font-bold mb-4">
              M
            </div>
            <h3 className="text-lg font-medium text-white mb-2">Gmail Connection</h3>
            <p className="text-[11px] text-neutral-450 font-light leading-relaxed">
              Allows Veloce to read scheduling requests and save reply drafts in your inbox.
            </p>
          </div>
          <div className="flex items-center justify-between mt-4">
            <span className={`text-[10px] font-mono tracking-wider ${gmailConnected ? "text-emerald-400" : "text-neutral-500"}`}>
              {gmailConnected ? "STATUS: ACTIVE" : "STATUS: DISCONNECTED"}
            </span>
          </div>
        </div>

        {/* Calendar Card */}
        <div className={`p-6 border rounded-2xl flex flex-col justify-between h-[220px] transition-all duration-300 relative overflow-hidden ${
          calendarConnected 
            ? "bg-emerald-950/10 border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.02)]" 
            : "bg-[#0d0d0d] border-white/5 hover:border-white/10"
        }`}>
          {calendarConnected && (
            <div className="absolute top-3 right-3 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </div>
          )}
          <div>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-mono text-sm font-bold mb-4">
              C
            </div>
            <h3 className="text-lg font-medium text-white mb-2">Calendar Connection</h3>
            <p className="text-[11px] text-neutral-450 font-light leading-relaxed">
              Allows Veloce to check event density, resolve conflicts, and stage updates.
            </p>
          </div>
          <div className="flex items-center justify-between mt-4">
            <span className={`text-[10px] font-mono tracking-wider ${calendarConnected ? "text-emerald-400" : "text-neutral-500"}`}>
              {calendarConnected ? "STATUS: ACTIVE" : "STATUS: DISCONNECTED"}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-4 w-full max-w-xs">
        <button
          onClick={handleConnect}
          disabled={connecting || (gmailConnected && calendarConnected)}
          className="w-full h-12 rounded-xl bg-white text-black font-semibold text-xs tracking-wider uppercase hover:bg-neutral-200 disabled:opacity-50 transition-all duration-200 shadow-lg cursor-pointer flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
        >
          {connecting ? (
            <span>AUTHORIZING WORKSPACE...</span>
          ) : gmailConnected || calendarConnected ? (
            <span>CONNECT REMAINING SERVICES</span>
          ) : (
            <span>CONNECT GOOGLE WORKSPACE</span>
          )}
        </button>

        <button
          onClick={() => router.push("/app/chat")}
          className="text-[10.5px] font-mono text-neutral-500 hover:text-white underline cursor-pointer transition-colors"
        >
          Bypass to Console
        </button>
      </div>
    </div>
  )
}

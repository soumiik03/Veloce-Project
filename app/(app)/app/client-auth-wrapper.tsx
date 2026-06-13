"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { ConnectionGate } from "@/components/features/auth/ConnectionGate"

export function ClientAuthWrapper({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const [mounted, setMounted] = useState(false)
  
  // Connection states
  const [connectionStatus, setConnectionStatus] = useState<{
    gmail: boolean
    googlecalendar: boolean
    connected: boolean
  } | null>(null)
  const [checkingConnection, setCheckingConnection] = useState(true)
  const [bypassConnection, setBypassConnection] = useState(false)
  const [connectingPlugin, setConnectingPlugin] = useState<string | null>(null)

  // Set mounted
  useEffect(() => {
    setMounted(true)
  }, [])

  // Poll connection status
  useEffect(() => {
    if (!mounted) return
    let active = true
    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/auth/corsair/status")
        if (res.ok) {
          const data = await res.json()
          if (active) {
            setConnectionStatus(data)
            if (data.connected) {
              setBypassConnection(true)
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch connection status:", err)
      } finally {
        if (active) {
          setCheckingConnection(false)
        }
      }
    }

    fetchStatus()
    return () => {
      active = false
    }
  }, [mounted])

  // Check auth and redirect if needed
  useEffect(() => {
    if (!mounted) return
    const isAuth = document.cookie.split("; ").some(row => {
      const trimmed = row.trim()
      return trimmed.startsWith("veloce_logged_in=") || trimmed.includes("session-token=") || trimmed.startsWith("accessToken=")
    })
    if (!isAuth && !authLoading) {
      window.location.href = "/"
    }
  }, [authLoading, mounted])

  const handleConnect = async (plugin: "gmail" | "googlecalendar") => {
    setConnectingPlugin(plugin)
    try {
      const res = await fetch(`/api/auth/corsair/connect?plugin=${plugin}`)
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        alert("Failed to generate connect link")
        setConnectingPlugin(null)
      }
    } catch (err) {
      console.error(err)
      alert("Error starting OAuth flow")
      setConnectingPlugin(null)
    }
  }

  // 1. If we are on the server (pre-hydration / static validation pass), return children directly
  if (!mounted) {
    return <>{children}</>
  }

  // 2. Client-side loading check
  if (authLoading || checkingConnection) {
    return (
      <div className="flex flex-1 items-center justify-center bg-[#0d0d0d] text-[#888888] font-mono text-[13px] h-screen select-none">
        <div className="flex flex-col items-center gap-3">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#e8e8e8] animate-pulse"></span>
          <span>ESTABLISHING SECURE CONNECTIONS...</span>
        </div>
      </div>
    )
  }

  // 3. Client-side Connection Gate check
  const isOnboarding = typeof window !== "undefined" && window.location.pathname === "/app/onboarding"
  if (connectionStatus && !connectionStatus.connected && !bypassConnection && !isOnboarding) {
    return (
      <ConnectionGate
        status={connectionStatus}
        onConnect={handleConnect}
        onBypass={() => setBypassConnection(true)}
        connectingPlugin={connectingPlugin}
      />
    )
  }

  return <>{children}</>
}

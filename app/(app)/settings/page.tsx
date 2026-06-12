"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StatusBadge } from "@/components/ui/status-badge"

export default function SettingsPage() {
  const [googleConnected, setGoogleConnected] = useState(true)
  const [autoDraft, setAutoDraft] = useState(true)
  const [conflictScan, setConflictScan] = useState(true)
  const [notificationEmail, setNotificationEmail] = useState("")

  useEffect(() => {
    setNotificationEmail("soumik@example.com")
  }, [])

  return (
    <div className="flex-1 flex flex-col gap-6 relative max-w-4xl mx-auto">
      <header className="pb-4 border-b border-zinc-900">
        <h1 className="text-2xl font-light text-zinc-100 tracking-tight">Console Settings</h1>
        <p className="text-xs text-zinc-500 font-light mt-1">Configure your AI agent connections and calendar settings</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <h3 className="text-lg font-light text-white mb-2 font-sans">Connected Services</h3>
            <p className="text-xs text-zinc-400 font-light mb-6">
              Connect your external workspace accounts to authorize Veloce to read threads and draft proposals.
            </p>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-[#151912] border border-zinc-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-mono text-xs">
                    G
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-zinc-200">Google Workspace</h4>
                    <p className="text-[10px] text-zinc-500 font-light">Gmail threads & Calendar events access</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {googleConnected ? (
                    <>
                      <StatusBadge type="success" pulse>
                        CONNECTED
                      </StatusBadge>
                      <button
                        onClick={() => setGoogleConnected(false)}
                        className="text-[11px] font-mono text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
                      >
                        Disconnect
                      </button>
                    </>
                  ) : (
                    <Button
                      onClick={() => setGoogleConnected(true)}
                      className="py-1.5 px-3"
                    >
                      Connect Account
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="text-lg font-light text-white mb-2 font-sans">Agent Configuration</h3>
            <p className="text-xs text-zinc-400 font-light mb-6">
              Calibrate operational boundaries for automation and conflict scoping.
            </p>

            <div className="space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="text-xs font-semibold text-zinc-200">Autopilot Response Drafting</h4>
                  <p className="text-[11px] text-zinc-500 font-light leading-relaxed mt-0.5">
                    Automatically draft responses in Gmail when a scheduling conflict or reschedule request is parsed.
                  </p>
                </div>
                <button
                  onClick={() => setAutoDraft(!autoDraft)}
                  className={`w-10 h-6 rounded-full p-1 transition-colors cursor-pointer ${
                    autoDraft ? "bg-indigo-600" : "bg-zinc-800"
                  }`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full transition-transform ${autoDraft ? "translate-x-4" : "translate-x-0"}`} />
                </button>
              </div>

              <div className="flex items-start justify-between gap-4 border-t border-zinc-900/60 pt-6">
                <div>
                  <h4 className="text-xs font-semibold text-zinc-200">Continuous Conflict Monitoring</h4>
                  <p className="text-[11px] text-zinc-500 font-light leading-relaxed mt-0.5">
                    Scan your calendar availability in real-time to recommend open slots dynamically.
                  </p>
                </div>
                <button
                  onClick={() => setConflictScan(!conflictScan)}
                  className={`w-10 h-6 rounded-full p-1 transition-colors cursor-pointer ${
                    conflictScan ? "bg-indigo-600" : "bg-zinc-800"
                  }`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full transition-transform ${conflictScan ? "translate-x-4" : "translate-x-0"}`} />
                </button>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-white mb-3">Notification Matrix</h3>
            <div className="space-y-4">
              <Input
                label="Alert Email Address"
                type="email"
                value={notificationEmail}
                onChange={(e) => setNotificationEmail(e.target.value)}
              />

              <div className="pt-2">
                <Button
                  onClick={() => alert("Notification settings saved")}
                  className="w-full"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-semibold text-white mb-3">Workspace Health</h3>
            <div className="space-y-2 text-[11px] font-mono text-zinc-400">
              <div className="flex justify-between">
                <span>API STATUS:</span>
                <StatusBadge type="success">OPERATIONAL</StatusBadge>
              </div>
              <div className="flex justify-between">
                <span>DB SYNC:</span>
                <StatusBadge type="success">NOMINAL</StatusBadge>
              </div>
              <div className="flex justify-between">
                <span>LATENCY:</span>
                <span className="text-zinc-500">12ms</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

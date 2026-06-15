import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface StepperWizardProps {
  onComplete: () => void
}

export function StepperWizard({ onComplete }: StepperWizardProps) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [gmailConnected, setGmailConnected] = useState(false)
  const [calendarConnected, setCalendarConnected] = useState(false)
  const [timezone, setTimezone] = useState("UTC-5 (EST)")
  const [buffer, setBuffer] = useState("15")
  const [skipped, setSkipped] = useState(false)

  // Status check & polling
  useEffect(() => {
    let active = true
    const checkStatus = async () => {
      try {
        const res = await fetch("/api/onboarding/status")
        if (!res.ok) return
        const data = await res.json()
        if (active) {
          setGmailConnected(data.gmail)
          setCalendarConnected(data.googlecalendar)
        }
      } catch (err) {
        console.error("Failed to fetch connection status:", err)
      }
    }

    checkStatus()

    const interval = setInterval(() => {
      if (!gmailConnected || !calendarConnected) {
        checkStatus()
      }
    }, 3000)

    return () => {
      active = false
      clearInterval(interval)
    }
  }, [gmailConnected, calendarConnected])

  const handleConnect = (plugin: "gmail" | "googlecalendar") => {
    setLoading(true)
    window.location.href = `/api/auth/corsair/connect?plugin=${plugin}`
  }

  const handleNext = async () => {
    if (step === 3) {
      setLoading(true)
      try {
        await fetch("/api/auth/corsair/complete", { method: "POST" })
      } catch (err) {
        console.error("Failed to mark onboarding complete:", err)
      }
      onComplete()
      return
    }
    setLoading(true)
    setTimeout(() => {
      setStep(prev => prev + 1)
      setLoading(false)
    }, 1000)
  }

  const canProceed = step !== 1 || gmailConnected || calendarConnected || skipped

  return (
    <Card className="w-full max-w-xl p-8 relative overflow-hidden backdrop-blur-md">
      <div className="flex justify-between items-center mb-8 border-b border-zinc-900 pb-4">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center font-mono text-xs border ${
                step === s
                  ? "bg-indigo-600/10 border-indigo-500 text-indigo-300 font-bold"
                  : step > s
                  ? "bg-green-500/10 border-green-500/40 text-green-400"
                  : "bg-zinc-900 border-zinc-800 text-zinc-650"
              }`}
            >
              {s}
            </div>
            <span
              className={`text-[10px] font-mono uppercase tracking-wider hidden sm:inline ${
                step === s ? "text-zinc-200 font-medium" : "text-zinc-500"
              }`}
            >
              {s === 1 ? "Integrations" : s === 2 ? "Calibrations" : "Telemetry"}
            </span>
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-6 min-h-[180px]">
          <div>
            <h3 className="text-base font-medium text-zinc-100">Step 1: Workspace Authorization</h3>
            <p className="text-xs text-zinc-400 font-light mt-1.5 leading-relaxed">
              Veloce connects securely to Gmail and Calendar. Link your accounts below via Corsair OAuth.
            </p>
          </div>

          <div className="space-y-3">
            {/* Gmail Connector */}
            <div className="flex items-center justify-between p-4 bg-[#151912]/20 border border-zinc-800 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-indigo-500/10 border border-indigo-500/20 rounded-lg flex items-center justify-center text-indigo-400 font-mono text-xs font-bold">
                  M
                </div>
                <div className="text-left">
                  <span className="text-xs font-semibold text-zinc-300 block">Gmail Plugin</span>
                  <span className="text-[10px] text-zinc-500 font-light">Drafting and sending email replies</span>
                </div>
              </div>
              {gmailConnected ? (
                <span className="text-[9px] font-mono text-green-400 border border-green-500/20 px-2 py-0.5 bg-green-500/10 rounded">
                  CONNECTED
                </span>
              ) : (
                <Button
                  onClick={() => handleConnect("gmail")}
                  disabled={loading}
                  className="text-[10px] py-1 h-auto font-mono"
                >
                  CONNECT
                </Button>
              )}
            </div>

            {/* Calendar Connector */}
            <div className="flex items-center justify-between p-4 bg-[#151912]/20 border border-zinc-800 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-indigo-500/10 border border-indigo-500/20 rounded-lg flex items-center justify-center text-indigo-400 font-mono text-xs font-bold">
                  C
                </div>
                <div className="text-left">
                  <span className="text-xs font-semibold text-zinc-300 block">Google Calendar</span>
                  <span className="text-[10px] text-zinc-500 font-light">Reading and updating schedules</span>
                </div>
              </div>
              {calendarConnected ? (
                <span className="text-[9px] font-mono text-green-400 border border-green-500/20 px-2 py-0.5 bg-green-500/10 rounded">
                  CONNECTED
                </span>
              ) : (
                <Button
                  onClick={() => handleConnect("googlecalendar")}
                  disabled={loading}
                  className="text-[10px] py-1 h-auto font-mono"
                >
                  CONNECT
                </Button>
              )}
            </div>
          </div>

          {!gmailConnected || !calendarConnected ? (
            <div className="text-right">
              <button
                type="button"
                onClick={() => setSkipped(true)}
                className="text-[10px] text-zinc-500 hover:text-rose-450 transition-colors font-mono underline cursor-pointer"
              >
                Skip integrations (Not Recommended)
              </button>
            </div>
          ) : null}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6 min-h-[180px]">
          <div>
            <h3 className="text-base font-medium text-zinc-100">Step 2: Scoping Constraints</h3>
            <p className="text-xs text-zinc-400 font-light mt-1.5 leading-relaxed">
              Define your timezone parameters and minimum slot buffer constraints.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 text-left">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono text-zinc-500 uppercase">Operational Timezone</label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full bg-[#151912]/40 border border-zinc-800 rounded-lg px-3 py-2.5 text-xs text-zinc-300 focus:outline-none"
              >
                <option value="UTC-5 (EST)">UTC-5 (EST)</option>
                <option value="UTC+0 (GMT)">UTC+0 (GMT)</option>
                <option value="UTC+5:30 (IST)">UTC+5:30 (IST)</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono text-zinc-500 uppercase">Conflict Buffer (Min)</label>
              <select
                value={buffer}
                onChange={(e) => setBuffer(e.target.value)}
                className="w-full bg-[#151912]/40 border border-zinc-800 rounded-lg px-3 py-2.5 text-xs text-zinc-300 focus:outline-none"
              >
                <option value="15">15 Minutes</option>
                <option value="30">30 Minutes</option>
                <option value="0">No Buffer</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6 min-h-[180px]">
          <div>
            <h3 className="text-base font-medium text-zinc-100">Step 3: Intent Calibration</h3>
            <p className="text-xs text-zinc-400 font-light mt-1.5 leading-relaxed">
              Verify database syncing and test connectivity logs.
            </p>
          </div>
          <div className="bg-[#151912]/30 border border-zinc-800 rounded-lg p-3 text-left font-mono text-[10px] text-zinc-400 space-y-1">
            <div className="text-zinc-500">[SYSTEM] Launching engine sync...</div>
            <div className="text-indigo-400">[INFO] Synced accounts successfully.</div>
            <div className="text-green-400">[SUCCESS] Calibration completed. Ready.</div>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2.5 mt-8 border-t border-zinc-900 pt-4">
        <Button
          variant="secondary"
          onClick={() => setStep(prev => Math.max(1, prev - 1))}
          disabled={step === 1 || loading}
          className="cursor-pointer"
        >
          Back
        </Button>
        <Button
          onClick={handleNext}
          disabled={!canProceed}
          loading={loading}
          className="cursor-pointer"
        >
          {step === 3 ? "Complete" : "Proceed"}
        </Button>
      </div>
    </Card>
  )
}

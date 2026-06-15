"use client"

import { useState, useEffect } from "react"

const STEPS = [
  {
    title: "1. Inbox Intercept",
    description: "Detects scheduling requests and conflicting dates directly from emails.",
  },
  {
    title: "2. Calendar Search",
    description: "Queries Google Calendar to check availability, travel times, and custom buffers.",
  },
  {
    title: "3. Smart Suggestion",
    description: "Selects the optimal open slot matching all parties' calendars.",
  },
  {
    title: "4. Auto-draft & Sync",
    description: "Updates the event instantly and drafts an elegant email confirmation reply.",
  },
]

export default function ProductMockup() {
  const [activeStep, setActiveStep] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)

  useEffect(() => {
    if (!isPlaying) return

    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % STEPS.length)
    }, 4500)

    return () => clearInterval(interval)
  }, [isPlaying])

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch relative">
      {}
      <div className="lg:col-span-4 flex flex-col justify-between gap-6 py-2">
        <div className="flex flex-col gap-6">
          <div>
            <span className="text-[10px] font-mono tracking-widest text-indigo-400 uppercase font-semibold border border-indigo-500/25 px-2 py-0.5 rounded bg-indigo-500/5">
              Live Pipeline Simulation
            </span>
            <h3 className="text-2xl font-light text-zinc-100 mt-4 tracking-tight">
              Zero latency coordination.
            </h3>
            <p className="text-sm text-zinc-400 mt-2 font-light">
              See how Veloce processes reschedule requests in the background, keeping you completely out of the loop.
            </p>
          </div>

          <div className="flex flex-col gap-2.5">
            {STEPS.map((step, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setActiveStep(idx)
                  setIsPlaying(false)
                }}
                className={`text-left p-4 rounded-xl border transition-all duration-300 flex flex-col gap-1.5 group cursor-pointer ${
                  activeStep === idx
                    ? "bg-[#0b1022]/60 border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.1)] translate-x-1"
                    : "bg-transparent border-transparent hover:bg-[#080d1f]/40 hover:border-indigo-500/10 text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <span
                  className={`text-xs font-mono font-medium tracking-tight ${
                    activeStep === idx ? "text-indigo-400" : "text-zinc-500 group-hover:text-zinc-400"
                  }`}
                >
                  {step.title}
                </span>
                <span className="text-xs font-light leading-relaxed">
                  {step.description}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex items-center gap-2 text-xs font-mono text-zinc-400 hover:text-indigo-300 border border-indigo-500/10 rounded-full px-4 py-1.5 bg-[#080c1a]/40 hover:bg-[#0c1229]/60 transition cursor-pointer"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isPlaying ? "bg-indigo-400 animate-pulse" : "bg-zinc-650"}`}></span>
            {isPlaying ? "PAUSE SIMULATION" : "RESUME AUTO-PLAY"}
          </button>
        </div>
      </div>

      {}
      <div className="lg:col-span-8 bg-[#090d1c]/45 border border-indigo-500/15 rounded-2xl p-6 flex flex-col justify-between min-h-[480px] shadow-2xl relative overflow-hidden backdrop-blur-md">
        {}
        <div className="absolute inset-0 grid grid-cols-12 pointer-events-none opacity-20">
          {Array.from({ length: 11 }).map((_, i) => (
            <div key={i} className="h-full border-r border-indigo-500/5 col-span-1"></div>
          ))}
        </div>

        {}
        <div className="relative z-10 flex items-center justify-between border-b border-indigo-500/10 pb-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500/20"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500/20"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500/20"></span>
            <span className="text-xs text-indigo-400/70 font-mono ml-2">veloce-agent-sync-v1.0</span>
          </div>
          <div className="text-[10px] text-indigo-400 font-mono tracking-wider flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
            LISTENING
          </div>
        </div>

        {}
        <div className="relative z-10 my-8 flex-1 flex flex-col justify-center">
          
          {}
          <div className={`transition-all duration-500 flex flex-col gap-4 ${activeStep === 0 ? "opacity-100 scale-100" : "opacity-0 scale-95 hidden pointer-events-none"}`}>
            <div className="bg-[#0b1022]/70 border border-indigo-500/20 rounded-xl p-5 shadow-lg max-w-xl mx-auto w-full backdrop-blur-sm">
              <div className="flex items-center justify-between mb-4 border-b border-indigo-500/10 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-xs font-semibold text-indigo-300">
                    AC
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-zinc-200">Alex Chen</div>
                    <div className="text-[10px] text-zinc-500">alex.chen@innovate.co</div>
                  </div>
                </div>
                <div className="text-[10px] text-zinc-500 font-mono">14:02 PM</div>
              </div>
              <div className="text-xs text-indigo-300 font-mono mb-2">Subject: Re: Core System Review Sync</div>
              <p className="text-xs text-zinc-300 leading-relaxed font-light">
                Hey Soumik, I have a sudden schedule conflict tomorrow at 2:00 PM. Could we push our weekly sync to Friday instead? I'm completely open anytime <span className="bg-indigo-500/20 text-indigo-200 border border-indigo-500/30 px-1 py-0.5 rounded font-mono">between 10 AM and 1 PM</span>.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 animate-bounce mt-2 text-indigo-400 text-xs font-mono">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
              </svg>
              Gmail Event Intercepted (Analyzing Intent)
            </div>
          </div>

          {}
          <div className={`transition-all duration-500 flex flex-col gap-4 ${activeStep === 1 ? "opacity-100 scale-100" : "opacity-0 scale-95 hidden pointer-events-none"}`}>
            <div className="bg-[#0b1022]/70 border border-indigo-500/20 rounded-xl p-5 shadow-lg max-w-xl mx-auto w-full backdrop-blur-sm">
              <div className="text-xs font-semibold text-zinc-200 mb-3 flex justify-between items-center border-b border-indigo-500/10 pb-2">
                <span>Google Calendar Sync — Friday Agenda</span>
                <span className="text-[10px] font-mono text-indigo-400/80">Querying: Friday, 10:00 - 13:00</span>
              </div>
              
              <div className="space-y-2.5">
                <div className="flex items-stretch gap-3 border border-indigo-500/10 rounded-lg p-2.5 bg-indigo-950/5">
                  <div className="w-1.5 bg-amber-500/70 rounded"></div>
                  <div className="flex-1 flex justify-between items-center text-xs">
                    <div>
                      <div className="font-medium text-zinc-300">10:00 AM - 11:00 AM</div>
                      <div className="text-zinc-500">Sprint Retrospective (Recurring)</div>
                    </div>
                    <span className="text-[10px] font-mono text-amber-400 bg-amber-400/5 px-2 py-0.5 rounded border border-amber-500/20">CONFLICT</span>
                  </div>
                </div>

                <div className="flex items-stretch gap-3 border border-indigo-500/30 rounded-lg p-2.5 bg-indigo-950/15">
                  <div className="w-1.5 bg-indigo-500 rounded"></div>
                  <div className="flex-1 flex justify-between items-center text-xs">
                    <div>
                      <div className="font-semibold text-indigo-300">11:00 AM - 12:00 PM</div>
                      <div className="text-indigo-400/80 font-light">Available slot (Safe buffer verified)</div>
                    </div>
                    <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">OPTIMAL</span>
                  </div>
                </div>

                <div className="flex items-stretch gap-3 border border-indigo-500/10 rounded-lg p-2.5 bg-indigo-950/5 opacity-60">
                  <div className="w-1.5 bg-zinc-600 rounded"></div>
                  <div className="flex-1 flex justify-between items-center text-xs">
                    <div>
                      <div className="font-medium text-zinc-400">12:00 PM - 01:00 PM</div>
                      <div className="text-zinc-500">Lunch Block (Buffer lock active)</div>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded">BUFFERED</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {}
          <div className={`transition-all duration-500 flex flex-col gap-4 ${activeStep === 2 ? "opacity-100 scale-100" : "opacity-0 scale-95 hidden pointer-events-none"}`}>
            <div className="bg-[#0b1022]/70 border border-indigo-500/20 rounded-xl p-5 shadow-lg max-w-xl mx-auto w-full flex flex-col gap-4 backdrop-blur-sm">
              <div className="text-xs font-semibold text-zinc-200 border-b border-indigo-500/10 pb-2 flex justify-between items-center">
                <span>Veloce Optimization Report</span>
                <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">Proposal Active</span>
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-[#040817] border border-indigo-500/10 rounded-lg p-3">
                  <div className="text-zinc-500 text-[10px] uppercase tracking-wider mb-1 font-mono">Original Event</div>
                  <div className="text-zinc-300 font-medium">Core System Sync</div>
                  <div className="text-zinc-500 text-[11px] mt-0.5">Thursday @ 2:00 PM</div>
                </div>

                <div className="bg-indigo-950/10 border border-indigo-500/20 rounded-lg p-3">
                  <div className="text-indigo-400 text-[10px] uppercase tracking-wider mb-1 font-mono">New Propose Slot</div>
                  <div className="text-zinc-100 font-semibold">Friday @ 11:00 AM</div>
                  <div className="text-indigo-300/80 text-[11px] mt-0.5">Conflict-free window</div>
                </div>
              </div>

              <div className="border border-indigo-500/10 rounded-lg p-3 bg-[#040817] text-[11px] leading-relaxed text-zinc-400 font-mono">
                <div className="text-indigo-400 mb-1">&gt; Checking constraints:</div>
                <div className="flex items-center gap-2"><span className="text-emerald-450">✔</span> Attendee calendars align</div>
                <div className="flex items-center gap-2"><span className="text-emerald-450">✔</span> Focus time buffers intact (+30m pre/post)</div>
                <div className="flex items-center gap-2"><span className="text-emerald-450">✔</span> Timezone matching complete (UTC-5)</div>
              </div>
            </div>
          </div>

          {}
          <div className={`transition-all duration-500 flex flex-col gap-4 ${activeStep === 3 ? "opacity-100 scale-100" : "opacity-0 scale-95 hidden pointer-events-none"}`}>
            <div className="bg-[#0b1022]/70 border border-indigo-500/20 rounded-xl p-5 shadow-lg max-w-xl mx-auto w-full flex flex-col gap-4 backdrop-blur-sm">
              <div className="flex justify-between items-center border-b border-indigo-500/10 pb-2">
                <span className="text-xs font-semibold text-zinc-200">Gmail Reply Draft</span>
                <span className="text-[9px] font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">READY TO SEND</span>
              </div>

              <div className="bg-[#040817] border border-indigo-500/10 rounded-lg p-3 text-xs leading-relaxed text-zinc-300 font-light italic">
                "Hi Alex, Friday at 11:00 AM works perfectly on my end. I have adjusted the calendar invitation to reflect the updated time. Speak then!"
              </div>

              <div className="flex items-center justify-between mt-1 text-[10px] text-zinc-500 font-mono">
                <span>Action: Calendar Sync Update</span>
                <span className="text-indigo-400 flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping"></span>
                  STAGED FOR DEPLOY
                </span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-indigo-455 text-xs font-mono mt-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Execution complete — 2.8 hours saved this week.
            </div>
          </div>

        </div>

        {}
        <div className="relative z-10 border-t border-indigo-500/10 pt-4 flex items-center justify-between text-xs text-zinc-500 font-mono">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-indigo-400/80">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
              SECURE TLS
            </span>
            <span className="hidden md:inline">TENANT ISOLATED LAYERS</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="bg-[#0b1022] border border-indigo-500/10 px-2 py-1 rounded text-[10px]">Step {activeStep + 1} of 4</span>
          </div>
      </div>
    </div>
  </div>
  )
}

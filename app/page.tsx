"use client"

import { useState } from "react"
import Link from "next/link"
import { Show, UserButton } from "@clerk/nextjs"

export default function Home() {
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(null)

  const FAQ_ITEMS = [
    {
      q: "How does Veloce read my emails securely?",
      a: "Veloce integrates directly via secure Google Workspace OAuth. It only monitors email threads containing schedule-related signals (such as meeting requests, conflicts, or time propositions). The scheduling processing is fully isolated, and we never store your email content or train general models on your data.",
    },
    {
      q: "Does Veloce send replies or update calendar events automatically?",
      a: "By default, Veloce works in Draft Mode. It compiles schedule-aligned responses and saves them in your Gmail drafts folder for review. You can review the calendar update and click send with one click. For trusted contacts or teammates, you can enable Autopilot mode to let Veloce reschedule events entirely autonomously.",
    },
    {
      q: "How does Veloce handle complex timezones?",
      a: "Veloce automatically extracts timezone references from incoming emails (e.g., '10 AM EST' or '4 PM CET') and matches them with your calendar's configured timezone. Suggested times are automatically converted and drafted in the sender's timezone, eliminating any timezone math on either end.",
    },
    {
      q: "Can I set custom focus hours and meeting buffers?",
      a: "Yes. You can define focus buffers (e.g., 'leave 15 minutes between calls'), maximum meetings per day, and preferred windows (e.g., 'no meetings after 2 PM on Fridays'). Veloce reads these configurations as hard constraints and schedules around them.",
    },
  ]

  return (
    <div className="w-full min-h-screen bg-[#050505] text-[#e5e5e5] font-sans selection:bg-white selection:text-black relative overflow-hidden">
      
      {/* Hide the default WebGL background on the landing page */}
      <style dangerouslySetInnerHTML={{ __html: `
        #neuro { display: none !important; }
        body { background-color: #050505 !important; }
        ::-webkit-scrollbar-thumb:hover { background: #525252 !important; }
      ` }} />

      {/* Grid Lines Pattern */}
      <div className="absolute inset-0 pointer-events-none z-0 opacity-20">
        <div className="max-w-[1400px] h-full mx-auto px-6 md:px-12 flex justify-between relative">
          <div className="w-[1px] h-full bg-white/10"></div>
          <div className="w-[1px] h-full bg-white/10 hidden md:block"></div>
          <div className="w-[1px] h-full bg-white/10 hidden lg:block"></div>
          <div className="w-[1px] h-full bg-white/10"></div>
        </div>
      </div>

      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-[#050505]/85 backdrop-blur-xl">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 h-14 flex items-center justify-between md:grid md:grid-cols-3">
          {/* Left: Logo */}
          <div className="flex items-center justify-start">
            <a href="#" className="flex items-center gap-2.5 group">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 8L12 17V22L3 13V8Z" fill="currentColor" fillOpacity="0.95" />
                <path d="M21 8L12 17V22L21 13V8Z" fill="currentColor" fillOpacity="0.7" />
                <path d="M3 8L12 17L15 14L6 5L3 8Z" fill="currentColor" fillOpacity="0.8" />
                <path d="M21 8L12 17L9 14L18 5L21 8Z" fill="currentColor" fillOpacity="0.55" />
              </svg>
              <span className="text-[13px] font-bold tracking-[0.18em] text-white uppercase font-sans">
                VELOCE
              </span>
            </a>
          </div>

          {/* Center: Navigation Links */}
          <div className="hidden md:flex items-center justify-center gap-8">
            <a href="#features" className="text-[13px] font-medium text-neutral-350 hover:text-white transition-colors duration-200">
              Features
            </a>
            <a href="#system" className="text-[13px] font-medium text-neutral-350 hover:text-white transition-colors duration-200">
              The System
            </a>
            <a href="#telemetry" className="text-[13px] font-medium text-neutral-350 hover:text-white transition-colors duration-200">
              Telemetry
            </a>
            <a href="#faq" className="text-[13px] font-medium text-neutral-350 hover:text-white transition-colors duration-200">
              FAQ
            </a>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center justify-end gap-4">
            <Show when="signed-out">
              <Link
                href="/login"
                className="text-[13px] font-medium text-neutral-350 hover:text-white transition-colors duration-200"
              >
                Sign in
              </Link>
              <a
                href="mailto:sales@veloce.ai"
                className="hidden sm:inline-flex items-center justify-center px-4 py-1.5 rounded-full border border-white/10 hover:border-white/20 text-[13px] font-medium text-neutral-250 hover:text-white hover:bg-white/5 transition-all duration-200"
              >
                Contact sales
              </a>
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-4 py-1.5 rounded-full bg-white text-black hover:bg-neutral-200 text-[13px] font-semibold transition-all duration-200"
              >
                Get started
              </Link>
            </Show>
            <Show when="signed-in">
              <Link
                href="/app/chat"
                className="text-[13px] font-medium text-neutral-350 hover:text-white transition-colors duration-200 mr-2"
              >
                Console
              </Link>
              <UserButton />
            </Show>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex flex-col justify-center items-center text-center pt-28 pb-16 px-6 relative z-10 max-w-5xl mx-auto">
        <div className="space-y-8 animate-fade-up">
          
          {/* Badge */}
          <div className="inline-flex gap-2 text-[10px] uppercase font-bold text-neutral-300 tracking-widest bg-white/5 border border-white/10 rounded-full py-1.5 px-4 backdrop-blur-sm items-center shadow-[0_0_15px_rgba(255,255,255,0.02)]">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span>
            </span>
            VELOCE 1.0 — GMAIL & CALENDAR AUTOPILOT
          </div>

          {/* Heading */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-semibold tracking-tighter text-white leading-[0.95] font-display">
            ELIMINATE
            <br />
            <span className="font-serif italic font-normal text-neutral-400">
              scheduling latency.
            </span>
          </h1>

          {/* Copy */}
          <p className="text-sm md:text-base text-neutral-400 max-w-xl mx-auto leading-relaxed font-light font-body">
            Veloce scans incoming email scheduling signals, runs timezone translations, 
            maps calendar availability, and drafts context-aware replies. 
            You review the invitation and click send in one click.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 w-full sm:w-auto">
            <Link
              href="/register"
              className="w-full sm:w-auto h-12 px-8 bg-white text-black text-[10px] font-bold uppercase tracking-widest rounded-full hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2 group font-mono"
            >
              Get Started Free
              <svg
                className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 transition-transform duration-300"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto h-12 px-8 border border-white/10 text-white text-[10px] font-bold uppercase tracking-widest rounded-full hover:bg-white/5 transition-colors flex items-center justify-center font-mono"
            >
              Sign In to Console
            </Link>
          </div>
        </div>
      </section>

      {/* Marquee Section */}
      <section className="border-y border-white/5 bg-white/[0.01] overflow-hidden py-5 z-10 relative">
        <div className="flex whitespace-nowrap animate-scroll">
          <div className="flex gap-20 items-center px-10 opacity-30 text-[10px] uppercase tracking-[0.25em] font-mono text-white">
            <span>VELOCE</span>
            <span>•</span>
            <span>Inbox Autopilot</span>
            <span>•</span>
            <span>Gmail Connected</span>
            <span>•</span>
            <span>Calendar Staging</span>
            <span>•</span>
            <span>Timezone Engine</span>
            <span>•</span>
            <span>Telemetry Nominal</span>
            <span>•</span>
            <span>Corsair Core</span>
          </div>
          {/* Duplicate for seamless scrolling */}
          <div className="flex gap-20 items-center px-10 opacity-30 text-[10px] uppercase tracking-[0.25em] font-mono text-white">
            <span>VELOCE</span>
            <span>•</span>
            <span>Inbox Autopilot</span>
            <span>•</span>
            <span>Gmail Connected</span>
            <span>•</span>
            <span>Calendar Staging</span>
            <span>•</span>
            <span>Timezone Engine</span>
            <span>•</span>
            <span>Telemetry Nominal</span>
            <span>•</span>
            <span>Corsair Core</span>
          </div>
        </div>
      </section>

      {/* Features Section (Bento Grid 1) */}
      <section id="features" className="max-w-[1400px] mx-auto pt-32 px-6 md:px-12 pb-4 relative z-10">
        <div className="flex justify-between items-end mb-12">
          <div>
            <h2 className="text-3xl font-medium tracking-tight text-white mb-2 font-display relative inline-flex items-center gap-2">
              The Capabilities
              <span className="flex h-1.5 w-1.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span>
              </span>
            </h2>
            <p className="text-neutral-500 text-xs font-body">
              Designed for speed. Engineered for complete inbox control.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Card 1: Inbox Intelligence (Large span) */}
          <div className="md:col-span-2 group bento-card border-neutral-900 hover:border-white/15 p-8 flex flex-col justify-between h-[360px]">
            <div>
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold bg-white/5 text-neutral-300 border border-white/10 uppercase tracking-wider mb-4 font-mono">
                Component 01
              </span>
              <h3 className="text-2xl font-medium text-white mb-3 font-display">
                Inbox Intelligence
              </h3>
              <p className="text-neutral-400 text-xs leading-relaxed max-w-md font-body font-light">
                Securely reads email context. Ephemerally scans schedule requests, 
                proposed timings, and meeting signals. No inbox content is stored.
              </p>
            </div>
            
            {/* Visual calendar block */}
            <div className="bg-black/40 border border-white/5 rounded-xl p-4 font-mono text-[9px] text-neutral-500 max-w-sm mt-4">
              <div className="flex justify-between text-neutral-400 mb-1 border-b border-white/5 pb-1">
                <span>[INBOX STREAM]</span>
                <span>RE: SCHEDULING SYNC</span>
              </div>
              <div>john.davis@company.com: Can we push our Friday meeting to 11 AM?</div>
              <div className="text-white mt-1">{"->"} DETECTED SIGNAL: RESCHEDULE PROPOSAL</div>
            </div>
          </div>

          {/* Card 2: Timezone Translation */}
          <div className="group bento-card border-neutral-900 hover:border-white/15 p-8 flex flex-col justify-between h-[360px]">
            <div>
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold bg-white/5 text-neutral-300 border border-white/10 uppercase tracking-wider mb-4 font-mono">
                Component 02
              </span>
              <h3 className="text-xl font-medium text-white mb-2 font-display">
                Universal Timezone Translation
              </h3>
              <p className="text-neutral-400 text-xs leading-relaxed font-body font-light">
                Extracts date context and maps it to your availability. Eliminates manual calculations.
              </p>
            </div>
            <div className="font-mono text-[10px] text-neutral-500 border-t border-white/5 pt-4">
              <div>SENDER: EST (GMT-5)</div>
              <div>YOUR CALENDAR: IST (GMT+5:30)</div>
              <div className="text-neutral-300 mt-1">AUTO-SYNC: MATCHED IN-GRID</div>
            </div>
          </div>

          {/* Card 3: Time-Block Protection */}
          <div className="group bento-card border-neutral-900 hover:border-white/15 p-8 flex flex-col justify-between h-[360px]">
            <div>
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold bg-white/5 text-neutral-300 border border-white/10 uppercase tracking-wider mb-4 font-mono">
                Component 03
              </span>
              <h3 className="text-xl font-medium text-white mb-2 font-display">
                Block Protection
              </h3>
              <p className="text-neutral-400 text-xs leading-relaxed font-body font-light">
                Configure focused block guardrails. Veloce automatically leaves 15 or 30-minute buffers between calls.
              </p>
            </div>
            <div className="space-y-2 font-mono text-[9px] text-neutral-500">
              <div className="flex justify-between items-center bg-white/5 p-2 rounded">
                <span>BUFFER SCOPING</span>
                <span className="text-white">30 MIN</span>
              </div>
            </div>
          </div>

          {/* Card 4: Draft Mode (Large span) */}
          <div className="md:col-span-2 group bento-card border-neutral-900 hover:border-white/15 p-8 flex flex-col justify-between h-[360px]">
            <div>
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold bg-white/5 text-neutral-300 border border-white/10 uppercase tracking-wider mb-4 font-mono">
                Component 04
              </span>
              <h3 className="text-2xl font-medium text-white mb-3 font-display">
                One-Click Draft Mode
              </h3>
              <p className="text-neutral-400 text-xs leading-relaxed max-w-md font-body font-light">
                Instead of sending automatic replies, Veloce drafts replies in your Gmail drafts folder 
                and stages the calendar update. You remain in control.
              </p>
            </div>
            <div className="bg-[#151912]/40 border border-emerald-500/10 rounded-xl p-4 max-w-md font-mono text-[9px] text-neutral-400 flex justify-between items-center">
              <div>
                <span className="text-emerald-400">DRAFT STAGED:</span>
                <span className="italic ml-2">"Hi John, Friday at 11 AM works..."</span>
              </div>
              <div className="bg-white text-black px-2 py-1 rounded text-[8px] uppercase tracking-wider font-bold">
                Confirm
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* The System Section (Bento Grid 2) */}
      <section id="system" className="max-w-[1400px] mx-auto pt-32 px-6 md:px-12 pb-4 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 md:grid-rows-2 gap-4 h-auto lg:h-[600px]">
          
          {/* Box 1: Text Content */}
          <div className="bento-card col-span-1 lg:col-span-2 p-8 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 font-mono">
                System Logic
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-medium tracking-tight text-white mb-4 font-display">
              Navigate the
              <br />
              <span className="font-serif italic font-normal text-neutral-400">
                scheduling current.
              </span>
            </h2>
            <p className="text-neutral-400 text-xs leading-relaxed max-w-lg font-body font-light">
              We coordinate schedule conflicts asynchronously. Veloce maps your calendar rules,
              identifies optimal open blocks, saves draft responses, and updates links, giving
              you hours of deep work time back.
            </p>
          </div>

          {/* Box 2: Visual Graphic */}
          <div className="bento-card col-span-1 lg:row-span-2 relative group overflow-hidden h-[300px] lg:h-full">
            <div className="absolute inset-0 bg-neutral-900/50"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative w-full aspect-square max-w-xs mx-auto flex items-center justify-center">
                
                {/* Clean wireframe circles */}
                <div className="absolute w-60 h-60 border border-white/5 rounded-full"></div>
                <div className="absolute w-40 h-40 border border-dashed border-white/10 rounded-full"></div>
                
                <div className="relative w-24 h-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center font-mono text-white text-xs">
                  VELOCE
                </div>

                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-black border border-white/10 text-[9px] uppercase font-bold tracking-widest text-white shadow-xl font-mono">
                  Engine: <span className="text-neutral-400">Nominal</span>
                </div>
              </div>
            </div>
          </div>

          {/* Box 3: Metrics */}
          <div className="bento-card p-8 flex flex-col justify-center gap-6">
            <div className="space-y-2">
              <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest text-neutral-400 font-mono">
                <span>Accuracy</span>
                <span>98.4%</span>
              </div>
              <div className="h-[2px] w-full bg-white/10 overflow-hidden">
                <div className="h-full bg-white w-[98.4%]"></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest text-neutral-400 font-mono">
                <span>Time Saved</span>
                <span>4.2 Hrs/Wk</span>
              </div>
              <div className="h-[2px] w-full bg-white/10 overflow-hidden">
                <div className="h-full bg-neutral-400 w-[85%]"></div>
              </div>
            </div>
          </div>

          {/* Box 4: Checklist */}
          <div className="bento-card p-8 flex flex-col justify-center">
            <ul className="space-y-4 font-mono text-[10px] text-neutral-400">
              <li className="flex items-start gap-3">
                <span className="text-white">✓</span>
                <span>Secure Google Workspace OAuth integration.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-white">✓</span>
                <span>No general model training on email context.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-white">✓</span>
                <span>Autopilot capabilities for trusted domains.</span>
              </li>
            </ul>
          </div>

        </div>
      </section>

      {/* Telemetry Logs Section */}
      <section id="telemetry" className="max-w-[1400px] mx-auto pt-32 px-6 md:px-12 pb-4 relative z-10">
        <div className="bento-card p-8 bg-[#0a0a0a] border border-white/5 rounded-2xl flex flex-col gap-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-2xl font-medium text-white tracking-tight font-display">
                Microservice Orchestration Log
              </h2>
              <p className="text-neutral-500 text-xs font-body mt-1">
                Real-time agent logic executing in the background.
              </p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/5 bg-black/50">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
              <span className="text-[9px] font-mono text-white uppercase tracking-widest">
                Active Telemetry
              </span>
            </div>
          </div>

          <div className="bg-black/60 border border-white/5 rounded-xl p-6 font-mono text-[10px] text-neutral-400 space-y-2 leading-relaxed max-w-3xl">
            <div className="text-neutral-600">[SYSTEM] Launching engine sync...</div>
            <div>[INFO] Querying Google Calendar slots...</div>
            <div>[INFO] Scanning for scheduling conflicts...</div>
            <div>[INFO] Identified optimal open block: Friday, 11:00 AM.</div>
            <div>[INFO] Generating Gmail draft proposal...</div>
            <div>[INFO] Staging Google Calendar event coordinates...</div>
            <div className="text-neutral-200">[SUCCESS] Orchestration complete. Draft created in thread.</div>
            <div className="text-neutral-200">[SUCCESS] Calendar update pre-staged.</div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="max-w-[800px] mx-auto pt-32 px-6 pb-4 relative z-10">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-medium tracking-tight text-white mb-2 font-display">
            Frequently Asked Questions
          </h2>
          <p className="text-neutral-500 text-xs">
            Simple answers to security, logic, and operational questions.
          </p>
        </div>

        <div className="space-y-4">
          {FAQ_ITEMS.map((faq, idx) => {
            const isOpen = openFaqIdx === idx
            return (
              <div
                key={idx}
                className="border-b border-white/5 pb-4 transition-all duration-300"
              >
                <button
                  onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between text-left py-4 text-neutral-200 hover:text-white transition-colors duration-200 cursor-pointer group"
                >
                  <span className="text-xs uppercase tracking-wider font-semibold font-mono">
                    {faq.q}
                  </span>
                  <span className="text-neutral-500 group-hover:text-white transition-colors text-xs font-mono">
                    {isOpen ? "[-]" : "[+]"}
                  </span>
                </button>
                <div
                  className={`grid transition-all duration-300 ease-in-out ${
                    isOpen ? "grid-rows-[1fr] opacity-100 mt-2" : "grid-rows-[0fr] opacity-0 pointer-events-none"
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="text-xs text-neutral-450 leading-relaxed font-light pb-4 font-body">
                      {faq.a}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-6 relative z-10">
        <div className="max-w-4xl mx-auto bento-card p-12 md:p-20 text-center relative overflow-hidden bg-white/[0.01] border-white/10">
          <div className="relative z-10 space-y-6">
            <h2 className="text-3xl md:text-5xl font-medium tracking-tight text-white font-display">
              Ready to take control of
              <br />
              <span className="text-neutral-400 font-serif italic">scheduling latency?</span>
            </h2>
            <p className="text-neutral-500 text-xs max-w-md mx-auto font-body">
              Integrate Gmail and Calendar with one click. Deploy your scheduling co-pilot now.
            </p>
            <div className="flex justify-center pt-4">
              <Link
                href="/register"
                className="h-12 px-10 bg-white text-black text-[10px] font-bold uppercase tracking-widest rounded-full hover:bg-neutral-200 transition-colors flex items-center justify-center font-mono"
              >
                Launch Console
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-black pt-20 pb-12 relative z-10">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex flex-col items-center md:items-start gap-2">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 8L12 17V22L3 13V8Z" fill="currentColor" fillOpacity="0.95" />
                <path d="M21 8L12 17V22L21 13V8Z" fill="currentColor" fillOpacity="0.7" />
                <path d="M3 8L12 17L15 14L6 5L3 8Z" fill="currentColor" fillOpacity="0.8" />
                <path d="M21 8L12 17L9 14L18 5L21 8Z" fill="currentColor" fillOpacity="0.55" />
              </svg>
              <span className="text-sm font-bold tracking-[0.18em] text-white uppercase font-sans">
                VELOCE
              </span>
            </div>
            <span className="text-[8px] tracking-widest text-neutral-600 uppercase font-mono">
              © 2026 Veloce AI. All rights reserved.
            </span>
          </div>
          <div className="flex gap-8 text-[9px] uppercase tracking-widest text-neutral-500 font-mono">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Security</a>
            <a href="#" className="hover:text-white transition-colors">GitHub</a>
          </div>
        </div>
      </footer>

    </div>
  )
}

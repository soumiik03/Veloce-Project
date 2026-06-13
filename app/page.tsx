"use client"

import { useEffect, useState } from "react"
import Canvas3D from "@/components/canvas-3d"
import ProductMockup from "@/components/landing/product-mockup"

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
  {
    q: "Does it support other providers like Outlook or Apple Calendar?",
    a: "Veloce currently specializes in providing an ultra-polished, deep integration for Google Workspace (Gmail and Google Calendar). Outlook and Microsoft 365 calendar support is currently in closed beta and will be released to all users soon.",
  },
]

const STEPS = [
  {
    num: "01",
    title: "Connect Account",
    description: "Link Gmail and Calendar with a single click. Secured via enterprise-grade OAuth.",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
      </svg>
    ),
  },
  {
    num: "02",
    title: "Detect Intent",
    description: "Veloce monitors your incoming email. It immediately flags any request for reschedule or new sync.",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
      </svg>
    ),
  },
  {
    num: "03",
    title: "Check Constraints",
    description: "The agent checks conflicts in Google Calendar, factoring in travel times and focus slots.",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.637 10.637Z" />
      </svg>
    ),
  },
  {
    num: "04",
    title: "Draft Response",
    description: "Veloce automatically drafts a precise email response offering optimal times.",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
      </svg>
    ),
  },
  {
    num: "05",
    title: "Instant Sync",
    description: "The moment the meeting is agreed upon, Veloce updates your calendar instantly.",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
      </svg>
    ),
  },
]

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(null)

  useEffect(() => {
    const isAuth = document.cookie.split("; ").some(row => {
      const trimmed = row.trim()
      return trimmed.startsWith("veloce_logged_in=") || trimmed.includes("session-token=")
    })
    setIsAuthenticated(isAuth)
  }, [])

  return (
    <div className="relative w-full min-h-screen flex flex-col selection:bg-indigo-500/30 selection:text-indigo-200 overflow-hidden text-[#e4e4e7]">
      
      {/* Background grid lines overlay */}
      <div className="absolute inset-0 pointer-events-none z-0 opacity-[0.07]">
        <div className="max-w-[1400px] h-full mx-auto px-6 md:px-12 flex justify-between relative">
          <div className="w-[1px] h-full bg-indigo-500"></div>
          <div className="w-[1px] h-full bg-indigo-500 hidden md:block"></div>
          <div className="w-[1px] h-full bg-indigo-500 hidden lg:block"></div>
          <div className="w-[1px] h-full bg-indigo-500"></div>
        </div>
      </div>

      {/* Redesigned Premium Navbar */}
      <header className="fixed inset-x-0 top-0 z-50 bg-[#030712]/60 backdrop-blur-xl border-b border-indigo-500/10 transition-all duration-300">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 h-16 flex items-center justify-between">
          
          {/* Logo on the left */}
          <a href="#" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white font-extrabold tracking-tighter text-sm shadow-[0_0_15px_rgba(99,102,241,0.3)] group-hover:shadow-[0_0_20px_rgba(99,102,241,0.5)] transition-all duration-300">
              V
            </div>
            <div className="flex flex-col">
              <span className="tracking-[0.18em] text-sm font-semibold text-white uppercase font-sans leading-none">
                Veloce
              </span>
              <span className="text-[8px] tracking-widest text-indigo-400/80 uppercase font-mono mt-0.5">
                Corsair Alliance
              </span>
            </div>
          </a>

          {/* Center Links */}
          <nav className="hidden md:flex items-center gap-8 text-[11px] font-mono tracking-wider font-medium text-zinc-400">
            <a href="#features" className="hover:text-white transition duration-200">
              FEATURES
            </a>
            <a href="#how-it-works" className="hover:text-white transition duration-200">
              HOW IT WORKS
            </a>
            <a href="#story" className="hover:text-white transition duration-200">
              OLD VS NEW
            </a>
            <a href="#pricing" className="hover:text-white transition duration-200">
              PRICING
            </a>
            <a href="#faq" className="hover:text-white transition duration-200">
              FAQ
            </a>
          </nav>

          {/* Action buttons on the right */}
          <div className="hidden md:flex items-center gap-4">
            {isAuthenticated ? (
              <a
                href="/app/workspace"
                className="px-5 py-2 border border-indigo-500/20 rounded-full text-xs font-mono font-medium hover:bg-indigo-500/5 hover:border-indigo-500/40 text-indigo-200 transition duration-300 flex items-center gap-2"
              >
                Dashboard
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </a>
            ) : (
              <>
                <a
                  href="/login"
                  className="text-xs font-mono text-zinc-400 hover:text-white transition duration-200"
                >
                  Sign In
                </a>
                <a
                  href="/register"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full text-xs font-mono font-semibold transition duration-300 shadow-[0_0_15px_rgba(99,102,241,0.25)] hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] flex items-center gap-1.5"
                >
                  Get Started
                </a>
              </>
            )}
          </div>

          {/* Mobile responsive toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-zinc-450 hover:text-white focus:outline-none cursor-pointer"
          >
            {mobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#030712]/95 border-b border-indigo-500/10 px-6 py-6 flex flex-col gap-4 text-xs font-mono tracking-wider">
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="text-zinc-350 hover:text-white py-1 transition"
            >
              FEATURES
            </a>
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="text-zinc-350 hover:text-white py-1 transition"
            >
              HOW IT WORKS
            </a>
            <a
              href="#story"
              onClick={() => setMobileMenuOpen(false)}
              className="text-zinc-355 hover:text-white py-1 transition"
            >
              OLD VS NEW
            </a>
            <a
              href="#pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="text-zinc-350 hover:text-white py-1 transition"
            >
              PRICING
            </a>
            <a
              href="#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="text-zinc-350 hover:text-white py-1 transition"
            >
              FAQ
            </a>
            <hr className="border-indigo-500/10 my-2" />
            {isAuthenticated ? (
              <a
                href="/app/workspace"
                className="py-2.5 px-4 bg-indigo-600/15 border border-indigo-500/30 rounded-xl text-center font-semibold text-indigo-300 text-sm font-sans"
              >
                Dashboard
              </a>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <a
                  href="/login"
                  className="py-2.5 px-4 bg-[#080d24] border border-indigo-500/15 rounded-xl text-center text-zinc-350 hover:text-white font-medium"
                >
                  Sign In
                </a>
                <a
                  href="/register"
                  className="py-2.5 px-4 bg-indigo-600 text-white rounded-xl text-center font-semibold"
                >
                  Get Started
                </a>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="relative z-10 w-full max-w-[1400px] mx-auto px-6 md:px-12 pt-32 pb-24 flex flex-col gap-28 md:gap-40">
        
        {/* HERO SECTION */}
        <section className="relative min-h-[75vh] flex flex-col justify-center items-center text-center max-w-5xl mx-auto px-4 gap-8 md:gap-10">
          
          {/* Subtle Glowing Aura */}
          <div className="pointer-events-none absolute -top-[10%] left-1/2 -translate-x-1/2 w-[300px] md:w-[600px] h-[300px] md:h-[600px] rounded-full bg-indigo-600/10 blur-[90px] md:blur-[150px] -z-10 animate-pulse"></div>
          
          {/* Micro Badge */}
          <div className="animate-fade-in">
            <span className="inline-flex items-center gap-2 border border-indigo-500/25 px-4 py-1.5 rounded-full bg-indigo-950/20 text-xs font-mono tracking-tight text-indigo-300">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
              Veloce 1.0 — Gmail & Calendar Autonomous Assistant
            </span>
          </div>

          {/* Main Title & Paragraph */}
          <div className="flex flex-col gap-6 max-w-4xl">
            <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl tracking-tight text-white font-light leading-[1.05]">
              Eliminate scheduling latency. <br />
              <span className="bg-gradient-to-r from-indigo-400 via-sky-400 to-indigo-500 bg-clip-text text-transparent font-normal block mt-2 sm:inline sm:mt-0">
                Inbox-to-calendar autopilot.
              </span>
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed font-light">
              Veloce monitors reschedule request intents within Gmail, scans your Google Calendar availability constraints, drafts context-aware replies, and coordinates timings autonomously.
            </p>
          </div>

          {/* Hero CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-2 w-full sm:w-auto">
            {isAuthenticated ? (
              <a
                href="/app/workspace"
                className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-zinc-150 text-zinc-950 text-sm font-semibold rounded-full shadow-[0_4px_20px_rgba(99,102,241,0.2)] transition duration-300 flex items-center justify-center gap-3 group"
              >
                Go to Workspace
                <svg
                  className="w-4 h-4 transform group-hover:translate-x-0.5 transition-transform duration-300"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </a>
            ) : (
              <a
                href="/register"
                className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-zinc-150 text-zinc-950 text-sm font-semibold rounded-full shadow-[0_4px_20px_rgba(99,102,241,0.2)] transition duration-300 flex items-center justify-center gap-3 group"
              >
                Get Started Free
                <svg
                  className="w-4 h-4 transform group-hover:translate-x-0.5 transition-transform duration-300"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </a>
            )}
            <a
              href="#pipeline"
              className="w-full sm:w-auto px-8 py-4 bg-[#080d24]/60 border border-indigo-500/15 hover:border-indigo-500/35 hover:bg-[#0c1332] text-zinc-300 text-sm font-medium rounded-full transition duration-300 flex items-center justify-center gap-2 backdrop-blur-md"
            >
              See How It Works
            </a>
          </div>

          {/* Security details line */}
          <p className="text-[10px] font-mono tracking-wider text-zinc-500 uppercase mt-1">
            Co-developed with Corsair. OAuth isolated permissions.
          </p>

          {/* floating wireframe background decoration */}
          <div className="absolute top-[20%] right-[-15%] w-[420px] h-[420px] opacity-15 pointer-events-none -z-10 mix-blend-screen hidden lg:block">
            <Canvas3D />
          </div>
        </section>

        {/* METRICS & CREDIBILITY SOCIAL PROOF */}
        <section className="w-full border-t border-b border-indigo-500/10 py-10 bg-[#050a1a]/25 backdrop-blur-md rounded-2xl">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 md:gap-12 text-center max-w-4xl mx-auto">
            <div className="flex flex-col gap-1.5">
              <span className="text-3xl md:text-4xl font-light text-white tracking-tight">98.4%</span>
              <span className="text-xs font-mono tracking-wider text-indigo-400/80 uppercase">Intent Parsing Accuracy</span>
            </div>
            <div className="flex flex-col gap-1.5 border-t border-b border-indigo-500/5 sm:border-y-0 sm:border-x sm:border-indigo-500/5 py-6 sm:py-0">
              <span className="text-3xl md:text-4xl font-light text-white tracking-tight">2.8 hrs</span>
              <span className="text-xs font-mono tracking-wider text-indigo-400/80 uppercase">Saved per User Weekly</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-3xl md:text-4xl font-light text-white tracking-tight">Zero</span>
              <span className="text-xs font-mono tracking-wider text-indigo-400/80 uppercase">Double-Booking Errors</span>
            </div>
          </div>
        </section>

        {/* PIPELINE LIVE SIMULATION WIDGET */}
        <section id="pipeline" className="flex flex-col gap-10 scroll-mt-24">
          <div className="max-w-2xl">
            <span className="text-xs font-mono tracking-wider text-indigo-400 uppercase">Interactive Mockup</span>
            <h2 className="text-3xl sm:text-4xl font-light text-white mt-2 tracking-tight">
              An agent running quietly in your inbox.
            </h2>
          </div>
          <ProductMockup />
        </section>

        {/* FEATURES BENTO GRID */}
        <section id="features" className="flex flex-col gap-12 scroll-mt-24">
          <div className="max-w-2xl">
            <span className="text-xs font-mono tracking-wider text-indigo-400 uppercase">Product Capabilities</span>
            <h2 className="text-3xl sm:text-4xl font-light text-white mt-2 tracking-tight">
              Designed for speed, polished for execution.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-6">
            
            {/* Inbox Intelligence */}
            <div className="md:col-span-3 lg:col-span-4 bg-[#080d22]/40 border border-indigo-500/10 rounded-2xl p-6 flex flex-col justify-between hover:border-indigo-500/30 hover:bg-[#0c1232]/50 transition-all duration-300 group backdrop-blur-sm">
              <div className="w-10 h-10 rounded-xl bg-indigo-950/20 border border-indigo-500/20 flex items-center justify-center text-indigo-300 group-hover:text-white group-hover:border-indigo-500/40 group-hover:bg-indigo-650/15 transition-all duration-300">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 0 1 2.008 1.24l.885 1.77a2.25 2.25 0 0 0 2.007 1.24h1.98a2.25 2.25 0 0 0 2.007-1.24l.885-1.77a2.25 2.25 0 0 1 2.007-1.24h3.86m-18 0h18M2.25 13.5a2.25 2.25 0 0 1 2.25-2.25h15a2.25 2.25 0 0 1 2.25 2.25m-18 0v4.25a2.25 2.25 0 0 0 2.25 2.25h15a2.25 2.25 0 0 0 2.25-2.25V13.5M2.25 13.5V6a2.25 2.25 0 0 1 2.25-2.25h15A2.25 2.25 0 0 1 21.75 6v7.5" />
                </svg>
              </div>
              <div className="mt-10">
                <h3 className="text-base font-semibold text-zinc-150 tracking-tight">Inbox Intelligence</h3>
                <p className="text-xs text-zinc-400 mt-2 font-light leading-relaxed">
                  Scans incoming email contexts autonomously to isolate scheduling request intents, names, timezone expectations, and preferred windows.
                </p>
              </div>
            </div>

            {/* Time-Block Protection */}
            <div className="md:col-span-3 lg:col-span-4 bg-[#080d22]/40 border border-indigo-500/10 rounded-2xl p-6 flex flex-col justify-between hover:border-indigo-500/30 hover:bg-[#0c1232]/50 transition-all duration-300 group backdrop-blur-sm">
              <div className="w-10 h-10 rounded-xl bg-indigo-950/20 border border-indigo-500/20 flex items-center justify-center text-indigo-300 group-hover:text-white group-hover:border-indigo-500/40 group-hover:bg-indigo-650/15 transition-all duration-300">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
                </svg>
              </div>
              <div className="mt-10">
                <h3 className="text-base font-semibold text-zinc-150 tracking-tight">Time-Block Protection</h3>
                <p className="text-xs text-zinc-400 mt-2 font-light leading-relaxed">
                  Configure scheduling buffer rules. The agent actively preserves transit time, lunch, focus slots, and daily meeting caps.
                </p>
              </div>
            </div>

            {/* Smart Rescheduling */}
            <div className="md:col-span-6 lg:col-span-4 bg-[#080d22]/40 border border-indigo-500/10 rounded-2xl p-6 flex flex-col justify-between hover:border-indigo-500/30 hover:bg-[#0c1232]/50 transition-all duration-300 group backdrop-blur-sm">
              <div className="w-10 h-10 rounded-xl bg-indigo-950/20 border border-indigo-500/20 flex items-center justify-center text-indigo-300 group-hover:text-white group-hover:border-indigo-500/40 group-hover:bg-indigo-650/15 transition-all duration-300">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 0 0-3.7-3.7 48.678 48.678 0 0 0-7.324 0 4.006 4.006 0 0 0-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3-3-3M3 12a48.29 48.29 0 0 1 .138-3.662 4.006 4.006 0 0 1 3.7-3.7 48.656 48.656 0 0 1 7.324 0 4.006 4.006 0 0 1 3.7 3.7c.017.22.032.441.046.662M3 12l-3 3m3-3 3 3" />
                </svg>
              </div>
              <div className="mt-10">
                <h3 className="text-base font-semibold text-zinc-150 tracking-tight">Autonomous Resolution</h3>
                <p className="text-xs text-zinc-400 mt-2 font-light leading-relaxed">
                  When a meeting conflicts, Veloce evaluates alternative time slots, coordinates availability via email draft threads, and shifts events without manual effort.
                </p>
              </div>
            </div>

            {/* Draft Generation */}
            <div className="md:col-span-3 lg:col-span-6 bg-[#080d22]/40 border border-indigo-500/10 rounded-2xl p-6 flex flex-col justify-between hover:border-indigo-500/30 hover:bg-[#0c1232]/50 transition-all duration-300 group backdrop-blur-sm">
              <div className="w-10 h-10 rounded-xl bg-indigo-950/20 border border-indigo-500/20 flex items-center justify-center text-indigo-300 group-hover:text-white group-hover:border-indigo-500/40 group-hover:bg-indigo-650/15 transition-all duration-300">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3h9m-9 3h3m-6.75 4.5h16.5a2.25 2.25 0 0 0 2.25-2.25V6.107m-18.75 0a2.25 2.25 0 0 1 2.25-2.25h16.5a2.25 2.25 0 0 1 2.25 2.25m-18.75 0v11.25A2.25 2.25 0 0 0 5.25 21" />
                </svg>
              </div>
              <div className="mt-10">
                <h3 className="text-base font-semibold text-zinc-150 tracking-tight">AI Reply Drafts</h3>
                <p className="text-xs text-zinc-400 mt-2 font-light leading-relaxed">
                  Veloce compiles context-matched replies inside your Gmail Drafts folder matching your specific voice guidelines, keeping you in complete control.
                </p>
              </div>
            </div>

            {/* Tenant Isolated Security */}
            <div className="md:col-span-3 lg:col-span-6 bg-[#080d22]/40 border border-indigo-500/10 rounded-2xl p-6 flex flex-col justify-between hover:border-indigo-500/30 hover:bg-[#0c1232]/50 transition-all duration-300 group backdrop-blur-sm">
              <div className="w-10 h-10 rounded-xl bg-indigo-950/20 border border-indigo-500/20 flex items-center justify-center text-indigo-300 group-hover:text-white group-hover:border-indigo-500/40 group-hover:bg-indigo-650/15 transition-all duration-300">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                </svg>
              </div>
              <div className="mt-10">
                <h3 className="text-base font-semibold text-zinc-150 tracking-tight">Isolated Security Architecture</h3>
                <p className="text-xs text-zinc-400 mt-2 font-light leading-relaxed">
                  We process data using secure, ephemeral sessions. Your workspace content is never stored on persistent storage, ensuring zero leakage of company logistics.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS SECTION */}
        <section id="how-it-works" className="flex flex-col gap-12 scroll-mt-24">
          <div className="max-w-2xl">
            <span className="text-xs font-mono tracking-wider text-indigo-400 uppercase">Seamless Setup</span>
            <h2 className="text-3xl sm:text-4xl font-light text-white mt-2 tracking-tight">
              Onboard in seconds. Delegate logistics.
            </h2>
          </div>
          
          <div className="relative w-full">
            {/* Horizontal line for connecting dots on desktop */}
            <div className="absolute top-[48px] left-[5%] right-[5%] h-[1px] bg-indigo-500/10 hidden lg:block z-0"></div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 relative z-10">
              {STEPS.map((step, idx) => (
                <div
                  key={idx}
                  className="flex flex-col gap-4 bg-[#080d22]/30 border border-indigo-500/10 hover:border-indigo-500/25 p-6 rounded-2xl transition-all duration-300 group backdrop-blur-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-indigo-950/20 border border-indigo-500/20 flex items-center justify-center text-indigo-300 group-hover:text-white group-hover:border-indigo-500/40 group-hover:bg-indigo-650/10 transition-all duration-300">
                      {step.icon}
                    </div>
                    <span className="font-mono text-xs text-zinc-500 group-hover:text-indigo-400 transition-colors">
                      {step.num}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1.5 mt-2">
                    <h4 className="text-sm font-semibold text-zinc-200 tracking-tight">{step.title}</h4>
                    <p className="text-xs text-zinc-400 leading-relaxed font-light">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* BENEFITS: OLD VS NEW */}
        <section id="story" className="flex flex-col gap-12 scroll-mt-24">
          <div className="max-w-2xl">
            <span className="text-xs font-mono tracking-wider text-indigo-400 uppercase">Workflow Comparison</span>
            <h2 className="text-3xl sm:text-4xl font-light text-white mt-2 tracking-tight">
              The end of calendar latency.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
            {/* Old Way */}
            <div className="bg-[#080d22]/15 border border-indigo-500/5 rounded-2xl p-8 flex flex-col gap-6 opacity-60 hover:opacity-90 transition-all duration-300 backdrop-blur-sm">
              <span className="text-xs font-mono tracking-wider text-rose-455 uppercase flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                Manual Back-and-Forth
              </span>
              <ul className="space-y-4 text-xs font-light text-zinc-400">
                <li className="flex items-start gap-3">
                  <span className="text-rose-500 font-semibold mt-0.5">✕</span>
                  <span>Drafting alternative list slots by manually copying availability calendar logs.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-rose-500 font-semibold mt-0.5">✕</span>
                  <span>Manually calculating different timezones, resulting in frequent double-bookings.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-rose-500 font-semibold mt-0.5">✕</span>
                  <span>Constantly checking inputs to send confirmations and invite reminders.</span>
                </li>
              </ul>
            </div>

            {/* Veloce Way */}
            <div className="bg-indigo-950/10 border border-indigo-500/20 rounded-2xl p-8 flex flex-col gap-6 hover:border-indigo-500/40 transition-all duration-300 backdrop-blur-sm shadow-[0_0_20px_rgba(99,102,241,0.05)]">
              <span className="text-xs font-mono tracking-wider text-indigo-400 uppercase flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
                Orchestrated with Veloce
              </span>
              <ul className="space-y-4 text-xs font-zinc-300">
                <li className="flex items-start gap-3">
                  <span className="text-indigo-400 font-semibold mt-0.5">✓</span>
                  <span>Autonomous interception parses and flags scheduling intent instantly.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-indigo-400 font-semibold mt-0.5">✓</span>
                  <span>Automated timezone calculations ensure clean alignment on slots.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-indigo-400 font-semibold mt-0.5">✓</span>
                  <span>Draff responses and event listings sync in background console.</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* PRICING SECTION */}
        <section id="pricing" className="flex flex-col gap-12 scroll-mt-24">
          <div className="max-w-2xl mx-auto text-center flex flex-col gap-3">
            <span className="text-xs font-mono tracking-wider text-indigo-400 uppercase">Pricing Plan</span>
            <h2 className="text-3xl sm:text-4xl font-light text-white tracking-tight">
              One transparent plan for unified efficiency.
            </h2>
          </div>

          <div className="bg-[#080d22]/45 border border-indigo-500/20 rounded-3xl p-8 md:p-12 max-w-xl mx-auto w-full flex flex-col items-center gap-8 relative overflow-hidden backdrop-blur-md shadow-[0_10px_40px_rgba(99,102,241,0.05)]">
            <div className="pointer-events-none absolute -top-[20%] left-1/2 -translate-x-1/2 w-[220px] h-[220px] rounded-full bg-indigo-500/5 blur-[55px] -z-10"></div>
            
            <div className="text-center flex flex-col gap-2">
              <span className="text-xs font-mono tracking-widest text-indigo-300 uppercase font-semibold">
                VELOCE PRO
              </span>
              <div className="flex items-baseline justify-center gap-1.5 mt-2">
                <span className="text-5xl font-light text-white">$24</span>
                <span className="text-xs font-mono text-zinc-550">/ USER / MONTH</span>
              </div>
            </div>

            <hr className="w-full border-indigo-500/10" />

            <ul className="w-full space-y-4 text-xs font-light text-zinc-300">
              <li className="flex items-center gap-3">
                <span className="text-indigo-400 font-bold">✔</span>
                Unlimited Gmail & Calendar integrations
              </li>
              <li className="flex items-center gap-3">
                <span className="text-indigo-400 font-bold">✔</span>
                Focus buffers & custom calendar guardrails
              </li>
              <li className="flex items-center gap-3">
                <span className="text-indigo-400 font-bold">✔</span>
                Autonomous timezone translation mapping
              </li>
              <li className="flex items-center gap-3">
                <span className="text-indigo-400 font-bold">✔</span>
                Autopilot mode for internal team contacts
              </li>
              <li className="flex items-center gap-3">
                <span className="text-indigo-400 font-bold">✔</span>
                Tenant-isolated security architecture
              </li>
            </ul>

            <a
              href="/register"
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-center rounded-xl transition duration-300 shadow-[0_4px_15px_rgba(99,102,241,0.2)]"
            >
              Start 14-Day Free Trial
            </a>
            
            <p className="text-[10px] text-zinc-500 font-mono">
              No credit card required. Cancel anytime.
            </p>
          </div>
        </section>

        {/* FAQ ACCORDION */}
        <section id="faq" className="flex flex-col gap-12 scroll-mt-24">
          <div className="max-w-2xl mx-auto text-center flex flex-col gap-3">
            <span className="text-xs font-mono tracking-wider text-indigo-400 uppercase">Common Questions</span>
            <h2 className="text-3xl sm:text-4xl font-light text-white tracking-tight">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="w-full max-w-3xl mx-auto flex flex-col gap-4">
            {FAQ_ITEMS.map((faq, idx) => {
              const isOpen = openFaqIdx === idx
              return (
                <div
                  key={idx}
                  className="border-b border-indigo-500/10 pb-4 transition-all duration-300"
                >
                  <button
                    onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between text-left py-4 text-zinc-200 hover:text-indigo-400 transition-colors duration-200 cursor-pointer group"
                  >
                    <span className="text-sm font-medium tracking-tight pr-4">
                      {faq.q}
                    </span>
                    <span className="flex-shrink-0 w-5 h-5 rounded-full border border-indigo-500/15 flex items-center justify-center text-zinc-500 group-hover:text-indigo-400 group-hover:border-indigo-500/40 transition-all duration-300">
                      <svg
                        className={`w-3 h-3 transform transition-transform duration-300 ${
                          isOpen ? "rotate-180 text-indigo-400" : ""
                        }`}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                      </svg>
                    </span>
                  </button>
                  <div
                    className={`grid transition-all duration-300 ease-in-out ${
                      isOpen ? "grid-rows-[1fr] opacity-100 mt-1" : "grid-rows-[0fr] opacity-0 pointer-events-none"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <p className="text-xs text-zinc-400 leading-relaxed font-light pb-4 pl-1">
                        {faq.a}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* FINAL CLOSING CTA CARD */}
        <section className="relative overflow-hidden bg-[#080d22]/35 border border-indigo-500/15 rounded-3xl p-8 md:p-16 text-center flex flex-col items-center gap-8 max-w-4xl mx-auto w-full backdrop-blur-md shadow-[0_10px_35px_rgba(99,102,241,0.05)]">
          <div className="pointer-events-none absolute -bottom-[40%] left-1/2 -translate-x-1/2 w-[350px] h-[350px] rounded-full bg-indigo-500/10 blur-[85px] -z-10 animate-pulse"></div>

          <div className="flex flex-col gap-4 max-w-xl">
            <h2 className="text-3xl sm:text-4xl font-light text-white tracking-tight leading-tight">
              Ready to automate coordination latency?
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 font-light leading-relaxed">
              Connect Veloce to your workspace, setup your calendar rules, and let the agent handle scheduling and drafts for you.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 mt-2 w-full sm:w-auto">
            <a
              href="/register"
              className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-zinc-150 text-zinc-950 text-sm font-semibold rounded-full shadow-lg transition duration-300"
            >
              Get Started Free
            </a>
            <a
              href="/login"
              className="w-full sm:w-auto px-8 py-4 bg-[#080d24]/60 border border-indigo-500/15 hover:border-indigo-500/35 hover:bg-[#0c1332] text-zinc-300 text-sm font-medium rounded-full transition duration-300"
            >
              Sign In to Console
            </a>
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="relative z-10 w-full max-w-[1400px] mx-auto px-6 md:px-12 border-t border-indigo-500/10 py-12 flex flex-col md:flex-row justify-between items-center gap-8 bg-[#030712]/40">
        <div className="flex flex-col items-center md:items-start gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white font-extrabold text-xs">
              V
            </div>
            <span className="tracking-widest text-xs font-semibold text-white uppercase font-sans">
              Veloce
            </span>
          </div>
          <p className="text-[10px] text-zinc-650 font-light">
            © 2026 Veloce AI. Autonomous calendar systems. All rights reserved.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-8 text-[11px] font-mono tracking-wider text-zinc-500">
          <a href="#features" className="hover:text-indigo-400 transition">FEATURES</a>
          <a href="#how-it-works" className="hover:text-indigo-400 transition">HOW IT WORKS</a>
          <a href="#pricing" className="hover:text-indigo-400 transition">PRICING</a>
          <span className="text-indigo-400 flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
            ALL SYSTEMS ACTIVE
          </span>
        </div>
      </footer>
    </div>
  )
}

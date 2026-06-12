"use client"

import { useState } from "react"

const FAQS = [
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

export default function FAQSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(null)

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col gap-4">
      {FAQS.map((faq, idx) => {
        const isOpen = openIdx === idx
        return (
          <div
            key={idx}
            className="border-b border-zinc-900 pb-4 transition-all duration-300"
          >
            <button
              onClick={() => setOpenIdx(isOpen ? null : idx)}
              className="w-full flex items-center justify-between text-left py-4 text-zinc-100 hover:text-indigo-400 transition-colors duration-200 cursor-pointer group"
            >
              <span className="text-sm font-medium tracking-tight pr-4">
                {faq.q}
              </span>
              <span className="flex-shrink-0 w-5 h-5 rounded-full border border-zinc-800 flex items-center justify-center text-zinc-500 group-hover:text-indigo-400 group-hover:border-indigo-500/20 transition-all duration-300">
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
  )
}

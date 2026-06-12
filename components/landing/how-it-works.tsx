"use client"

const STEPS = [
  {
    num: "01",
    title: "Connect",
    description: "Link Gmail and Calendar with a single click. Secured via enterprise-grade OAuth.",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
      </svg>
    ),
  },
  {
    num: "02",
    title: "Intercept",
    description: "Veloce monitors your incoming email. It immediately flags any request for reschedule or new sync.",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
      </svg>
    ),
  },
  {
    num: "03",
    title: "Analyze",
    description: "The agent checks conflicts in Google Calendar, factoring in travel times and focus slots.",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.637 10.637Z" />
      </svg>
    ),
  },
  {
    num: "04",
    title: "Draft",
    description: "Veloce automatically drafts a precise email response offering optimal times.",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
      </svg>
    ),
  },
  {
    num: "05",
    title: "Sync",
    description: "The moment the meeting is agreed upon, Veloce updates your calendar instantly.",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
      </svg>
    ),
  },
]

export default function HowItWorks() {
  return (
    <div className="relative w-full">
      {/* Decorative center connecting line for larger screens */}
      <div className="absolute top-[48px] left-[5%] right-[5%] h-[1px] bg-zinc-800/60 hidden lg:block z-0"></div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 relative z-10">
        {STEPS.map((step, idx) => (
          <div
            key={idx}
            className="flex flex-col gap-4 bg-zinc-950/40 border border-zinc-900 hover:border-zinc-800/80 p-6 rounded-2xl transition-all duration-300 group"
          >
            <div className="flex items-center justify-between">
              {/* Icon Container */}
              <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-indigo-400 group-hover:border-indigo-500/20 group-hover:bg-indigo-500/5 transition-all duration-300">
                {step.icon}
              </div>
              {/* Step number badge */}
              <span className="font-mono text-xs text-zinc-600 group-hover:text-indigo-500/60 transition-colors">
                {step.num}
              </span>
            </div>

            <div className="flex flex-col gap-1.5 mt-2">
              <h4 className="text-sm font-medium text-zinc-100 tracking-tight">{step.title}</h4>
              <p className="text-xs text-zinc-400 leading-relaxed font-light">{step.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

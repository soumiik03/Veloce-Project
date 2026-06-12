"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const isAuth = document.cookie.split("; ").some(row => row.trim().startsWith("veloce_logged_in="))
    if (!isAuth) {
      window.location.href = "/"
    } else {
      setLoading(false)
    }
  }, [])

  const handleLogout = async () => {
    try {
      const cookieVal = document.cookie
        .split("; ")
        .find(row => row.startsWith("accessToken="))
        ?.split("=")[1]

      await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${cookieVal || ""}`
        }
      })
    } catch (err) {
      console.error(err)
    }
    document.cookie = "accessToken=; Max-Age=0; path=/;"
    document.cookie = "refreshToken=; Max-Age=0; path=/;"
    document.cookie = "veloce_logged_in=; Max-Age=0; path=/;"
    window.location.href = "/"
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-[#030712] text-indigo-400 font-mono text-sm h-screen">
        <div className="flex flex-col items-center gap-3">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping"></span>
          <span>ESTABLISHING TRANS-LINK CONNECTION...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#030712]/90 text-zinc-300 font-sans">
      {/* Redesigned Sidebar */}
      <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-indigo-500/10 bg-[#080c1e]/45 backdrop-blur-xl flex flex-col justify-between p-6 z-30 shadow-[0_0_30px_rgba(99,102,241,0.02)]">
        <div className="flex flex-col gap-8">
          
          {/* Logo & Online Status */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="tracking-[0.16em] text-lg font-semibold text-white uppercase font-sans leading-none">
                Veloce
              </span>
              <span className="text-[8px] tracking-widest text-indigo-405 uppercase font-mono mt-0.5">
                Corsair Core
              </span>
            </div>
            <span className="text-[9px] font-mono text-indigo-300 border border-indigo-500/20 px-2 py-0.5 bg-indigo-500/10 rounded-full tracking-wider flex items-center gap-1.5 shadow-[0_0_10px_rgba(99,102,241,0.1)]">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
              ACTIVE
            </span>
          </div>

          {/* Navigation */}
          <nav className="flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-x-visible">
            <a
              href="/workspace"
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-mono tracking-wider transition-all duration-300 ${
                pathname === "/workspace"
                  ? "bg-indigo-600/15 text-indigo-200 border border-indigo-500/30 shadow-[0_0_12px_rgba(99,102,241,0.1)]"
                  : "text-zinc-400 hover:text-zinc-100 hover:bg-[#0c122a]/40 border border-transparent"
              }`}
            >
              <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
              <span>AI WORKSPACE</span>
            </a>

            <a
              href="/mail"
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-mono tracking-wider transition-all duration-300 ${
                pathname === "/mail"
                  ? "bg-indigo-600/15 text-indigo-200 border border-indigo-500/30 shadow-[0_0_12px_rgba(99,102,241,0.1)]"
                  : "text-zinc-400 hover:text-zinc-100 hover:bg-[#0c122a]/40 border border-transparent"
              }`}
            >
              <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
              <span>INBOX THREADS</span>
            </a>

            <a
              href="/calender"
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-mono tracking-wider transition-all duration-300 ${
                pathname === "/calender"
                  ? "bg-indigo-600/15 text-indigo-200 border border-indigo-500/30 shadow-[0_0_12px_rgba(99,102,241,0.1)]"
                  : "text-zinc-400 hover:text-zinc-100 hover:bg-[#0c122a]/40 border border-transparent"
              }`}
            >
              <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
              <span>MY CALENDAR</span>
            </a>

            <a
              href="/settings"
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-mono tracking-wider transition-all duration-300 ${
                pathname === "/settings"
                  ? "bg-indigo-600/15 text-indigo-200 border border-indigo-500/30 shadow-[0_0_12px_rgba(99,102,241,0.1)]"
                  : "text-zinc-400 hover:text-zinc-100 hover:bg-[#0c122a]/40 border border-transparent"
              }`}
            >
              <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.43l-1.003.828c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.43l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.991l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.645-.869l.214-1.28z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>SETTINGS</span>
            </a>
          </nav>
        </div>

        {/* Sidebar Telemetry & Log Out */}
        <div className="flex flex-col gap-4 mt-8 md:mt-0">
          <div className="border-t border-indigo-500/10 pt-4 hidden md:block">
            <span className="text-[10px] font-mono text-indigo-400/80 tracking-widest uppercase block mb-1">TELEMETRY</span>
            <div className="text-xs text-zinc-400 font-light flex items-center gap-2 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              SYSTEMS NOMINAL
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 text-zinc-550 hover:text-rose-400 transition-colors text-xs font-mono tracking-wider w-full cursor-pointer border border-transparent hover:border-rose-500/20 hover:bg-rose-550/5 rounded-xl duration-300"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
            <span>DISCONNECT</span>
          </button>
        </div>
      </aside>

      {/* Main workspace container */}
      <main className="flex-1 flex flex-col p-6 md:p-8 overflow-hidden z-10">
        {children}
      </main>
    </div>
  )
}
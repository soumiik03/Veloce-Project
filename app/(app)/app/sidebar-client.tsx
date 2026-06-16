"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"

export function SidebarClient() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()
  
  
  const [chatRecents, setChatRecents] = useState<any[]>([])
  const [mailRecents, setMailRecents] = useState<any[]>([])
  const [calendarRecents, setCalendarRecents] = useState<any[]>([])
  const [fetchError, setFetchError] = useState<string | null>(null)

  
  useEffect(() => {
    const fetchRecents = async () => {
      setFetchError(null)

      
      if (pathname.includes("/chat")) {
        try {
          const res = await fetch("/api/agent/threads", { credentials: "include" })
          if (res.ok) {
            const data = await res.json()
            if (data.threads) {
              setChatRecents(data.threads.slice(0, 10))
            }
          } else if (res.status !== 401) {
            console.error("Error fetching chat recents: HTTP", res.status)
          }
        } catch (err) {
          console.error("Error fetching chat recents:", err)
          setFetchError("Failed to load chat recents")
        }
      }
      
      
      if (pathname.includes("/mail")) {
        try {
          const res = await fetch("/api/emails", { credentials: "include" })
          if (res.ok) {
            const data = await res.json()
            if (data.threads) {
              setMailRecents(data.threads.slice(0, 10))
            }
          } else if (res.status !== 401) {
            console.error("Error fetching mail recents: HTTP", res.status)
          }
        } catch (err) {
          console.error("Error fetching mail recents:", err)
          setFetchError("Failed to load mail recents")
        }
      }

      
      if (pathname.includes("/calendar")) {
        try {
          const res = await fetch("/api/calendar/events", { credentials: "include" })
          if (res.ok) {
            const data = await res.json()
            const eventItems = Array.isArray(data) ? data : data.items
            if (eventItems) {
              setCalendarRecents(
                eventItems.slice(0, 10).map((e: any) => ({
                  id: e.id,
                  subject: e.summary || "No Summary"
                }))
              )
            }
          } else if (res.status !== 401) {
            console.error("Error fetching calendar recents: HTTP", res.status)
          }
        } catch (err) {
          console.error("Error fetching calendar recents:", err)
          setFetchError("Failed to load calendar recents")
        }
      }
    }

    if (user?.id) {
      fetchRecents()
    }
  }, [pathname, user])


  
  const getActiveTab = () => {
    if (pathname.includes("/mail")) return "mail"
    if (pathname.includes("/calendar")) return "calendar"
    return "chat"
  }
  const activeTab = getActiveTab()

  
  const getRecentsList = () => {
    if (activeTab === "mail") return mailRecents
    if (activeTab === "calendar") return calendarRecents
    return chatRecents
  }
  const currentRecents = getRecentsList()

  
  const handleNewThreadClick = () => {
    if (activeTab === "chat") {
      router.push("/app/chat")
      window.dispatchEvent(new CustomEvent("veloce-new-chat"))
    } else if (activeTab === "mail") {
      window.dispatchEvent(new CustomEvent("veloce-new-mail"))
    } else if (activeTab === "calendar") {
      window.dispatchEvent(new CustomEvent("veloce-new-event"))
    }
  }

  const getRecentItemLink = (item: any) => {
    if (activeTab === "mail") return `/app/mail/${item.id}`
    if (activeTab === "calendar") return `/app/calendar?eventId=${item.id}`
    return `/app/chat/${item.id}`
  }

  return (
    <aside className="w-[240px] bg-[#111111] border-r-[0.5px] border-[#1a1a1a] flex flex-col justify-between shrink-0 h-screen sticky top-0 z-30 select-none">
      <div className="flex flex-col gap-4 overflow-hidden h-full">
        
        {}
        <div className="flex items-center justify-end text-[#555555] px-4 pt-3.5 pb-2">
          <div className="flex items-center gap-2">
            <button onClick={() => router.back()} className="w-5 h-5 flex items-center justify-center hover:text-[#e8e8e8] transition-[background,color] duration-100 ease-in cursor-pointer">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <button onClick={() => router.forward()} className="w-5 h-5 flex items-center justify-center hover:text-[#e8e8e8] transition-[background,color] duration-100 ease-in cursor-pointer">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>
        </div>

        {}
        <div className="bg-[#1a1a1a] p-[3px] rounded-[20px] flex items-center justify-between mx-3 mb-3">
          <Link 
            href="/app/chat" 
            className={`flex-1 text-center py-1.5 text-[13px] transition-[background,color] duration-100 ease-in ${
              activeTab === "chat" 
                ? "bg-[#ffffff] text-[#0d0d0d] font-semibold rounded-[18px]" 
                : "text-[#666666] hover:text-[#aaa]"
            }`}
          >
            Chat
          </Link>
          <Link 
            href="/app/mail" 
            className={`flex-1 text-center py-1.5 text-[13px] transition-[background,color] duration-100 ease-in ${
              activeTab === "mail" 
                ? "bg-[#ffffff] text-[#0d0d0d] font-semibold rounded-[18px]" 
                : "text-[#666666] hover:text-[#aaa]"
            }`}
          >
            Mail
          </Link>
          <Link 
            href="/app/calendar" 
            className={`flex-1 text-center py-1.5 text-[13px] transition-[background,color] duration-100 ease-in ${
              activeTab === "calendar" 
                ? "bg-[#ffffff] text-[#0d0d0d] font-semibold rounded-[18px]" 
                : "text-[#666666] hover:text-[#aaa]"
            }`}
          >
            Calendar
          </Link>
        </div>

        {}
        <button
          onClick={handleNewThreadClick}
          className="flex items-center justify-center gap-2 mx-3 py-2 bg-[#1e1e1e] border border-[#2a2a2a] hover:bg-[#252525] text-[#e0e0e0] text-[13px] font-medium rounded-lg transition-[background] duration-100 ease-in cursor-pointer select-none"
        >
          <span>+ New thread</span>
        </button>

        {}
        <div className="flex flex-col gap-1 text-[13px]">
          <Link
            href="/app/chat"
            className={`flex items-center gap-2.5 px-3 py-2 mx-2 transition-[background] duration-100 ease-in rounded-md ${
              pathname === "/app/chat" || pathname.startsWith("/app/chat/")
                ? "bg-[#1e1e1e] text-[#e0e0e0]" 
                : "text-[#888888] hover:text-[#e0e0e0] hover:bg-[#1a1a1a]/40"
            }`}
          >
            <svg 
              className={`w-4 h-4 transition-colors ${pathname === "/app/chat" || pathname.startsWith("/app/chat/") ? "text-[#e0e0e0]" : "text-[#555555]"}`}
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
            <span>Workspace Console</span>
          </Link>

          <Link
            href="/app/settings"
            className={`flex items-center gap-2.5 px-3 py-2 mx-2 transition-[background] duration-100 ease-in rounded-md ${
              pathname === "/app/settings" 
                ? "bg-[#1e1e1e] text-[#e0e0e0]" 
                : "text-[#888888] hover:text-[#e0e0e0] hover:bg-[#1a1a1a]/40"
            }`}
          >
            <svg 
              className={`w-4 h-4 transition-colors ${pathname === "/app/settings" ? "text-[#e0e0e0]" : "text-[#555555]"}`}
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.43l-1.003.828c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.43l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.991l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.645-.869l.214-1.28z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Settings Calibration</span>
          </Link>
        </div>

        {}
        <div className="flex-1 flex flex-col min-h-0 px-3">
          <span className="text-[10px] font-mono font-semibold text-[#333333] uppercase tracking-wider mb-2 select-none">
            RECENTS
          </span>
          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {fetchError ? (
              <span className="text-[11px] text-red-400/70 block py-1 font-mono italic select-none">
                {fetchError}
              </span>
            ) : currentRecents.length === 0 ? (
              <span className="text-[11px] text-[#444444] block py-1 font-mono italic select-none">
                No recent items
              </span>
            ) : (
              currentRecents.map((item) => (
                <Link
                  key={item.id}
                  href={getRecentItemLink(item)}
                  className={`block py-1 text-[13px] truncate transition-colors duration-100 ease-in ${
                    pathname.includes(item.id)
                      ? "text-[#e8e8e8] font-medium" 
                      : "text-[#666666] hover:text-[#aaa]"
                  }`}
                  title={item.subject}
                >
                  {item.subject}
                </Link>
              ))
            )}
          </div>
        </div>

      </div>

      {}
      <div className="border-t-[0.5px] border-[#1a1a1a] p-4 flex flex-col gap-2 shrink-0 bg-[#111111]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-[28px] h-[28px] rounded-full bg-[#1e3a5f] flex items-center justify-center text-[12px] font-bold text-[#5aa3e8] shrink-0 font-sans">
              {(user?.name || user?.email || "S").charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col overflow-hidden text-left">
              <span className="text-[13px] font-medium text-[#e8e8e8] truncate leading-tight">
                {user?.name || "Soumik"}
              </span>
              <span className="text-[11px] text-[#444444] leading-tight font-sans select-none">
                FREE PLAN
              </span>
            </div>
          </div>
          
          <button 
            onClick={logout}
            className="text-[#444444] hover:text-[#e8e8e8] transition-colors p-1 rounded cursor-pointer"
            title="Disconnect Console"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  )
}

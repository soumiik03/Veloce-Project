import { Suspense } from "react"
import { SidebarClient } from "./sidebar-client"

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-[#0d0d0d] text-[#e8e8e8] font-sans overflow-hidden w-full relative z-20">
      {/* Suspense wrapped Client Sidebar to prevent suspending the whole layout shell */}
      <Suspense fallback={<div className="w-[240px] bg-[#111111] shrink-0 h-screen border-r-[0.5px] border-[#1a1a1a]" />}>
        <SidebarClient />
      </Suspense>
      
      {/* Main workspace container */}
      <main className="flex-1 flex flex-col overflow-hidden relative min-h-screen bg-[#0d0d0d]">
        {children}
      </main>
    </div>
  )
}
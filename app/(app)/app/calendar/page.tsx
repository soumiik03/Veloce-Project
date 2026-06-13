export const unstable_instant = { prefetch: "static", unstable_disableValidation: true }

import { Suspense } from "react"
import { CalendarPageClient } from "./calendar-page-client"

export default async function CalendarPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center bg-[#0d0d0d] text-[#888888] font-mono text-[13px] h-screen">
        LOADING CALENDAR TELEMETRY...
      </div>
    }>
      <CalendarPageClient />
    </Suspense>
  )
}

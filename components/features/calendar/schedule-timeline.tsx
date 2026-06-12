import { CalendarEvent } from "@/types"

interface ScheduleTimelineProps {
  events: CalendarEvent[]
  onDelete: (id: string) => void
}

export function ScheduleTimeline({ events, onDelete }: ScheduleTimelineProps) {
  const getDays = () => {
    const days = []
    const startOfWeek = new Date()
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek)
      d.setDate(startOfWeek.getDate() + i)
      days.push(d)
    }
    return days
  }

  const days = getDays()

  return (
    <div className="grid grid-cols-1 md:grid-cols-7 gap-4 overflow-x-auto pb-4">
      {days.map((day, idx) => {
        const dayEvents = events.filter((e) => {
          if (!e.start.dateTime) return false
          const eDate = new Date(e.start.dateTime)
          return (
            eDate.getDate() === day.getDate() &&
            eDate.getMonth() === day.getMonth() &&
            eDate.getFullYear() === day.getFullYear()
          )
        })

        const dayName = day.toLocaleDateString("en-US", { weekday: "short" })
        const dateNum = day.getDate()

        return (
          <div key={idx} className="bg-[#151912]/50 border border-zinc-800/40 rounded-xl p-3 min-w-[140px] flex flex-col gap-3 h-[500px]">
            <div className="text-center border-b border-zinc-900 pb-2">
              <span className="text-[10px] font-mono text-zinc-500 uppercase block">{dayName}</span>
              <span className="text-base font-semibold text-white">{dateNum}</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {dayEvents.length === 0 ? (
                <div className="h-full flex items-center justify-center text-[10px] text-zinc-600 text-center font-mono">
                  FREE
                </div>
              ) : (
                dayEvents.map((event) => {
                  const startTime = event.start.dateTime
                    ? new Date(event.start.dateTime).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit"
                      })
                    : ""
                  return (
                    <div
                      key={event.id}
                      className="p-2.5 bg-[#1a1f16] border border-zinc-850 rounded-lg text-left relative group hover:border-zinc-700 transition-colors"
                    >
                      <h5 className="text-[11px] font-semibold text-zinc-200 truncate">{event.summary || "Event"}</h5>
                      <span className="text-[9px] font-mono text-zinc-500 block mt-0.5">{startTime}</span>

                      <button
                        onClick={() => onDelete(event.id)}
                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-zinc-500 hover:text-red-400 cursor-pointer"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

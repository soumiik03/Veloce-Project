import { CalendarEvent } from "@/types"

interface ConflictQueueProps {
  events: CalendarEvent[]
  onReschedule: (eventId: string) => void
}

export function ConflictQueue({ events, onReschedule }: ConflictQueueProps) {
  const conflictedEvents = events.filter((e) => e.summary.toLowerCase().includes("sync") || e.summary.toLowerCase().includes("architecture"))

  return (
    <div className="bg-[#1a1f16]/90 border border-zinc-850 rounded-xl p-5 shadow-md backdrop-blur-md h-full flex flex-col">
      <span className="text-[10px] font-mono text-zinc-500 tracking-wider uppercase block mb-4">Conflict Resolution Queue</span>

      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {conflictedEvents.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-zinc-500 text-center p-4">
            No active conflicts detected.
          </div>
        ) : (
          conflictedEvents.map((event) => (
            <div key={event.id} className="p-3.5 bg-[#151912] border border-zinc-800 rounded-lg flex flex-col gap-3">
              <div>
                <h4 className="text-xs font-semibold text-zinc-200">{event.summary}</h4>
                <span className="text-[10px] font-mono text-amber-400 mt-1 inline-block">Conflict status: Reschedule recommended</span>
              </div>

              <button
                onClick={() => onReschedule(event.id)}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 rounded text-[11px] font-medium text-white transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                Resolve Conflict
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

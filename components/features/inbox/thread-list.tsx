import { Thread } from "@/types"
import { StatusBadge } from "@/components/ui/status-badge"

interface ThreadListProps {
  threads: Thread[]
  selectedId: string | null
  onSelect: (id: string) => void
}

export function ThreadList({ threads, selectedId, onSelect }: ThreadListProps) {
  return (
    <div className="space-y-2.5 overflow-y-auto max-h-[550px] pr-1.5">
      {threads.map((thread) => {
        const isSelected = selectedId === thread.id
        const isReschedule = thread.snippet.toLowerCase().includes("reschedule") || thread.subject.toLowerCase().includes("reschedule")

        return (
          <div
            key={thread.id}
            onClick={() => onSelect(thread.id)}
            className={`p-4 rounded-xl border transition-all duration-350 cursor-pointer text-left relative overflow-hidden group ${
              isSelected
                ? "bg-indigo-950/20 border-indigo-500/40 shadow-[0_0_12px_rgba(99,102,241,0.08)]"
                : "bg-[#151912]/50 border-zinc-800/40 hover:border-zinc-700/80 hover:bg-[#1a1f16]/60"
            }`}
          >
            <div className="flex justify-between items-start gap-3 mb-1.5">
              <span className="text-xs font-semibold text-zinc-100 truncate w-3/4">{thread.from}</span>
              <span className="text-[9px] font-mono text-zinc-500 whitespace-nowrap">{thread.date}</span>
            </div>
            <h4 className="text-xs text-zinc-300 font-light truncate mb-2 leading-relaxed">{thread.subject}</h4>
            <p className="text-[11px] text-zinc-500 line-clamp-2 leading-relaxed font-light">{thread.snippet}</p>
            {isReschedule && (
              <div className="mt-3.5">
                <StatusBadge type="warning" pulse>
                  Reschedule vector detected
                </StatusBadge>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

import { Intent } from "@/types"
import { StatusBadge } from "@/components/ui/status-badge"

interface AIBreakdownProps {
  detection: Intent | null
}

export function AIBreakdown({ detection }: AIBreakdownProps) {
  if (!detection) return null

  const isMeeting = detection.isMeetingRelated
  const isReschedule = detection.isRescheduleRequest

  return (
    <div className="bg-[#151912] border border-zinc-800 rounded-xl p-4 space-y-4">
      <span className="text-[10px] font-mono text-zinc-500 tracking-wider uppercase block">
        Cognitive Intent Profile
      </span>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <span className="text-zinc-500 block text-[10px] uppercase font-mono mb-0.5">Classification</span>
          <span className="text-xs font-semibold text-zinc-200">
            {isMeeting ? "Scheduling Vector" : "General Feed"}
          </span>
        </div>

        <div>
          <span className="text-zinc-500 block text-[10px] uppercase font-mono mb-0.5">Confidence Matrix</span>
          <div className="flex items-center gap-2 mt-0.5">
            <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden border border-zinc-800">
              <div
                className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${detection.confidence * 100}%` }}
              />
            </div>
            <span className="text-[10px] font-mono text-zinc-300 font-bold">
              {(detection.confidence * 100).toFixed(0)}%
            </span>
          </div>
        </div>

        <div>
          <span className="text-zinc-500 block text-[10px] uppercase font-mono mb-1">State Target</span>
          <StatusBadge type={isReschedule ? "warning" : "info"}>
            {isReschedule ? "Reschedule Request" : "Direct Schedule"}
          </StatusBadge>
        </div>
      </div>

      {detection.attendees && detection.attendees.length > 0 && (
        <div className="border-t border-zinc-900 pt-3">
          <span className="text-zinc-500 block text-[10px] uppercase font-mono mb-1.5">Identified Entities</span>
          <div className="flex flex-wrap gap-1.5">
            {detection.attendees.map((email, idx) => (
              <span
                key={idx}
                className="bg-zinc-900/80 text-zinc-300 border border-zinc-850 px-2 py-0.5 rounded text-[10px] font-mono"
              >
                {email}
              </span>
            ))}
          </div>
        </div>
      )}

      {detection.suggestedTimes && detection.suggestedTimes.length > 0 && (
        <div className="border-t border-zinc-900 pt-3">
          <span className="text-zinc-500 block text-[10px] uppercase font-mono mb-1.5">Parsed Constraints</span>
          <div className="space-y-1">
            {detection.suggestedTimes.map((time, idx) => (
              <div key={idx} className="text-[11px] text-zinc-400 font-mono flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500/50"></span>
                <span>{time}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

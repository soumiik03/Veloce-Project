import { useEffect, useRef } from "react"

interface OrchestrationConsoleProps {
  logs: string[]
  visible: boolean
}

export function OrchestrationConsole({ logs, visible }: OrchestrationConsoleProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [logs])

  if (!visible) return null

  return (
    <div className="bg-[#151912] border border-zinc-800 rounded-xl p-4 flex flex-col gap-2">
      <span className="text-[10px] font-mono text-zinc-500 tracking-wider uppercase block">
        Microservice Orchestration Log
      </span>
      <div
        ref={containerRef}
        className="bg-[#0b0e0a] border border-zinc-900 rounded-lg p-3.5 h-[160px] overflow-y-auto font-mono text-[10px] text-zinc-400 space-y-1.5"
      >
        {logs.length === 0 ? (
          <div className="text-zinc-600 animate-pulse">AWAITING TRIGGER SIGNAL...</div>
        ) : (
          logs.map((log, idx) => {
            const isSuccess = log.includes("[SUCCESS]")
            const isError = log.includes("[ERROR]")
            let color = "text-zinc-500"
            if (isSuccess) color = "text-green-400 font-bold"
            else if (isError) color = "text-red-400 font-bold"

            return (
              <div key={idx} className={`${color} leading-relaxed`}>
                {log}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

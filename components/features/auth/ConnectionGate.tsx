import { useState } from "react"

interface ConnectionStatus {
  gmail: boolean
  googlecalendar: boolean
  connected: boolean
}

interface ConnectionGateProps {
  status: ConnectionStatus
  onConnect: (plugin: "gmail" | "googlecalendar") => void
  onBypass: () => void
  connectingPlugin: string | null
}

export function ConnectionGate({ status, onConnect, onBypass, connectingPlugin }: ConnectionGateProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0d0d0d] p-6">
      <div className="w-full max-w-[420px] bg-[#111111] border border-[#1e1e1e] rounded-xl p-8 flex flex-col items-center">
        
        {/* Title */}
        <h1 className="text-[20px] font-bold tracking-[0.15em] text-[#e8e8e8] uppercase mb-1 font-sans">
          VELOCE
        </h1>
        <p className="text-[13px] text-[#888888] mb-8">
          Connect your accounts
        </p>

        {/* Channels Card */}
        <div className="w-full bg-[#141414] border border-[#1e1e1e] rounded-lg p-5 space-y-5 mb-8 text-left">
          {/* Gmail Connection Row */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                {status.gmail && <span className="text-[#3a7a3a] text-xs">✓</span>}
                <span className="text-[13px] font-medium text-[#e8e8e8]">Gmail</span>
              </div>
              <span className="text-[11px] text-[#555555]">
                {status.gmail ? "Connected · soumik@gmail.com" : "Not connected"}
              </span>
            </div>
            {!status.gmail && (
              <button
                onClick={() => onConnect("gmail")}
                disabled={connectingPlugin !== null}
                className="px-3 py-1 bg-[#1a1a1a] border border-[#2a2a2a] text-xs text-[#e8e8e8] rounded hover:bg-[#252525] transition-colors cursor-pointer disabled:opacity-55"
              >
                {connectingPlugin === "gmail" ? "Connecting..." : "Connect"}
              </button>
            )}
          </div>

          {/* Calendar Connection Row */}
          <div className="flex items-center justify-between border-t border-[#1e1e1e]/60 pt-4">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                {status.googlecalendar && <span className="text-[#3a7a3a] text-xs">✓</span>}
                <span className="text-[13px] font-medium text-[#e8e8e8]">Google Calendar</span>
              </div>
              <span className="text-[11px] text-[#555555]">
                {status.googlecalendar ? "Connected" : "Not connected"}
              </span>
            </div>
            {!status.googlecalendar && (
              <button
                onClick={() => onConnect("googlecalendar")}
                disabled={connectingPlugin !== null}
                className="px-3 py-1 bg-[#1a1a1a] border border-[#2a2a2a] text-xs text-[#e8e8e8] rounded hover:bg-[#252525] transition-colors cursor-pointer disabled:opacity-55"
              >
                {connectingPlugin === "googlecalendar" ? "Connecting..." : "Connect"}
              </button>
            )}
          </div>
        </div>

        {/* Enter Button */}
        <button
          onClick={onBypass}
          disabled={!status.gmail || !status.googlecalendar}
          className={`w-full py-2.5 rounded text-xs font-medium transition-all ${
            status.gmail && status.googlecalendar
              ? "bg-[#1e1e1e] hover:bg-[#252525] text-[#e0e0e0] cursor-pointer"
              : "bg-[#141414] text-[#333333] cursor-not-allowed border border-[#1e1e1e]/30"
          }`}
        >
          Enter Veloce Workspace
        </button>
      </div>
    </div>
  )
}

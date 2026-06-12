import React from "react"

interface StatusBadgeProps {
  children: React.ReactNode
  type?: "success" | "warning" | "danger" | "info" | "neutral"
  pulse?: boolean
}

export function StatusBadge({
  children,
  type = "neutral",
  pulse = false,
}: StatusBadgeProps) {
  const baseStyles = "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-mono border tracking-wider uppercase"
  let colorStyles = ""

  if (type === "success") {
    colorStyles = "text-green-400 bg-green-500/10 border-green-500/20"
  } else if (type === "warning") {
    colorStyles = "text-amber-400 bg-amber-500/10 border-amber-500/20"
  } else if (type === "danger") {
    colorStyles = "text-red-400 bg-red-500/10 border-red-500/20"
  } else if (type === "info") {
    colorStyles = "text-indigo-400 bg-indigo-500/10 border-indigo-500/20"
  } else if (type === "neutral") {
    colorStyles = "text-zinc-400 bg-zinc-900 border-zinc-800"
  }

  return (
    <span className={`${baseStyles} ${colorStyles}`}>
      {pulse ? (
        <span className={`w-1 h-1 rounded-full ${
          type === "success" ? "bg-green-400 animate-pulse" :
          type === "warning" ? "bg-amber-400 animate-pulse" :
          type === "danger" ? "bg-red-400 animate-pulse" :
          "bg-indigo-400 animate-pulse"
        }`} />
      ) : null}
      {children}
    </span>
  )
}

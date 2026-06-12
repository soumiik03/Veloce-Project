import React from "react"

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function Input({
  label,
  error,
  className = "",
  type = "text",
  ...props
}: InputProps) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label ? (
        <label className="text-[10px] font-mono font-medium text-zinc-500 uppercase tracking-wider">
          {label}
        </label>
      ) : null}
      <input
        type={type}
        className={`w-full bg-[#151912] border ${
          error ? "border-red-500/50 focus:border-red-500/80" : "border-zinc-800 focus:border-indigo-500/50"
        } rounded-lg px-4 py-3 text-sm text-zinc-300 placeholder:text-zinc-700 focus:outline-none focus:ring-1 ${
          error ? "focus:ring-red-500/50" : "focus:ring-indigo-500/50"
        } transition-all ${className}`}
        {...props}
      />
      {error ? (
        <span className="text-[10px] text-red-400 font-mono tracking-tight">{error}</span>
      ) : null}
    </div>
  )
}

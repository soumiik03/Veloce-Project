import React from "react"

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function Card({ children, className = "", ...props }: CardProps) {
  return (
    <div
      className={`bg-[#1a1f16]/90 border border-zinc-800/60 rounded-xl p-6 shadow-lg backdrop-blur-md relative overflow-hidden group transition-all duration-300 hover:border-zinc-700/80 ${className}`}
      {...props}
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none transition-opacity group-hover:opacity-100 opacity-50" />
      {children}
    </div>
  )
}

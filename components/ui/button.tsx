import React from "react"

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
  variant?: "primary" | "secondary" | "danger" | "ghost"
  loading?: boolean
}

export function Button({
  children,
  variant = "primary",
  loading = false,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles = "relative px-6 py-3 rounded-lg text-xs font-semibold tracking-tight transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none"
  let variantStyles = ""

  if (variant === "primary") {
    variantStyles = "bg-zinc-100 hover:bg-white text-[#151912] shadow-md active:scale-98"
  } else if (variant === "secondary") {
    variantStyles = "bg-[#151912] hover:bg-[#1c2219] border border-zinc-800 text-zinc-300 active:scale-98"
  } else if (variant === "danger") {
    variantStyles = "bg-red-950/20 hover:bg-red-950/40 border border-red-500/30 text-red-400 active:scale-98"
  } else if (variant === "ghost") {
    variantStyles = "text-zinc-500 hover:text-zinc-200 bg-transparent active:scale-98"
  }

  return (
    <button
      disabled={disabled || loading}
      className={`${baseStyles} ${variantStyles} ${className}`}
      {...props}
    >
      {loading ? (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : null}
      {children}
    </button>
  )
}

"use client"

import { useState } from "react"

export default function RegisterPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess("")

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      setLoading(false)
      return
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, confirmPassword, name }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (typeof data.error === "object" && data.error !== null) {
          const fieldErrors = data.error.fieldErrors || {}
          const formErrors = data.error.formErrors || []
          const firstFieldError = Object.values(fieldErrors).flatMap((errs: any) => Array.isArray(errs) ? errs : [])[0]
          const firstFormError = Array.isArray(formErrors) ? formErrors[0] : null
          setError(firstFieldError || firstFormError || "Validation failed")
        } else if (data.error === "DUPLICATE_EMAIL") {
          setError("An account with this email already exists")
        } else if (data.error === "REGISTRATION_FAILED") {
          setError("Failed to create account. Please try again.")
        } else {
          setError(typeof data.error === "string" ? data.error : "Registration failed")
        }
        setLoading(false)
        return
      }

      setSuccess("Account created successfully! Auto-logging in...")

      const loginRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      if (loginRes.ok) {
        window.location.href = "/mail"
      } else {
        window.location.href = "/login"
      }
    } catch (err) {
      setError("Network connection error")
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center p-6 min-h-screen relative">
      {/* Glow highlight behind card */}
      <div className="pointer-events-none absolute w-[300px] h-[300px] rounded-full bg-indigo-500/5 blur-[80px] -z-10 animate-pulse"></div>

      <div className="w-full max-w-md p-8 md:p-10 bg-[#080c1e]/45 border border-indigo-500/15 rounded-2xl shadow-[0_0_35px_rgba(99,102,241,0.05)] backdrop-blur-xl">
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white font-extrabold text-sm shadow-[0_0_15px_rgba(99,102,241,0.25)] mb-3">
            V
          </div>
          <h1 className="text-xl font-semibold text-white tracking-widest uppercase font-sans mb-1">Veloce</h1>
          <p className="text-[11px] font-mono text-indigo-400/80 uppercase tracking-wider">Create Rescheduling Account</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {error && (
            <div className="p-3 bg-rose-950/20 border border-rose-500/20 text-rose-400 text-xs rounded-xl font-mono">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 bg-indigo-950/20 border border-indigo-500/20 text-indigo-300 text-xs rounded-xl font-mono">
              {success}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-mono font-medium text-zinc-500 uppercase tracking-wider">Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Soumik"
              className="w-full bg-[#040816] border border-indigo-500/10 rounded-xl px-4 py-3 text-sm text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/40 transition-all duration-300"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-mono font-medium text-zinc-500 uppercase tracking-wider">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="soumik@example.com"
              className="w-full bg-[#040816] border border-indigo-500/10 rounded-xl px-4 py-3 text-sm text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/40 transition-all duration-300"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-mono font-medium text-zinc-500 uppercase tracking-wider">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full bg-[#040816] border border-indigo-500/10 rounded-xl px-4 py-3 text-sm text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/40 transition-all duration-300"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-mono font-medium text-zinc-500 uppercase tracking-wider">Confirm Password</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full bg-[#040816] border border-indigo-500/10 rounded-xl px-4 py-3 text-sm text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/40 transition-all duration-300"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 mt-2 bg-indigo-600 hover:bg-indigo-500 text-white disabled:bg-zinc-800 disabled:text-zinc-500 rounded-xl font-semibold text-xs font-mono tracking-wider transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer shadow-[0_4px_15px_rgba(99,102,241,0.2)] hover:shadow-[0_4px_20px_rgba(99,102,241,0.35)]"
          >
            {loading ? "CREATING ACCOUNT..." : "CREATE ACCOUNT"}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </button>

          <div className="flex items-center my-1.5">
            <div className="flex-1 border-t border-indigo-500/10"></div>
            <span className="px-3 text-[10px] font-mono text-zinc-550 uppercase tracking-widest">or</span>
            <div className="flex-1 border-t border-indigo-500/10"></div>
          </div>

          <a
            href="/api/auth/google"
            className="w-full py-4 bg-[#080d24] border border-indigo-500/15 hover:border-indigo-500/35 text-zinc-300 rounded-xl font-semibold text-xs font-mono tracking-wider transition-all duration-300 flex items-center justify-center gap-3 cursor-pointer hover:bg-[#0c122e] shadow-md"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
            </svg>
            <span>SIGN UP WITH GOOGLE</span>
          </a>

          <div className="text-center mt-1">
            <a href="/login" className="text-xs font-mono text-zinc-500 hover:text-indigo-400 transition-colors">
              Have an account? Log In
            </a>
          </div>
        </form>
      </div>
    </div>
  )
}

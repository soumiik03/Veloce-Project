"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setMessage("")

    try {
      const res = await fetch("/api/auth/reset-password-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      if (res.ok) {
        setMessage("Verification link sent successfully. Check your mailbox.")
      } else {
        setError("User with this email was not found.")
      }
    } catch (err) {
      setError("Network connection failed.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center p-6 min-h-screen">
      <div className="w-full max-w-md p-8 md:p-10 bg-[#1a1f16]/90 border border-zinc-850 rounded-2xl shadow-xl backdrop-blur-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-light text-white tracking-tight uppercase font-sans mb-1">Veloce</h1>
          <p className="text-xs text-zinc-500 font-light">Recover access credentials</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {error && (
            <div className="p-3 bg-red-950/20 border border-red-500/20 text-red-400 text-xs rounded">
              {error}
            </div>
          )}
          {message && (
            <div className="p-3 bg-green-950/20 border border-green-500/20 text-green-400 text-xs rounded">
              {message}
            </div>
          )}

          <Input
            label="Email Address"
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="soumik@example.com"
          />

          <Button type="submit" loading={loading} className="w-full">
            Transmit Reset Request
          </Button>

          <div className="text-center mt-2">
            <a href="/login" className="text-xs text-zinc-500 hover:text-indigo-400 transition-colors">
              Return to Login
            </a>
          </div>
        </form>
      </div>
    </div>
  )
}

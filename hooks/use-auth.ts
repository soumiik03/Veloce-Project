import { useEffect, useState } from "react"

export interface User {
  id: string
  email: string
  name?: string
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      const cookie = document.cookie.split("; ").find(row => row.startsWith("accessToken="))
      if (!cookie) {
        setUser(null)
        setLoading(false)
        return
      }

      const token = cookie.split("=")[1]
      try {
        const parts = token.split(".")
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")))
          if (payload && payload.userId) {
            setUser({
              id: payload.userId,
              email: payload.email || "",
              name: payload.name || ""
            })
          }
        }
      } catch (err) {
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  const logout = async () => {
    try {
      const cookieVal = document.cookie
        .split("; ")
        .find(row => row.startsWith("accessToken="))
        ?.split("=")[1]

      await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${cookieVal || ""}`
        }
      })
    } catch (err) {
      console.error(err)
    }
    document.cookie = "accessToken=; Max-Age=0; path=/;"
    document.cookie = "refreshToken=; Max-Age=0; path=/;"
    window.location.href = "/"
  }

  return { user, loading, logout }
}

import { useAuth as useClerkAuth, useUser } from "@clerk/nextjs"
import { useMemo } from "react"

export interface User {
  id: string
  email: string
  name?: string
}

export function useAuth() {
  const { isLoaded, userId, signOut } = useClerkAuth()
  const { user: clerkUser } = useUser()

  
  
  const user: User | null = useMemo(() => {
    if (!isLoaded || !userId || !clerkUser) return null
    return {
      id: userId,
      email: clerkUser.primaryEmailAddress?.emailAddress || "",
      name: clerkUser.fullName || "",
    }
  }, [isLoaded, userId, clerkUser])

  const loading = !isLoaded

  const logout = async () => {
    try {
      await signOut()
    } catch (err) {
      console.error("Clerk signout error:", err)
    }
    window.location.href = "/"
  }

  return { user, loading, logout }
}

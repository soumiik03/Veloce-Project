import { useAuth as useClerkAuth, useUser } from "@clerk/nextjs"

export interface User {
  id: string
  email: string
  name?: string
}

export function useAuth() {
  const { isLoaded, userId, signOut } = useClerkAuth()
  const { user: clerkUser } = useUser()

  const user: User | null = isLoaded && userId && clerkUser ? {
    id: userId,
    email: clerkUser.primaryEmailAddress?.emailAddress || "",
    name: clerkUser.fullName || ""
  } : null

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

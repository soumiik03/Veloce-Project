import { auth, currentUser } from "@clerk/nextjs/server"
import type { NextRequest } from "next/server"
import { isDynamicUsageError, verifyAccessToken } from "@/lib/auth/jwt"
import { db } from "@/db"
import { users } from "@/db/schema"
import { eq } from "drizzle-orm"
import { cookies } from "next/headers"

export async function getSessionUser(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  req?: NextRequest
) {
  try {
    // 1. Try Clerk session
    const session = await auth()
    if (session && session.userId) {
      const user = await currentUser()
      const email = user?.emailAddresses[0]?.emailAddress || ""
      const name = user?.fullName || ""

      if (email) {
        // Upsert user in database and return their DB UUID
        const [dbUser] = await db
          .insert(users)
          .values({
            email: email.toLowerCase(),
            name: name ?? null,
            emailVerified: new Date(),
          })
          .onConflictDoUpdate({
            target: users.email,
            set: { name: name ?? null, emailVerified: new Date() },
          })
          .returning()

        return {
          id: dbUser.id, // Return the DB UUID
          email: dbUser.email,
          name: dbUser.name || "",
        }
      }
    }
  } catch (e) {
    if (isDynamicUsageError(e)) {
      throw e
    }
    console.error("Clerk session resolution failed, falling back:", e)
  }

  // 2. Try cookie session (fallback/direct auth)
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get("accessToken")?.value
    if (accessToken) {
      const payload = verifyAccessToken(accessToken)
      if (payload) {
        const [dbUser] = await db
          .select()
          .from(users)
          .where(eq(users.id, payload.userId))
          .limit(1)
        
        if (dbUser) {
          return {
            id: dbUser.id,
            email: dbUser.email,
            name: dbUser.name || "",
          }
        }
      }
    }
  } catch (e) {
    if (isDynamicUsageError(e)) {
      throw e
    }
    console.error("Cookie session resolution failed:", e)
  }

  return null
}
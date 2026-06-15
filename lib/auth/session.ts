import { auth, currentUser } from "@clerk/nextjs/server"
import type { NextRequest } from "next/server"
import { db } from "@/db"
import { users } from "@/db/schema"
import { eq } from "drizzle-orm"

/**
 * Resolves the currently authenticated Clerk user to their database record.
 * Auto-provisions the user in the DB if they don't exist yet.
 */
export async function getSessionUser(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  req?: NextRequest
) {
  try {
    const session = await auth()
    if (session && session.userId) {
      const clerkId = session.userId
      
      // 1. Try to find the user by clerkId
      let [dbUser] = await db
        .select()
        .from(users)
        .where(eq(users.clerkId, clerkId))
        .limit(1)

      if (!dbUser) {
        // 2. Fetch from Clerk to create the user
        const user = await currentUser()
        const email = user?.emailAddresses[0]?.emailAddress || ""
        const name = user?.fullName || ""

        if (email) {
          // Check if a user with this email already exists (fallback)
          const [existingByEmail] = await db
            .select()
            .from(users)
            .where(eq(users.email, email.toLowerCase()))
            .limit(1)

          if (existingByEmail) {
            [dbUser] = await db
              .update(users)
              .set({ clerkId, name: name || existingByEmail.name })
              .where(eq(users.id, existingByEmail.id))
              .returning()
          } else {
            [dbUser] = await db
              .insert(users)
              .values({
                clerkId,
                email: email.toLowerCase(),
                name: name || null,
              })
              .returning()
          }
        }
      }

      if (dbUser) {
        return {
          id: dbUser.id, // DB UUID
          clerkId: dbUser.clerkId,
          email: dbUser.email,
          name: dbUser.name || "",
        }
      }
    }
  } catch (e) {
    console.error("Clerk session resolution failed:", e)
  }

  return null
}

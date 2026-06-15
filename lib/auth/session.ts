import { auth, currentUser } from "@clerk/nextjs/server"
import type { NextRequest } from "next/server"
import { db } from "@/db"
import { users } from "@/db/schema"
import { eq } from "drizzle-orm"


export async function getSessionUser(
  
  req?: NextRequest
) {
  try {
    const session = await auth()
    if (session && session.userId) {
      const clerkId = session.userId
      
      
      let [dbUser] = await db
        .select()
        .from(users)
        .where(eq(users.clerkId, clerkId))
        .limit(1)

      if (!dbUser) {
        
        const user = await currentUser()
        const email = user?.emailAddresses[0]?.emailAddress || ""
        const name = user?.fullName || ""

        if (email) {
          
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
          id: dbUser.id, 
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

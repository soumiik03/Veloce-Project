import { auth, currentUser } from "@clerk/nextjs/server"
import type { NextRequest } from "next/server"
import { db } from "@/db"
import { users } from "@/db/schema"
import { eq } from "drizzle-orm"


export async function getSessionUser(
  req?: NextRequest
) {
  console.log("[getSessionUser] Starting session resolution...");
  if (req) {
    const cookies = req.headers.get("cookie") || "";
    console.log(`[getSessionUser] Request host: ${req.headers.get("host")}`);
    console.log(`[getSessionUser] Request cookies present: ${!!cookies}`);
  } else {
    console.log("[getSessionUser] No request object passed.");
  }

  try {
    const session = await auth()
    console.log(`[getSessionUser] auth() called. Session resolved: ${!!session}`);
    if (session) {
      console.log(`[getSessionUser] session.userId: ${session.userId}`);
    } else {
      console.log("[getSessionUser] session is null or undefined");
    }

    if (session && session.userId) {
      const clerkId = session.userId
      console.log(`[getSessionUser] Resolving user from DB for clerkId: ${clerkId}`);
      
      let dbUser;
      try {
        const results = await db
          .select()
          .from(users)
          .where(eq(users.clerkId, clerkId))
          .limit(1);
        dbUser = results[0];
        console.log(`[getSessionUser] DB query finished. User found: ${!!dbUser}`);
      } catch (dbError: any) {
        console.error("[getSessionUser] Database query for user failed:", dbError);
        throw dbError;
      }

      if (!dbUser) {
        console.log("[getSessionUser] User not found in DB. Fetching from Clerk using currentUser()...");
        const user = await currentUser()
        console.log(`[getSessionUser] currentUser() fetched: ${!!user}`);
        const email = user?.emailAddresses[0]?.emailAddress || ""
        const name = user?.fullName || ""
        console.log(`[getSessionUser] User details from Clerk - email: ${email}, name: ${name}`);

        if (email) {
          console.log(`[getSessionUser] Searching DB for existing user by email: ${email}`);
          try {
            const [existingByEmail] = await db
              .select()
              .from(users)
              .where(eq(users.email, email.toLowerCase()))
              .limit(1)

            if (existingByEmail) {
              console.log(`[getSessionUser] Found existing user by email (ID: ${existingByEmail.id}). Updating with clerkId...`);
              const results = await db
                .update(users)
                .set({ clerkId, name: name || existingByEmail.name })
                .where(eq(users.id, existingByEmail.id))
                .returning()
              dbUser = results[0];
              console.log("[getSessionUser] User updated successfully in DB.");
            } else {
              console.log(`[getSessionUser] Inserting new user for email: ${email}`);
              const results = await db
                .insert(users)
                .values({
                  clerkId,
                  email: email.toLowerCase(),
                  name: name || null,
                })
                .returning()
              dbUser = results[0];
              console.log("[getSessionUser] New user inserted successfully in DB.");
            }
          } catch (dbError: any) {
            console.error("[getSessionUser] DB operation for new/existing user failed:", dbError);
            throw dbError;
          }
        } else {
          console.log("[getSessionUser] No email found for Clerk user. Cannot provision in DB.");
        }
      }

      if (dbUser) {
        console.log(`[getSessionUser] Session user successfully resolved. ID: ${dbUser.id}`);
        return {
          id: dbUser.id, 
          clerkId: dbUser.clerkId,
          email: dbUser.email,
          name: dbUser.name || "",
        }
      } else {
        console.log("[getSessionUser] dbUser is null after provisioning attempts.");
      }
    } else {
      console.log("[getSessionUser] No active session or userId from Clerk.");
    }
  } catch (e: any) {
    console.error("Clerk session resolution failed with exception:", e)
  }

  console.log("[getSessionUser] Session user resolution failed, returning null");
  return null
}

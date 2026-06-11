import bcrypt from "bcryptjs"
import { db } from "@/db"
import { accounts, users } from "@/db/schema"
import { and, eq } from "drizzle-orm"
import { provisionTenant } from "@/lib/corsair/tenant"

export interface GoogleOAuthProfile {
  id: string
  email: string
  name?: string | null
  image?: string | null
  accessToken: string
  refreshToken?: string | null
  accessTokenExpiresAt?: Date
}

export async function validatePassword(email: string, password: string) {
  const user = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1)
  if (!user.length || !user[0].password) return null

  const isValid = await bcrypt.compare(password, user[0].password)
  if (!isValid) return null

  return {
    user: {
      id: user[0].id,
      email: user[0].email,
      name: user[0].name,
    },
  }
}

export async function upsertGoogleAccount(
  profile: GoogleOAuthProfile,
  linkingUserId?: string
) {
  const googleUserId = profile.id
  const googleEmail = profile.email.toLowerCase()
  const googleName = profile.name ?? null
  const googleAccessToken = profile.accessToken
  const googleRefreshToken = profile.refreshToken
  const expiresAt = Math.floor((profile.accessTokenExpiresAt?.getTime() ?? Date.now() + 3600 * 1000) / 1000)

  const result = await db.transaction(async (tx) => {
    const existingAccount = await tx
      .select()
      .from(accounts)
      .where(and(eq(accounts.provider, "google"), eq(accounts.providerAccountId, googleUserId)))
      .limit(1)

    if (existingAccount.length) {
      await tx
        .update(accounts)
        .set({
          access_token: googleAccessToken,
          ...(googleRefreshToken ? { refresh_token: googleRefreshToken } : {}),
          expires_at: expiresAt,
          updatedAt: new Date(),
        })
        .where(eq(accounts.id, existingAccount[0].id))

      return {
        user: {
          id: existingAccount[0].userId,
          email: googleEmail,
          name: googleName,
        },
        isNewUser: false,
      }
    }

    const existingUserByEmail = await tx
      .select()
      .from(users)
      .where(eq(users.email, googleEmail.toLowerCase()))
      .limit(1)

    if (linkingUserId && existingUserByEmail.length && existingUserByEmail[0].id !== linkingUserId) {
      throw new Error("This Google email is already associated with another account")
    }

    if (existingUserByEmail.length && linkingUserId) {
      await tx.insert(accounts).values({
        userId: linkingUserId,
        type: "oauth",
        provider: "google",
        providerAccountId: googleUserId,
        access_token: googleAccessToken,
        refresh_token: googleRefreshToken || null,
        expires_at: expiresAt,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      return {
        user: {
          id: linkingUserId,
          email: existingUserByEmail[0].email,
          name: existingUserByEmail[0].name,
        },
        isNewUser: false,
      }
    }

    const userId = crypto.randomUUID()
    const now = new Date()

    await tx.insert(users).values({
      id: userId,
      email: googleEmail,
      name: googleName,
      image: profile.image ?? null,
      emailVerified: now,
      createdAt: now,
      updatedAt: now,
      password: null,
    })

    await tx.insert(accounts).values({
      userId,
      type: "oauth",
      provider: "google",
      providerAccountId: googleUserId,
      access_token: googleAccessToken,
      refresh_token: googleRefreshToken || null,
      expires_at: expiresAt,
      createdAt: now,
      updatedAt: now,
    })

    try {
      await provisionTenant(userId)
    } catch (error) {
      console.error("Failed to provision Corsair tenant:", error)
    }

    return {
      user: {
        id: userId,
        email: googleEmail,
        name: googleName,
      },
      isNewUser: true,
    }
  })

  return result
}

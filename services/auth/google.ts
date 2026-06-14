import { db } from '@/db'
import { users, accounts, refreshTokens } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { upsertGoogleAccount, type GoogleOAuthProfile } from '@/lib/auth/oauth'
import { provisionTenant } from '@/lib/corsair/tenant'
import { corsair } from '@/lib/corsair'
import { createAccessToken, createRefreshToken, getRefreshTokenExpiryMs } from '@/lib/auth/jwt'

interface CorsairIntegration {
  keys: {
    set_access_token: (token: string) => Promise<unknown>
    set_refresh_token: (token: string) => Promise<unknown>
    set_expires_at: (expiresAt: string) => Promise<unknown>
  }
}

export interface GoogleOAuthResult {
  userId: string
  email: string
  isNewUser: boolean
  accessToken: string
  refreshToken: string
  expiresIn: number
}

/**
 * Handle Google OAuth callback
 * Implements:
 * - Atomic upsert to prevent duplicate users
 * - Account linking with no duplicate users
 * - Immediate Corsair tenant provisioning for new users
 */
export async function handleGoogleOAuth(profile: GoogleOAuthProfile): Promise<GoogleOAuthResult> {
  // Atomic upsert: creates user or links account
  const { user: oauthUser, isNewUser } = await upsertGoogleAccount(profile)

  // Always ensure Corsair tenant is provisioned (idempotent)
  await provisionTenant(oauthUser.id)

  // Recover refresh token from Drizzle database if Google didn't return one
  let storedRefreshToken = profile.refreshToken
  if (!storedRefreshToken) {
    const [existingAcc] = await db
      .select({ refresh_token: accounts.refresh_token })
      .from(accounts)
      .where(and(eq(accounts.userId, oauthUser.id), eq(accounts.provider, "google")))
      .limit(1)
    if (existingAcc?.refresh_token) {
      storedRefreshToken = existingAcc.refresh_token
    }
  }

  // Automatically link Google OAuth tokens into Corsair Gmail & Google Calendar integrations
  const tenant = corsair.withTenant(oauthUser.id)
  const gmailIntegration = tenant.gmail as unknown as CorsairIntegration
  const calendarIntegration = tenant.googlecalendar as unknown as CorsairIntegration

  try {
    await gmailIntegration.keys.set_access_token(profile.accessToken)
    if (storedRefreshToken) {
      await gmailIntegration.keys.set_refresh_token(storedRefreshToken)
    }
    if (profile.accessTokenExpiresAt) {
      const expiresAtSecStr = String(Math.floor(profile.accessTokenExpiresAt.getTime() / 1000))
      await gmailIntegration.keys.set_expires_at(expiresAtSecStr)
    }
  } catch (err) {
    console.error("Failed to auto-link Gmail keys in Corsair:", err)
  }

  try {
    await calendarIntegration.keys.set_access_token(profile.accessToken)
    if (storedRefreshToken) {
      await calendarIntegration.keys.set_refresh_token(storedRefreshToken)
    }
    if (profile.accessTokenExpiresAt) {
      const expiresAtSecStr = String(Math.floor(profile.accessTokenExpiresAt.getTime() / 1000))
      await calendarIntegration.keys.set_expires_at(expiresAtSecStr)
    }
  } catch (err) {
    console.error("Failed to auto-link Google Calendar keys in Corsair:", err)
  }

  // Get user to return updated data
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, oauthUser.id))
    .limit(1)

  if (!user) {
    throw new Error('User not found after OAuth')
  }

  // Create tokens
  const accessToken = createAccessToken(user.id, user.email)
  const refreshTokenValue = createRefreshToken(user.id, 1)

  // Store refresh token with expiry
  const expiryMs = getRefreshTokenExpiryMs()
  await db.insert(refreshTokens).values({
    userId: user.id,
    token: refreshTokenValue,
    expiresAt: new Date(Date.now() + expiryMs),
    createdAt: new Date(),
  })

  return {
    userId: user.id,
    email: user.email,
    isNewUser,
    accessToken,
    refreshToken: refreshTokenValue,
    expiresIn: 15 * 60, // 15 minutes in seconds
  }
}

/**
 * On-demand check to ensure Google access tokens are valid before calling APIs.
 * If expired, refreshes them via refresh token and syncs to Corsair.
 */
export async function ensureGoogleTokens(userId: string): Promise<boolean> {
  try {
    // 1. Fetch the Google account for this user from Drizzle
    const [account] = await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.userId, userId), eq(accounts.provider, "google")))
      .limit(1)

    if (!account) return false

    const nowSeconds = Math.floor(Date.now() / 1000)
    // Check if token is expired or close to expiry (within 5 minutes)
    if (account.expires_at && account.expires_at < nowSeconds + 300) {
      if (!account.refresh_token) {
        console.warn("Google account token is expired and refresh token is missing in Drizzle.")
        return false
      }

      console.log(`[google-refresh] Access token expired/expiring for user ${userId}. Refreshing...`)

      const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          refresh_token: account.refresh_token,
          grant_type: "refresh_token",
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error_description || "Refresh token request failed")
      }

      const newAccessToken = data.access_token
      const newExpiresAt = Math.floor(Date.now() / 1000) + data.expires_in

      // Update Drizzle database
      await db
        .update(accounts)
        .set({
          access_token: newAccessToken,
          expires_at: newExpiresAt,
          updatedAt: new Date(),
        })
        .where(eq(accounts.id, account.id))

      // Sync updated credentials to Corsair
      const tenant = corsair.withTenant(userId)
      const gmailIntegration = tenant.gmail as unknown as CorsairIntegration
      const calendarIntegration = tenant.googlecalendar as unknown as CorsairIntegration
      await gmailIntegration.keys.set_access_token(newAccessToken)
      await gmailIntegration.keys.set_expires_at(String(newExpiresAt))
      await calendarIntegration.keys.set_access_token(newAccessToken)
      await calendarIntegration.keys.set_expires_at(String(newExpiresAt))

      console.log(`[google-refresh] Successfully refreshed tokens for user ${userId}.`)
    }
    return true
  } catch (error) {
    console.error("[google-refresh] Failed to ensure valid Google tokens on-demand:", error)
    return false
  }
}

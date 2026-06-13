import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { upsertGoogleAccount, type GoogleOAuthProfile } from '@/lib/auth/oauth'
import { provisionTenant } from '@/lib/corsair/tenant'
import { corsair } from '@/lib/corsair'
import { createAccessToken, createRefreshToken, getRefreshTokenExpiryMs } from '@/lib/auth/jwt'
import { refreshTokens } from '@/db/schema'

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

  // Automatically link Google OAuth tokens into Corsair Gmail & Google Calendar integrations
  const tenant = corsair.withTenant(oauthUser.id)
  try {
    await (tenant.gmail as any).keys.set_access_token(profile.accessToken)
    if (profile.refreshToken) {
      await (tenant.gmail as any).keys.set_refresh_token(profile.refreshToken)
    }
    if (profile.accessTokenExpiresAt) {
      const expiresAtSecStr = String(Math.floor(profile.accessTokenExpiresAt.getTime() / 1000))
      await (tenant.gmail as any).keys.set_expires_at(expiresAtSecStr)
    }
  } catch (err) {
    console.error("Failed to auto-link Gmail keys in Corsair:", err)
  }

  try {
    await (tenant.googlecalendar as any).keys.set_access_token(profile.accessToken)
    if (profile.refreshToken) {
      await (tenant.googlecalendar as any).keys.set_refresh_token(profile.refreshToken)
    }
    if (profile.accessTokenExpiresAt) {
      const expiresAtSecStr = String(Math.floor(profile.accessTokenExpiresAt.getTime() / 1000))
      await (tenant.googlecalendar as any).keys.set_expires_at(expiresAtSecStr)
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

import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { upsertGoogleAccount, type GoogleOAuthProfile } from '@/lib/auth/oauth'
import { provisionTenant } from '@/lib/corsair/tenant'
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

  // Provision Corsair tenant for new users
  if (isNewUser) {
    await provisionTenant(oauthUser.id)
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

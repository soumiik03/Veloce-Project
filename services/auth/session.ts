import { db } from '@/db'
import { users, refreshTokens } from '@/db/schema'
import { eq, and, gt } from 'drizzle-orm'
import { createAccessToken, createRefreshToken, verifyRefreshToken, getRefreshTokenExpiryMs } from '@/lib/auth/jwt'

export interface SessionData {
  userId: string
  email: string
  name: string | null
  image: string | null
}

export interface TokenRefreshResult {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

/**
 * Get user session data by ID
 */
export async function getSession(userId: string): Promise<SessionData | null> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  if (!user) return null

  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
  }
}

/**
 * Refresh access and refresh tokens
 * Implements refresh token rotation
 */
export async function refreshSession(refreshToken: string): Promise<TokenRefreshResult | null> {
  // Verify refresh token
  const payload = verifyRefreshToken(refreshToken)
  if (!payload) return null

  // Check token exists in database and not expired
  const [storedToken] = await db
    .select()
    .from(refreshTokens)
    .where(
      and(
        eq(refreshTokens.token, refreshToken),
        eq(refreshTokens.userId, payload.userId),
        gt(refreshTokens.expiresAt, new Date())
      )
    )
    .limit(1)

  if (!storedToken) return null

  // Get user
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, payload.userId))
    .limit(1)

  if (!user) return null

  // Invalidate old refresh token
  await db.delete(refreshTokens).where(eq(refreshTokens.id, storedToken.id))

  // Create new tokens with rotated version
  const newTokenVersion = payload.tokenVersion + 1
  const accessToken = createAccessToken(user.id, user.email)
  const newRefreshToken = createRefreshToken(user.id, newTokenVersion)

  // Store new refresh token
  const expiryMs = getRefreshTokenExpiryMs()
  await db.insert(refreshTokens).values({
    userId: user.id,
    token: newRefreshToken,
    expiresAt: new Date(Date.now() + expiryMs),
    createdAt: new Date(),
  })

  return {
    accessToken,
    refreshToken: newRefreshToken,
    expiresIn: 15 * 60, // 15 minutes in seconds
  }
}

/**
 * Logout user by invalidating all refresh tokens
 */
export async function logout(userId: string): Promise<void> {
  await db.delete(refreshTokens).where(eq(refreshTokens.userId, userId))
}

/**
 * Logout from all devices by incrementing token version
 * (Requires tracking token version in users table - can be added later if needed)
 */
export async function logoutAllDevices(userId: string): Promise<void> {
  // For now, just clear all refresh tokens
  await logout(userId)
}

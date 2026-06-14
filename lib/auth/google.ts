import { db } from "@/db"
import { googleAccounts } from "@/db/schema"
import { eq } from "drizzle-orm"

export async function getValidAccessToken(userId: string): Promise<string> {
  const [account] = await db
    .select()
    .from(googleAccounts)
    .where(eq(googleAccounts.userId, userId))
    .limit(1)

  if (!account || !account.accessToken) {
    throw new Error("No Google account linked")
  }

  const now = Math.floor(Date.now() / 1000)
  
  // If token is valid for at least 5 more minutes, use it
  if (account.tokenExpiry && account.tokenExpiry > now + 300) {
    return account.accessToken
  }

  // Token is expired or expiring soon, refresh it
  if (!account.refreshToken) {
    throw new Error("Access token expired and no refresh token available")
  }

  const clientID = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!clientID || !clientSecret) {
    throw new Error("Google OAuth not configured")
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientID,
      client_secret: clientSecret,
      refresh_token: account.refreshToken,
      grant_type: "refresh_token",
    }),
  })

  const data = await response.json()
  if (!response.ok) {
    console.error("[getValidAccessToken] Refresh failed:", data)
    throw new Error("Failed to refresh access token")
  }

  const newAccessToken = data.access_token
  const newExpiry = now + data.expires_in

  // Update DB
  await db
    .update(googleAccounts)
    .set({
      accessToken: newAccessToken,
      tokenExpiry: newExpiry,
    })
    .where(eq(googleAccounts.id, account.id))

  return newAccessToken
}

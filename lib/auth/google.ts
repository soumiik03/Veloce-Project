import { corsair } from "@/lib/corsair"

export async function getValidAccessToken(userId: string, service: 'gmail' | 'calendar' = 'gmail'): Promise<string> {
  const pluginId = service === 'calendar' ? 'googlecalendar' : 'gmail'
  const tenant = corsair.withTenant(userId)
  const pluginKeys = (tenant as any)[pluginId].keys

  const accessToken = await pluginKeys.get_access_token()
  const refreshToken = await pluginKeys.get_refresh_token()
  const expiresAt = await pluginKeys.get_expires_at()

  if (!accessToken) {
    throw new Error(`No Google ${service} account connected`)
  }

  const now = Math.floor(Date.now() / 1000)
  const expiresAtNum = expiresAt ? Number(expiresAt) : 0

  // If token is valid for at least 5 more minutes, use it
  if (expiresAtNum > now + 300) {
    return accessToken
  }

  // Token is expired or expiring soon, refresh it
  if (!refreshToken) {
    throw new Error(`Google ${service} token expired and no refresh token available`)
  }

  const clientID = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!clientID || !clientSecret) {
    throw new Error("Google OAuth not configured")
  }

  console.log(`[getValidAccessToken] Refreshing ${service} token via Google for user=${userId}`)

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientID,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  })

  const data = await response.json()
  if (!response.ok) {
    console.error(`[getValidAccessToken] Refresh failed for ${service}:`, data)
    throw new Error(`Failed to refresh Google ${service} access token`)
  }

  const newAccessToken = data.access_token
  const newExpiry = now + data.expires_in

  // Update Corsair store
  await pluginKeys.set_access_token(newAccessToken)
  await pluginKeys.set_expires_at(String(newExpiry))

  return newAccessToken
}

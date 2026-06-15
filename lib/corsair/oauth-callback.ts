import { corsair } from "@/lib/corsair"
import { db } from "@/db"
import { googleAccounts, onboardingStatus } from "@/db/schema"
import { eq } from "drizzle-orm"

interface OAuthCallbackResult {
  gmailConnected: boolean
  calendarConnected: boolean
}


export async function syncOAuthTokens(userId: string): Promise<OAuthCallbackResult> {
  const tenant = corsair.withTenant(userId)
  let gmailConnected = false
  let calendarConnected = false
  let gmailAccessToken: string | null = null
  let gmailRefreshToken: string | null = null

  
  try {
    gmailAccessToken = await (tenant.gmail as any).keys.get_access_token()
    gmailConnected = !!gmailAccessToken
    try {
      gmailRefreshToken = await (tenant.gmail as any).keys.get_refresh_token()
    } catch {
      
    }
    console.log(`[corsair/oauth] Gmail connected=${gmailConnected} for user=${userId}`)
  } catch (e) {
    console.warn("[corsair/oauth] Failed to check gmail token:", e)
  }

  
  try {
    const calendarToken = await (tenant.googlecalendar as any).keys.get_access_token()
    calendarConnected = !!calendarToken
    console.log(`[corsair/oauth] Calendar connected=${calendarConnected} for user=${userId}`)
  } catch (e) {
    console.warn("[corsair/oauth] Failed to check calendar token:", e)
  }

  
  if (gmailAccessToken) {
    try {
      const [existingAccount] = await db
        .select()
        .from(googleAccounts)
        .where(eq(googleAccounts.userId, userId))
        .limit(1)

      const tokenExpiry = Math.floor(Date.now() / 1000) + 3600
      const scopes = [
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/calendar.readonly",
      ].join(" ")

      if (existingAccount) {
        await db
          .update(googleAccounts)
          .set({
            accessToken: gmailAccessToken,
            ...(gmailRefreshToken ? { refreshToken: gmailRefreshToken } : {}),
            tokenExpiry,
            scopes,
          })
          .where(eq(googleAccounts.id, existingAccount.id))
        console.log(`[corsair/oauth] Updated google_accounts for user=${userId}`)
      } else {
        await db
          .insert(googleAccounts)
          .values({
            userId,
            accessToken: gmailAccessToken,
            refreshToken: gmailRefreshToken,
            tokenExpiry,
            scopes,
          })
        console.log(`[corsair/oauth] Inserted google_accounts for user=${userId}`)
      }
    } catch (dbErr) {
      console.error("[corsair/oauth] Failed to sync tokens to google_accounts:", dbErr)
    }
  }

  
  try {
    const [status] = await db
      .select()
      .from(onboardingStatus)
      .where(eq(onboardingStatus.userId, userId))
      .limit(1)

    const updates = {
      connectedGmail: gmailConnected,
      connectedCalendar: calendarConnected,
      ...(gmailConnected && calendarConnected ? { completedAt: new Date() } : {}),
    }

    if (status) {
      await db
        .update(onboardingStatus)
        .set(updates)
        .where(eq(onboardingStatus.userId, userId))
    } else {
      await db
        .insert(onboardingStatus)
        .values({
          userId,
          ...updates,
        })
    }
    console.log(`[corsair/oauth] Updated onboarding_status: gmail=${gmailConnected}, calendar=${calendarConnected}`)
  } catch (dbErr) {
    console.error("[corsair/oauth] Failed to update onboarding_status:", dbErr)
  }

  return { gmailConnected, calendarConnected }
}


export function resolveRedirectUrl(
  cookieValue: string | undefined,
  gmailConnected: boolean,
  calendarConnected: boolean,
): string {
  return cookieValue || (gmailConnected && calendarConnected ? "/app/chat" : "/app/onboarding")
}

import { corsair } from "@/lib/corsair"
import { getSessionUser } from "@/lib/auth"
import { processOAuthCallback } from "corsair/oauth"
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { googleAccounts, onboardingStatus } from "@/db/schema"
import { eq } from "drizzle-orm"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const code = searchParams.get("code")
    const state = searchParams.get("state")

    if (!code || !state) {
      console.error("[corsair/callback] Missing code or state params")
      return NextResponse.json({ error: "Missing code or state" }, { status: 400 })
    }

    // 1. Resolve authenticated user
    const user = await getSessionUser(req)
    if (!user?.id) {
      console.error("[corsair/callback] No authenticated user found")
      return NextResponse.redirect(new URL("/login", req.url))
    }

    const userId = user.id
    console.log(`[corsair/callback] Processing OAuth callback for user=${userId}`)

    // 2. Process the OAuth callback through Corsair SDK
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/corsair`
    await processOAuthCallback(corsair, {
      code,
      state,
      redirectUri,
    })
    console.log(`[corsair/callback] Corsair processOAuthCallback succeeded for user=${userId}`)

    // 3. Check connection status from Corsair tenant
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
        // refresh token may not be available
      }
      console.log(`[corsair/callback] Gmail connected=${gmailConnected}`)
    } catch (e) {
      console.warn("[corsair/callback] Failed to check gmail token:", e)
    }

    try {
      const calendarToken = await (tenant.googlecalendar as any).keys.get_access_token()
      calendarConnected = !!calendarToken
      console.log(`[corsair/callback] Calendar connected=${calendarConnected}`)
    } catch (e) {
      console.warn("[corsair/callback] Failed to check calendar token:", e)
    }

    // 4. Sync tokens to google_accounts table (so getValidAccessToken works for agent/calendar services)
    if (gmailAccessToken) {
      try {
        const [existingAccount] = await db
          .select()
          .from(googleAccounts)
          .where(eq(googleAccounts.userId, userId))
          .limit(1)

        const tokenExpiry = Math.floor(Date.now() / 1000) + 3600 // Default 1 hour, will be refreshed as needed
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
          console.log(`[corsair/callback] Updated google_accounts for user=${userId}`)
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
          console.log(`[corsair/callback] Inserted google_accounts for user=${userId}`)
        }
      } catch (dbErr) {
        console.error("[corsair/callback] Failed to sync tokens to google_accounts:", dbErr)
        // Non-fatal: Corsair still has the tokens, they just won't be in google_accounts
      }
    }

    // 5. Upsert onboarding_status
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
      console.log(`[corsair/callback] Updated onboarding_status: gmail=${gmailConnected}, calendar=${calendarConnected}`)
    } catch (dbErr) {
      console.error("[corsair/callback] Failed to update onboarding_status:", dbErr)
    }

    // 6. Redirect: respect corsair_oauth_redirect if set, otherwise fallback
    const redirectCookie = req.cookies.get("corsair_oauth_redirect")?.value
    const nextUrl = redirectCookie || (gmailConnected && calendarConnected ? "/app/chat" : "/app/onboarding")
    
    console.log(`[corsair/callback] Redirecting to ${nextUrl}`)
    const response = NextResponse.redirect(new URL(nextUrl, req.url))
    response.cookies.delete("corsair_oauth_redirect")
    return response
  } catch (error: any) {
    console.error("[corsair/callback] Error:", error)
    const redirectCookie = req.cookies.get("corsair_oauth_redirect")?.value
    const targetPath = redirectCookie || "/app/onboarding"
    const errorUrl = new URL(targetPath, req.url)
    errorUrl.searchParams.set("error", error.message || "OAuth callback processing failed")
    const response = NextResponse.redirect(errorUrl)
    response.cookies.delete("corsair_oauth_redirect")
    return response
  }
}

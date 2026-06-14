import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth"
import { db } from "@/db"
import { googleAccounts, onboardingStatus } from "@/db/schema"
import { eq } from "drizzle-orm"
import { corsair } from "@/lib/corsair"
import { processOAuthCallback } from "corsair/oauth"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const code = searchParams.get("code")
    const state = searchParams.get("state")

    if (!code) {
      return NextResponse.json({ error: "No code provided" }, { status: 400 })
    }

    const user = await getSessionUser(req)
    if (!user?.id) {
      return NextResponse.redirect(new URL("/login", req.url))
    }

    const userId = user.id

    // Check if this is a Corsair OAuth flow (indicated by a state that is not static_state)
    if (state && state !== "static_state") {
      try {
        console.log(`[corsair/callback] Delegated callback from google/route.ts for user=${userId}`)
        
        const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/google`
        await processOAuthCallback(corsair, {
          code,
          state,
          redirectUri,
        })
        console.log(`[corsair/callback] Corsair processOAuthCallback succeeded for user=${userId}`)

        // Check connection status from Corsair tenant
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

        // Sync tokens to google_accounts table (so getValidAccessToken works for agent/calendar services)
        if (gmailAccessToken) {
          try {
            const [existingAccount] = await db
              .select()
              .from(googleAccounts)
              .where(eq(googleAccounts.userId, userId))
              .limit(1)

            const tokenExpiry = Math.floor(Date.now() / 1000) + 3600 // Default 1 hour
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
          }
        }

        // Upsert onboarding_status
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

        // Redirect: respect corsair_oauth_redirect if set, otherwise fallback
        const redirectCookie = req.cookies.get("corsair_oauth_redirect")?.value
        const nextUrl = redirectCookie || (gmailConnected && calendarConnected ? "/app/chat" : "/app/onboarding")
        
        console.log(`[corsair/callback] Redirecting to ${nextUrl}`)
        const response = NextResponse.redirect(new URL(nextUrl, req.url))
        response.cookies.delete("corsair_oauth_redirect")
        return response
      } catch (corsairErr: any) {
        console.error("[corsair/callback] Error during delegated callback:", corsairErr)
        const redirectCookie = req.cookies.get("corsair_oauth_redirect")?.value
        const targetPath = redirectCookie || "/app/onboarding"
        const errorUrl = new URL(targetPath, req.url)
        errorUrl.searchParams.set("error", corsairErr.message || "OAuth callback processing failed")
        const response = NextResponse.redirect(errorUrl)
        response.cookies.delete("corsair_oauth_redirect")
        return response
      }
    }

    const clientID = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/google`

    if (!clientID || !clientSecret) {
      return NextResponse.json({ error: "Google OAuth not configured" }, { status: 500 })
    }

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientID,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    })

    const tokenData = await tokenResponse.json()
    if (!tokenResponse.ok) {
      console.error("[oauth] Token exchange failed:", tokenData)
      return NextResponse.json({ error: "Token exchange failed" }, { status: 400 })
    }

    const { access_token, refresh_token, expires_in, scope } = tokenData
    const tokenExpiry = Math.floor(Date.now() / 1000) + expires_in

    // 1. Upsert google_accounts
    const [existingAccount] = await db
      .select()
      .from(googleAccounts)
      .where(eq(googleAccounts.userId, user.id))
      .limit(1)

    if (existingAccount) {
      await db
        .update(googleAccounts)
        .set({
          accessToken: access_token,
          refreshToken: refresh_token || existingAccount.refreshToken, // keep old if not provided
          tokenExpiry,
          scopes: scope,
        })
        .where(eq(googleAccounts.id, existingAccount.id))
    } else {
      await db
        .insert(googleAccounts)
        .values({
          userId: user.id,
          accessToken: access_token,
          refreshToken: refresh_token,
          tokenExpiry,
          scopes: scope,
        })
    }

    // 2. Upsert onboarding_status
    const [status] = await db
      .select()
      .from(onboardingStatus)
      .where(eq(onboardingStatus.userId, user.id))
      .limit(1)

    if (status) {
      await db
        .update(onboardingStatus)
        .set({
          connectedGmail: true,
          connectedCalendar: true,
          completedAt: new Date(),
        })
        .where(eq(onboardingStatus.userId, user.id))
    } else {
      await db
        .insert(onboardingStatus)
        .values({
          userId: user.id,
          connectedGmail: true,
          connectedCalendar: true,
          completedAt: new Date(),
        })
    }

    return NextResponse.redirect(new URL("/app/chat", req.url))
  } catch (err: any) {
    console.error("[oauth/callback] Error:", err)
    return NextResponse.json({ error: err.message || "OAuth callback failed" }, { status: 500 })
  }
}

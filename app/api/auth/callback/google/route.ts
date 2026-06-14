import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth"
import { db } from "@/db"
import { googleAccounts, onboardingStatus } from "@/db/schema"
import { eq } from "drizzle-orm"



export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const code = searchParams.get("code")

    if (!code) {
      return NextResponse.json({ error: "No code provided" }, { status: 400 })
    }

    const user = await getSessionUser(req)
    if (!user) {
      return NextResponse.redirect(new URL("/login", req.url))
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

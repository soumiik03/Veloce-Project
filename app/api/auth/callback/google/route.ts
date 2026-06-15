import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth"
import { corsair } from "@/lib/corsair"
import { processOAuthCallback } from "corsair/oauth"
import { syncOAuthTokens, resolveRedirectUrl } from "@/lib/corsair/oauth-callback"


export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const code = searchParams.get("code")
    const state = searchParams.get("state")

    if (!code) {
      return NextResponse.json({ error: "No authorization code provided" }, { status: 400 })
    }

    const user = await getSessionUser(req)
    if (!user?.id) {
      console.error("[auth/callback/google] No authenticated user found")
      return NextResponse.redirect(new URL("/login", req.url))
    }

    const userId = user.id

    
    if (state && state !== "static_state") {
      console.log(`[auth/callback/google] Processing Corsair OAuth for user=${userId}`)

      const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/google`
      await processOAuthCallback(corsair, { code, state, redirectUri })

      const { gmailConnected, calendarConnected } = await syncOAuthTokens(userId)

      const redirectCookie = req.cookies.get("corsair_oauth_redirect")?.value
      const nextUrl = resolveRedirectUrl(redirectCookie, gmailConnected, calendarConnected)

      console.log(`[auth/callback/google] Redirecting to ${nextUrl}`)
      const response = NextResponse.redirect(new URL(nextUrl, req.url))
      response.cookies.delete("corsair_oauth_redirect")
      return response
    }

    
    console.log(`[auth/callback/google] Processing legacy OAuth for user=${userId}`)

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
      console.error("[auth/callback/google] Token exchange failed:", tokenData)
      return NextResponse.json({ error: "Token exchange failed" }, { status: 400 })
    }

    
    const { gmailConnected, calendarConnected } = await syncOAuthTokens(userId)
    const nextUrl = gmailConnected && calendarConnected ? "/app/chat" : "/app/onboarding"

    return NextResponse.redirect(new URL(nextUrl, req.url))
  } catch (err: any) {
    console.error("[auth/callback/google] Error:", err)
    const redirectCookie = req.cookies.get("corsair_oauth_redirect")?.value
    const targetPath = redirectCookie || "/app/onboarding"
    const errorUrl = new URL(targetPath, req.url)
    errorUrl.searchParams.set("error", err.message || "OAuth callback failed")
    const response = NextResponse.redirect(errorUrl)
    response.cookies.delete("corsair_oauth_redirect")
    return response
  }
}

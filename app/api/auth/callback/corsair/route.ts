import { corsair } from "@/lib/corsair"
import { processOAuthCallback } from "corsair/oauth"
import { NextRequest, NextResponse } from "next/server"
import { isDynamicUsageError } from "@/lib/auth/jwt"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const code = searchParams.get("code")
    const state = searchParams.get("state")

    if (!code || !state) {
      return NextResponse.json({ error: "Missing code or state" }, { status: 400 })
    }

    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/corsair`

    await processOAuthCallback(corsair, {
      code,
      state,
      redirectUri,
    })

    return NextResponse.redirect(new URL("/app/onboarding", req.url))
  } catch (error: any) {
    if (isDynamicUsageError(error)) {
      throw error
    }
    console.error("[corsair/callback] Error:", error)
    return NextResponse.json({ error: error.message || "OAuth callback processing failed" }, { status: 500 })
  }
}

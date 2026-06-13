import { auth } from "@/lib/auth"
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { Redis } from "@upstash/redis"
import { applyRateLimit, loginRateLimit } from "@/lib/rate-limit"
import { verifyAccessToken } from "@/lib/auth/jwt"

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export async function proxy(req: NextRequest) {
  console.log("PROXY REQUEST:", {
    url: req.url,
    phase: process.env.NEXT_PHASE,
    headers: Array.from(req.headers.entries())
  })

  if (process.env.NEXT_PHASE === "phase-production-build") {
    return NextResponse.next()
  }

  const { nextUrl } = req
  const { pathname } = nextUrl

  // 1. Rate limit login attempts to credentials callback
  if (pathname === "/api/auth/callback/credentials" && req.method === "POST") {
    const rateLimit = await applyRateLimit(req, loginRateLimit)
    if (rateLimit.limited) return rateLimit.response
  }

  // 2. Allow standard NextAuth API endpoints (/api/auth/*) without checks
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next()
  }

  // 3. Get session via NextAuth auth() helper and custom JWT fallback
  const session = await auth()
  let isLoggedIn = !!session?.user
  let userId = session?.user?.id

  if (!isLoggedIn) {
    const token = req.cookies.get("accessToken")?.value
    if (token) {
      try {
        const payload = verifyAccessToken(token)
        if (payload) {
          isLoggedIn = true
          userId = payload.userId
        }
      } catch (e) {
        console.error("Failed to verify access token in proxy:", e)
      }
    }
  }

  // 4. Handle public routes
  if (pathname === "/") {
    return NextResponse.next()
  }

  // 5. Handle auth pages (/login, /register)
  const isAuthRoute = pathname.startsWith("/login") || pathname.startsWith("/register")
  if (isAuthRoute) {
    if (isLoggedIn) {
      const response = NextResponse.redirect(new URL("/app/chat", nextUrl))
      if (!req.cookies.has("veloce_logged_in")) {
        response.cookies.set("veloce_logged_in", "true", {
          httpOnly: false,
          secure: process.env.NODE_ENV === "production",
          maxAge: 7 * 24 * 60 * 60,
          path: "/",
        })
      }
      return response
    }
    return NextResponse.next()
  }

  // 6. Protect `/app/*` namespace and handle onboarding state
  if (pathname.startsWith("/app")) {
    if (!isLoggedIn || !userId) {
      const redirectUrl = new URL("/login", nextUrl)
      redirectUrl.searchParams.set("callbackUrl", pathname)
      return NextResponse.redirect(redirectUrl)
    }

    // Check onboarding completion in Redis
    const isOnboardingCompleted = await redis.get(`onboarding:${userId}`) === "completed"

    let response: NextResponse
    if (!isOnboardingCompleted) {
      // If onboarding is not completed, force user to be on /app/onboarding
      if (pathname !== "/app/onboarding") {
        response = NextResponse.redirect(new URL("/app/onboarding", nextUrl))
      } else {
        response = NextResponse.next()
      }
    } else {
      // If onboarding is completed, redirect away from /app/onboarding to /app/mail
      if (pathname === "/app/onboarding") {
        response = NextResponse.redirect(new URL("/app/chat", nextUrl))
      } else {
        response = NextResponse.next()
      }
    }

    if (isLoggedIn && !req.cookies.has("veloce_logged_in")) {
      response.cookies.set("veloce_logged_in", "true", {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        maxAge: 7 * 24 * 60 * 60,
        path: "/",
      })
    }
    return response
  }

  // 7. Protect other backend API endpoints (/api/emails/*, /api/calendar/*, /api/agent/*)
  const isApiProtected = pathname.startsWith("/api/emails") || 
                         pathname.startsWith("/api/calendar") || 
                         pathname.startsWith("/api/agent")
  if (isApiProtected) {
    if (!isLoggedIn) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
}

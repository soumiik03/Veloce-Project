import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import { Redis } from "@upstash/redis"
import { NextResponse } from "next/server"
import { verifyAccessToken } from "./lib/auth/jwt"

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// Define paths that require authentication
const isProtectedRoute = createRouteMatcher([
  "/app(.*)",
  "/api/emails(.*)",
  "/api/calendar(.*)",
  "/api/agent(.*)",
])

export default clerkMiddleware(async (auth, req) => {
  // Bypass auth checks during production builds
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return NextResponse.next()
  }

  const { pathname } = req.nextUrl

  if (isProtectedRoute(req)) {
    const session = await auth()
    let hasSession = !!session.userId

    if (!hasSession) {
      const accessToken = req.cookies.get("accessToken")?.value
      if (accessToken) {
        const payload = verifyAccessToken(accessToken)
        if (payload) {
          hasSession = true
        }
      }
    }

    if (!hasSession) {
      // Return 401 Unauthorized for API routes instead of redirecting to login
      if (pathname.startsWith("/api")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
      return session.redirectToSignIn({ returnBackUrl: req.url })
    }

    // Protect `/app/*` routes and enforce onboarding completion status
    if (pathname.startsWith("/app")) {
      let userId = session.userId
      if (!userId) {
        const accessToken = req.cookies.get("accessToken")?.value
        if (accessToken) {
          const payload = verifyAccessToken(accessToken)
          if (payload) {
            userId = payload.userId
          }
        }
      }

      if (userId) {
        const isOnboardingCompleted = (await redis.get(`onboarding:${userId}`)) === "completed"

        if (!isOnboardingCompleted) {
          if (pathname !== "/app/onboarding") {
            return NextResponse.redirect(new URL("/app/onboarding", req.url))
          }
        } else {
          if (pathname === "/app/onboarding") {
            return NextResponse.redirect(new URL("/app/chat", req.url))
          }
        }
      }
    }
  } else {
    // If not protected but is login/register and user is logged in, send them to workspace
    const session = await auth()
    let loggedIn = !!session.userId
    if (!loggedIn) {
      const accessToken = req.cookies.get("accessToken")?.value
      if (accessToken) {
        loggedIn = !!verifyAccessToken(accessToken)
      }
    }
    if (loggedIn && (pathname === "/login" || pathname === "/register")) {
      return NextResponse.redirect(new URL("/app/chat", req.url))
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for Clerk's auto-proxy path
    "/__clerk/:path*",
    "/(api|trpc)(.*)",
  ],
}

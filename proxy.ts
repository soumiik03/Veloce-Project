import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

const isProtectedRoute = createRouteMatcher([
  "/app(.*)",
  "/api/emails(.*)",
  "/api/calendar(.*)",
  "/api/agent(.*)",
  "/api/auth/corsair(.*)",
  "/api/auth/callback(.*)",
  "/api/onboarding(.*)",
])

export default clerkMiddleware(async (auth, req) => {
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return NextResponse.next()
  }

  const { pathname } = req.nextUrl

  if (isProtectedRoute(req)) {
    const session = await auth()
    if (!session.userId) {
      // For API routes, return 401 instead of redirecting to login page
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
      return NextResponse.redirect(new URL("/login", req.url))
    }

    // Onboarding redirect logic — only for page routes (/app/*), never for API routes.
    // API routes need auth but should always return JSON, not HTML redirects.
    if (pathname.startsWith("/app/")) {
      const origin = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin
      const res = await fetch(`${origin}/api/auth/edge-session`, {
        headers: {
          cookie: req.headers.get('cookie') || '',
        }
      })

      if (res.ok) {
        const data = await res.json()

        if (!data.onboarded) {
          if (pathname !== "/app/onboarding") {
            return NextResponse.redirect(new URL("/app/onboarding", req.url))
          }
        } else {
          if (pathname === "/app/onboarding") {
            return NextResponse.redirect(new URL("/app/chat", req.url))
          }
        }
      } else {
        // If the edge-session fetch fails, force onboarding to be safe
        if (pathname !== "/app/onboarding") {
          return NextResponse.redirect(new URL("/app/onboarding", req.url))
        }
      }
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
}

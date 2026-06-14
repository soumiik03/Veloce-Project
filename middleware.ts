import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

const isProtectedRoute = createRouteMatcher([
  "/app(.*)",
  "/api/emails(.*)",
  "/api/calendar(.*)",
  "/api/agent(.*)",
])

export default clerkMiddleware(async (auth, req) => {
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return NextResponse.next()
  }

  const { pathname } = req.nextUrl

  if (isProtectedRoute(req)) {
    const session = await auth()
    if (!session.userId) {
      return NextResponse.redirect(new URL("/login", req.url))
    }

    // We fetch the status from a dedicated Edge-friendly route to avoid pg/Drizzle Edge runtime errors
    const origin = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin
    const res = await fetch(`${origin}/api/auth/edge-session`, {
      headers: {
        cookie: req.headers.get('cookie') || '',
      }
    })
    
    if (res.ok) {
      const data = await res.json()
      // data: { id: string, onboarded: boolean }
      
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
      // If the edge-session fetch fails, we default to forcing onboarding to be safe
      if (pathname !== "/app/onboarding") {
        return NextResponse.redirect(new URL("/app/onboarding", req.url))
      }
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
}

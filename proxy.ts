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
  const { pathname } = req.nextUrl
  console.log(`[proxy] Intercepted request for path: ${pathname}`);

  if (process.env.NEXT_PHASE === "phase-production-build") {
    console.log(`[proxy] Build phase detected. Skipping path: ${pathname}`);
    return NextResponse.next()
  }

  const protectedCheck = isProtectedRoute(req);
  console.log(`[proxy] Path: ${pathname}, isProtectedRoute: ${protectedCheck}`);

  if (protectedCheck) {
    console.log(`[proxy] Resolving session for protected route: ${pathname}`);
    const session = await auth()
    console.log(`[proxy] Session resolved. userId: ${session.userId || "none/null"}`);
    
    if (!session.userId) {
      // For API routes, return 401 instead of redirecting to login page
      if (pathname.startsWith("/api/")) {
        console.warn(`[proxy] Unauthorized access to API route: ${pathname}. Returning 401.`);
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
      console.warn(`[proxy] Unauthorized access to page route: ${pathname}. Redirecting to /login.`);
      return NextResponse.redirect(new URL("/login", req.url))
    }

    // Onboarding redirect logic — only for page routes (/app/*), never for API routes.
    // API routes need auth but should always return JSON, not HTML redirects.
    if (pathname.startsWith("/app/")) {
      const origin = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin
      console.log(`[proxy] Fetching edge-session from: ${origin}/api/auth/edge-session`);
      const res = await fetch(`${origin}/api/auth/edge-session`, {
        headers: {
          cookie: req.headers.get('cookie') || '',
        }
      })

      if (res.ok) {
        const data = await res.json()
        console.log(`[proxy] Edge session retrieved successfully. User onboarded: ${data.onboarded}`);

        if (!data.onboarded) {
          if (pathname !== "/app/onboarding") {
            console.log(`[proxy] User not onboarded. Redirecting to /app/onboarding`);
            return NextResponse.redirect(new URL("/app/onboarding", req.url))
          }
        } else {
          if (pathname === "/app/onboarding") {
            console.log(`[proxy] User already onboarded. Redirecting to /app/chat`);
            return NextResponse.redirect(new URL("/app/chat", req.url))
          }
        }
      } else {
        console.error(`[proxy] Edge session fetch failed with status: ${res.status}. Forcing onboarding.`);
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

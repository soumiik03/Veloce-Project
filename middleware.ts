import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

const publicRoutes = ["/"]
const authRoutes = ["/login", "/register"]
const protectedPrefixes = ["/app", "/api/emails", "/api/calendar", "/api/agent"]
const nextAuthRoutes = "/api/auth"

export default auth((req) => {
  const { nextUrl, auth: session } = req
  const isLoggedIn = !!session
  const { pathname } = nextUrl

  
  if (pathname.startsWith(nextAuthRoutes)) {
    return NextResponse.next()
  }

  
  const isPublicRoute = publicRoutes.includes(pathname)
  if (isPublicRoute) return NextResponse.next()

  
  const isAuthRoute = authRoutes.some((route) =>
    pathname.startsWith(route)
  )
  if (isAuthRoute) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL("/app/mail", nextUrl))
    }
    return NextResponse.next()
  }

 
  const isProtectedRoute = protectedPrefixes.some((prefix) =>
    pathname.startsWith(prefix)
  )
  if (isProtectedRoute) {
    if (!isLoggedIn) {
      const redirectUrl = new URL("/login", nextUrl)
      redirectUrl.searchParams.set("callbackUrl", pathname)
      return NextResponse.redirect(redirectUrl)
    }
    return NextResponse.next()
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
}
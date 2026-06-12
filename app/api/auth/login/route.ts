import { NextRequest, NextResponse } from "next/server"
import { validatePassword } from "@/lib/auth/oauth"
import { createAccessToken, createRefreshToken, getRefreshTokenExpiryMs } from "@/lib/auth/jwt"
import { db } from "@/db"
import { refreshTokens } from "@/db/schema"
import { loginSchema } from "@/lib/validations/auth"
import { applyRateLimit, loginRateLimit } from "@/lib/rate-limit"
import { cookies } from "next/headers"

export async function POST(req: NextRequest) {
  const rateLimit = await applyRateLimit(req, loginRateLimit)
  if (rateLimit.limited) return rateLimit.response

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 })
  }

  const { email, password } = parsed.data
  const authResult = await validatePassword(email, password)
  if (!authResult) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
  }

  const { user } = authResult
  const accessToken = createAccessToken(user.id, user.email)
  const refreshToken = createRefreshToken(user.id, 1)

  const expiryMs = getRefreshTokenExpiryMs()
  await db.insert(refreshTokens).values({
    userId: user.id,
    token: refreshToken,
    expiresAt: new Date(Date.now() + expiryMs),
    createdAt: new Date(),
  })

  const cookieStore = await cookies()
  cookieStore.set("accessToken", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 15 * 60,
    path: "/",
  })
  cookieStore.set("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60,
    path: "/",
  })
  cookieStore.set("veloce_logged_in", "true", {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60,
    path: "/",
  })

  return NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
    token: accessToken,
  })
}

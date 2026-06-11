import jwt from "jsonwebtoken"
import { db } from "@/db"
import { refreshTokens } from "@/db/schema"

const JWT_CONFIG = {
  algorithm: "HS256" as const,
  expiryMinutes: 15,
  refreshExpiryDays: 7,
  issuer: "superhuman-clone",
  audience: "superhuman-users",
}

interface BaseJWTPayload {
  userId: string
  type: "access" | "refresh"
}

export interface AccessTokenPayload extends BaseJWTPayload {
  email: string
  type: "access"
}

export interface RefreshTokenPayload extends BaseJWTPayload {
  tokenVersion: number
  type: "refresh"
}

type JWTPayload = AccessTokenPayload | RefreshTokenPayload

function getJWTSecret(): string {
  const secret = process.env.JWT_SECRET ?? process.env.AUTH_SECRET
  if (!secret || secret.trim().length === 0) {
    throw new Error("JWT_SECRET or AUTH_SECRET is required. Generate one using: openssl rand -base64 32")
  }
  return secret
}

export function createAccessToken(userId: string, email: string): string {
  return jwt.sign(
    { userId, email, type: "access" satisfies AccessTokenPayload["type"] },
    getJWTSecret(),
    {
      algorithm: JWT_CONFIG.algorithm,
      expiresIn: `${JWT_CONFIG.expiryMinutes}m`,
      issuer: JWT_CONFIG.issuer,
      audience: JWT_CONFIG.audience,
    }
  )
}

export function createRefreshToken(userId: string, tokenVersion = 1): string {
  return jwt.sign(
    { userId, tokenVersion, type: "refresh" satisfies RefreshTokenPayload["type"] },
    getJWTSecret(),
    {
      algorithm: JWT_CONFIG.algorithm,
      expiresIn: `${JWT_CONFIG.refreshExpiryDays}d`,
      issuer: JWT_CONFIG.issuer,
      audience: JWT_CONFIG.audience,
    }
  )
}

export function verifyJWT(token: string): JWTPayload | null {
  try {
    const payload = jwt.verify(token, getJWTSecret(), {
      algorithms: [JWT_CONFIG.algorithm],
      issuer: JWT_CONFIG.issuer,
      audience: JWT_CONFIG.audience,
    })

    if (!payload || typeof payload === "string") return null
    if (payload.type === "access" && typeof payload.userId === "string" && typeof payload.email === "string") {
      return { userId: payload.userId, email: payload.email, type: "access" }
    }
    if (payload.type === "refresh" && typeof payload.userId === "string" && typeof payload.tokenVersion === "number") {
      return { userId: payload.userId, tokenVersion: payload.tokenVersion, type: "refresh" }
    }
    return null
  } catch {
    return null
  }
}

export function verifyAccessToken(token: string): AccessTokenPayload | null {
  const payload = verifyJWT(token)
  return payload?.type === "access" ? payload : null
}

export function verifyRefreshToken(token: string): RefreshTokenPayload | null {
  const payload = verifyJWT(token)
  return payload?.type === "refresh" ? payload : null
}

export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader) return null
  const [scheme, token] = authHeader.split(" ")
  return scheme?.toLowerCase() === "bearer" && token ? token : null
}

export function getRefreshTokenExpiryMs(): number {
  return JWT_CONFIG.refreshExpiryDays * 24 * 60 * 60 * 1000
}

export async function createUserSession(user: {
  id: string
  email: string
}) {
  const token = createAccessToken(user.id, user.email)
  const refreshToken = createRefreshToken(user.id, 1)

  const now = new Date()
  const refreshExpiresAt = new Date(now.getTime() + getRefreshTokenExpiryMs())

  await db.insert(refreshTokens).values({
    userId: user.id,
    token: refreshToken,
    expiresAt: refreshExpiresAt,
    createdAt: now,
  })

  return {
    token,
    refreshToken,
    expiresAt: new Date(now.getTime() + JWT_CONFIG.expiryMinutes * 60 * 1000),
    refreshExpiresAt,
  }
}

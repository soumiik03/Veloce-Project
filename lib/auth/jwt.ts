import { SignJWT, jwtVerify } from 'jose'
import crypto from 'crypto'

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET ?? process.env.AUTH_SECRET
  if (!secret) throw new Error('JWT_SECRET is required')
  return new TextEncoder().encode(secret)
}

function getSecretString(): string {
  const secret = process.env.JWT_SECRET ?? process.env.AUTH_SECRET
  if (!secret) throw new Error('JWT_SECRET is required')
  return secret
}

const ISSUER = 'veloce'
const AUDIENCE = 'veloce-users'

export async function createVerificationToken(
  userId: string,
  email: string
): Promise<string> {
  return new SignJWT({ userId, email, type: 'email_verification' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setExpirationTime('24h')
    .sign(getSecret())
}

export async function createPasswordResetToken(
  userId: string
): Promise<string> {
  return new SignJWT({ userId, type: 'password_reset' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setExpirationTime('1h')
    .sign(getSecret())
}

export async function verifyToken(
  token: string
): Promise<{ userId: string; email?: string; type: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      issuer: ISSUER,
      audience: AUDIENCE,
    })

    if (
      typeof payload.userId !== 'string' ||
      typeof payload.type !== 'string'
    ) return null

    return {
      userId: payload.userId,
      email: typeof payload.email === 'string' ? payload.email : undefined,
      type: payload.type,
    }
  } catch {
    return null
  }
}

const ACCESS_TOKEN_EXPIRY_S = 15 * 60

const REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000
const REFRESH_TOKEN_EXPIRY_S = 7 * 24 * 60 * 60

export function getRefreshTokenExpiryMs(): number {
  return REFRESH_TOKEN_EXPIRY_MS
}

export function createAccessToken(userId: string, email: string): string {
  return signSync({ userId, email, type: 'access' }, getSecretString(), ACCESS_TOKEN_EXPIRY_S)
}

export function createRefreshToken(userId: string, tokenVersion: number): string {
  return signSync({ userId, tokenVersion, type: 'refresh' }, getSecretString(), REFRESH_TOKEN_EXPIRY_S)
}

export function verifyAccessToken(token: string): { userId: string; email: string } | null {
  const payload = verifySync(token, getSecretString())
  if (!payload || payload.type !== 'access' || typeof payload.userId !== 'string' || typeof payload.email !== 'string') {
    return null
  }
  return { userId: payload.userId, email: payload.email }
}

export function verifyRefreshToken(token: string): { userId: string; tokenVersion: number } | null {
  const payload = verifySync(token, getSecretString())
  if (!payload || payload.type !== 'refresh' || typeof payload.userId !== 'string' || typeof payload.tokenVersion !== 'number') {
    return null
  }
  return { userId: payload.userId, tokenVersion: payload.tokenVersion }
}

export function extractTokenFromHeader(header: string | null | undefined): string | null {
  if (!header) return null
  const [type, token] = header.split(' ')
  if (type.toLowerCase() !== 'bearer' || !token) return null
  return token
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

function base64UrlDecode(str: string): string {
  str = str.replace(/-/g, '+').replace(/_/g, '/')
  while (str.length % 4) {
    str += '='
  }
  return Buffer.from(str, 'base64').toString('utf8')
}

function signSync(payload: object, secret: string, expiresInSeconds: number): string {
  const header = { alg: 'HS256', typ: 'JWT' }
  const iat = Math.floor(Date.now() / 1000)
  const exp = iat + expiresInSeconds
  const fullPayload = { ...payload, iat, exp, iss: ISSUER, aud: AUDIENCE }

  const encodedHeader = base64UrlEncode(JSON.stringify(header))
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload))
  const signatureInput = `${encodedHeader}.${encodedPayload}`
  
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signatureInput)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')

  return `${signatureInput}.${signature}`
}

function verifySync(token: string, secret: string): any {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const [encodedHeader, encodedPayload, signature] = parts
    const signatureInput = `${encodedHeader}.${encodedPayload}`
    
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(signatureInput)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')

    const bufferSignature = Buffer.from(signature)
    const bufferExpected = Buffer.from(expectedSignature)
    if (bufferSignature.length !== bufferExpected.length || !crypto.timingSafeEqual(bufferSignature, bufferExpected)) {
      return null
    }

    const payload = JSON.parse(base64UrlDecode(encodedPayload))
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      return null
    }
    return payload
  } catch {
    return null
  }
}
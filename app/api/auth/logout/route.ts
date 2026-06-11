import { NextRequest, NextResponse } from 'next/server'
import { logout } from '@/services/auth/session'
import { extractTokenFromHeader } from '@/lib/auth/jwt'
import { verifyAccessToken } from '@/lib/auth/jwt'

/**
 * Logout endpoint
 * Invalidates all refresh tokens for the user
 * Requires: Authorization header with valid access token
 */
export async function POST(req: NextRequest) {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.get('Authorization')
    const token = extractTokenFromHeader(authHeader)

    if (!token) {
      return NextResponse.json(
        { error: 'Missing authorization token' },
        { status: 401 }
      )
    }

    // Verify token and get userId
    const payload = verifyAccessToken(token)
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    // Logout user
    await logout(payload.userId)

    return NextResponse.json(
      { message: 'Logged out successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('[logout] Error:', error)
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

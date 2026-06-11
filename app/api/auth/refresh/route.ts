import { NextRequest, NextResponse } from 'next/server'
import { refreshSession } from '@/services/auth/session'
import { z } from 'zod'

/**
 * Token refresh endpoint
 * Implements refresh token rotation for security
 * Accepts: refresh token in request body
 */
export async function POST(req: NextRequest) {
  try {
    // Parse request body
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }

    // Validate refresh token
    const schema = z.object({
      refreshToken: z.string().min(1, 'Refresh token is required'),
    })

    const result = schema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          issues: result.error.issues.map(i => ({
            field: i.path.join('.'),
            message: i.message,
          })),
        },
        { status: 422 }
      )
    }

    // Refresh tokens
    const newTokens = await refreshSession(result.data.refreshToken)

    if (!newTokens) {
      return NextResponse.json(
        { error: 'Invalid or expired refresh token' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      {
        tokens: {
          accessToken: newTokens.accessToken,
          refreshToken: newTokens.refreshToken,
          expiresIn: newTokens.expiresIn,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[refresh] Error:', error)
    return NextResponse.json(
      { error: 'Token refresh failed' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

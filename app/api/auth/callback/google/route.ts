import { NextRequest, NextResponse } from 'next/server'
import { handleGoogleOAuth } from '@/services/auth/google'
import { type GoogleOAuthProfile } from '@/lib/auth/oauth'

/**
 * Google OAuth callback handler
 * Expects: code parameter from Google OAuth flow
 * Implements: Atomic upsert to prevent duplicate users
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')

    if (!code) {
      return NextResponse.json(
        { error: 'Authorization code not provided' },
        { status: 400 }
      )
    }

    if (!state) {
      return NextResponse.json(
        { error: 'State parameter not provided' },
        { status: 400 }
      )
    }

    // TODO: Verify state parameter for CSRF protection
    // For now, this is a placeholder for the actual OAuth flow

    // In production, exchange code for tokens from Google
    // Then get user profile and handle OAuth
    // For this skeleton, we mock the profile
    const profile: GoogleOAuthProfile = {
      id: 'google_' + code.substring(0, 20), // Mock implementation
      email: 'user@example.com', // Should come from Google
      name: 'User Name', // Should come from Google
      image: undefined,
      accessToken: code,
      refreshToken: code,
      accessTokenExpiresAt: new Date(Date.now() + 3600 * 1000),
    }

    const result = await handleGoogleOAuth(profile)

    // Return tokens to client
    // Client should store these securely (httpOnly cookies recommended)
    return NextResponse.json(
      {
        user: {
          id: result.userId,
          email: result.email,
          isNewUser: result.isNewUser,
        },
        tokens: {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          expiresIn: result.expiresIn,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[oauth/google] Error:', error)
    return NextResponse.json(
      { error: 'OAuth callback failed' },
      { status: 500 }
    )
  }
}

export async function POST() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

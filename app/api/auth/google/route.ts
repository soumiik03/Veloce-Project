import { NextResponse } from "next/server"

export async function GET() {
  const clientID = process.env.GOOGLE_CLIENT_ID
  if (!clientID) {
    return NextResponse.json({ error: "GOOGLE_CLIENT_ID not configured" }, { status: 500 })
  }

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/google`
  const scopes = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/calendar.readonly",
  ].join(" ")

  const url = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${clientID}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=code&` +
    `scope=${encodeURIComponent(scopes)}&` +
    `access_type=offline&` +
    `prompt=consent&` +
    `state=static_state`

  return NextResponse.redirect(url)
}

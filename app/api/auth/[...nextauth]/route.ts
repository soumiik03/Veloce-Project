import { NextResponse } from "next/server"

export function GET() {
  return NextResponse.json({ error: "NextAuth is not configured" }, { status: 404 })
}

export const POST = GET

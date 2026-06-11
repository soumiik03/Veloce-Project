import { NextRequest, NextResponse } from "next/server"
import { registerUser } from "@/services/auth/register"
import { applyRateLimit, registerRateLimit } from "@/lib/rate-limit"

export async function POST(req: NextRequest) {
  const rateLimit = await applyRateLimit(req, registerRateLimit)
  if (rateLimit.limited) return rateLimit.response

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const result = await registerUser(body)

  if (!result.ok) {
    return NextResponse.json(result, { status: result.status })
  }

  return NextResponse.json(result, { status: 201 })
}

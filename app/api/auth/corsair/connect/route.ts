import { getSessionUser } from "@/lib/auth"
import { corsair } from "@/lib/corsair"
import { generateOAuthUrl } from "corsair/oauth"
import { NextRequest, NextResponse } from "next/server"
import { isDynamicUsageError } from "@/lib/auth/jwt"

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req)
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const pluginId = searchParams.get("plugin")

    if (!pluginId || (pluginId !== "gmail" && pluginId !== "googlecalendar")) {
      return NextResponse.json({ error: "Invalid or missing plugin parameter" }, { status: 400 })
    }

    const tenantId = user.id
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/corsair`

    const { url } = await generateOAuthUrl(corsair, pluginId, {
      tenantId,
      redirectUri,
    })

    return NextResponse.json({ url })
  } catch (error: any) {
    if (isDynamicUsageError(error)) {
      throw error
    }
    console.error("[corsair/connect] Error:", error)
    return NextResponse.json({ error: error.message || "Failed to generate connect URL" }, { status: 500 })
  }
}

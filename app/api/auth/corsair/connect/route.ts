import { getSessionUser } from "@/lib/auth"
import { corsair } from "@/lib/corsair"
import { generateOAuthUrl } from "corsair/oauth"
import { NextRequest, NextResponse } from "next/server"

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
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/google`

    const { url } = await generateOAuthUrl(corsair, pluginId, {
      tenantId,
      redirectUri,
    })

    return NextResponse.json({ url })
  } catch (error: any) {
    console.error("[corsair/connect] Error:", error)
    return NextResponse.json({ error: error.message || "Failed to generate connect URL" }, { status: 500 })
  }
}

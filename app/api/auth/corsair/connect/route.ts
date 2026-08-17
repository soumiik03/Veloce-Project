import { getSessionUser } from "@/lib/auth"
import { corsair } from "@/lib/corsair"
import { provisionTenant } from "@/lib/corsair/tenant"
import { generateOAuthUrl } from "corsair/oauth"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req)
    if (!user?.id) {
      console.warn("[corsair/connect] Authentication check failed. user is null or lacks id. Returning 401.");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const pluginId = searchParams.get("plugin")

    if (!pluginId || (pluginId !== "gmail" && pluginId !== "googlecalendar")) {
      console.warn(`[corsair/connect] Invalid or missing plugin parameter: ${pluginId}`);
      return NextResponse.json({ error: "Invalid or missing plugin parameter" }, { status: 400 })
    }

    const tenantId = user.id
    await provisionTenant(tenantId)

    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/google`

    const { url } = await generateOAuthUrl(corsair, pluginId, {
      tenantId,
      redirectUri,
    })

    const response = NextResponse.redirect(url)
    const referer = req.headers.get("referer")
    if (referer) {
      try {
        const refererUrl = new URL(referer)
        response.cookies.set("corsair_oauth_redirect", refererUrl.pathname, { maxAge: 600, httpOnly: true })
      } catch (e) {
        console.error("[corsair/connect] Error parsing referer URL:", referer, e);
      }
    }
    return response
  } catch (error: any) {
    console.error("[corsair/connect] Error during connect flow execution:", error)
    const referer = req.headers.get("referer")
    let targetPath = "/app/onboarding"
    if (referer) {
      try {
        targetPath = new URL(referer).pathname
      } catch {}
    }
    const errorUrl = new URL(targetPath, req.url)
    errorUrl.searchParams.set("error", error.message || "Failed to start OAuth")
    return NextResponse.redirect(errorUrl)
  }
}

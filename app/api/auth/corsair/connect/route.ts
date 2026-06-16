import { getSessionUser } from "@/lib/auth"
import { corsair } from "@/lib/corsair"
import { provisionTenant } from "@/lib/corsair/tenant"
import { generateOAuthUrl } from "corsair/oauth"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  console.log("[corsair/connect] Incoming request to /api/auth/corsair/connect");
  console.log("[corsair/connect] Checking environment variables (non-sensitive check):");
  console.log(`- CLERK_SECRET_KEY present: ${!!process.env.CLERK_SECRET_KEY}`);
  console.log(`- NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY present: ${!!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}`);
  console.log(`- DATABASE_URL present: ${!!process.env.DATABASE_URL}`);
  console.log(`- CORSAIR_KEK present: ${!!process.env.CORSAIR_KEK}`);
  console.log(`- GOOGLE_CLIENT_ID present: ${!!process.env.GOOGLE_CLIENT_ID}`);
  console.log(`- GOOGLE_CLIENT_SECRET present: ${!!process.env.GOOGLE_CLIENT_SECRET}`);
  console.log(`- NEXT_PUBLIC_APP_URL: ${process.env.NEXT_PUBLIC_APP_URL}`);

  try {
    const user = await getSessionUser(req)
    if (!user?.id) {
      console.warn("[corsair/connect] Authentication check failed. user is null or lacks id. Returning 401.");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const pluginId = searchParams.get("plugin")
    console.log(`[corsair/connect] Authenticated user: ${user.id} (${user.email}). Plugin: ${pluginId}`);

    if (!pluginId || (pluginId !== "gmail" && pluginId !== "googlecalendar")) {
      console.warn(`[corsair/connect] Invalid or missing plugin parameter: ${pluginId}`);
      return NextResponse.json({ error: "Invalid or missing plugin parameter" }, { status: 400 })
    }

    const tenantId = user.id
    console.log(`[corsair/connect] Provisioning tenant: ${tenantId}...`);
    await provisionTenant(tenantId)
    console.log("[corsair/connect] Tenant provisioned successfully.");

    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/google`
    console.log(`[corsair/connect] Redirect URI: ${redirectUri}`);

    console.log("[corsair/connect] Generating OAuth URL...");
    const { url } = await generateOAuthUrl(corsair, pluginId, {
      tenantId,
      redirectUri,
    })

    console.log(`[corsair/connect] Redirecting to OAuth URL for plugin=${pluginId}, tenant=${tenantId}: ${url}`)
    
    const response = NextResponse.redirect(url)
    const referer = req.headers.get("referer")
    if (referer) {
      try {
        const refererUrl = new URL(referer)
        console.log(`[corsair/connect] Referer found: ${refererUrl.pathname}. Setting corsair_oauth_redirect cookie.`);
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
    console.log(`[corsair/connect] Redirecting back with error to: ${errorUrl.toString()}`);
    return NextResponse.redirect(errorUrl)
  }
}

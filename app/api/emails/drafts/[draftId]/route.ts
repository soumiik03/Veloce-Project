import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth"
import { corsair } from "@/lib/corsair"

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ draftId: string }> }
) {
  try {
    const { draftId } = await params
    const user = await getSessionUser(req)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const tenant = corsair.withTenant(user.id)
    await tenant.gmail.api.drafts.delete({
      userId: "me",
      id: draftId,
    })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error: any) {
    console.error("[api/emails/drafts/delete] DELETE Error:", error)
    return NextResponse.json({ error: error.message || "Failed to delete draft" }, { status: 500 })
  }
}

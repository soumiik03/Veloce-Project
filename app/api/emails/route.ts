import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth"
import { getValidAccessToken } from "@/lib/auth/google"

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const accessToken = await getValidAccessToken(user.id)

    // Fetch the list of message IDs
    const listResponse = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=15", {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store"
    })

    if (!listResponse.ok) {
      const errorData = await listResponse.json()
      console.error("[emails] Failed to fetch message list:", errorData)
      return NextResponse.json({ error: "Failed to fetch from Gmail" }, { status: listResponse.status })
    }

    const listData = await listResponse.json()
    
    if (!listData.messages || listData.messages.length === 0) {
      return NextResponse.json({ threads: [] })
    }

    // Fetch full message details in parallel
    const messagePromises = listData.messages.map(async (msg: { id: string }) => {
      const msgRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!msgRes.ok) {
        return null
      }
      return msgRes.json()
    })

    const rawMessages = await Promise.all(messagePromises)

    // Map to our Thread type format
    const threads = rawMessages
      .filter(Boolean)
      .map(msg => {
        const headers = msg.payload.headers || []
        const getHeader = (name: string) => headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || ""
        
        // Clean up from address
        let from = getHeader("From")
        const match = from.match(/<(.+)>/)
        if (match) {
          from = match[1] // just the email address
        }

        // Format Date nicely
        let formattedDate = getHeader("Date")
        try {
          const date = new Date(formattedDate)
          formattedDate = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
        } catch {
          // ignore
        }

        return {
          id: msg.threadId || msg.id, // Group by thread if desired, but we map directly
          subject: getHeader("Subject") || "(No Subject)",
          from,
          date: formattedDate,
          snippet: msg.snippet,
        }
      })

    return NextResponse.json({ threads })
  } catch (error: any) {
    console.error("[emails] Error:", error)
    import('fs').then(fs => fs.writeFileSync('error.log', error.stack || error.message))
    return NextResponse.json({ error: error.message || "Failed to fetch emails" }, { status: 500 })
  }
}

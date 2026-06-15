import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth"
import { listInboxThreads, getThreadMessages } from "@/services/mail/thread-reader"
import { getTenant, provisionTenant } from "@/lib/corsair/tenant"
import { getValidAccessToken } from "@/lib/auth/google"
import { z } from "zod"

const headerValueSchema = (field: string) =>
  z.string().trim().min(1, `${field} is required`).refine(
    (value) => !/[\r\n]/.test(value),
    `${field} cannot contain line breaks`
  )

const emailListSchema = (field: string) =>
  headerValueSchema(field).refine((value) => {
    const addresses = value.split(",").map((address) => address.trim()).filter(Boolean)
    return addresses.length > 0 && addresses.every((address) => z.string().email().safeParse(address).success)
  }, `${field} must contain valid email address(es)`)

const optionalEmailListSchema = (field: string) =>
  z.preprocess(
    (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
    emailListSchema(field).optional()
  )

const composeEmailSchema = z.object({
  to: emailListSchema("To"),
  cc: optionalEmailListSchema("Cc"),
  bcc: optionalEmailListSchema("Bcc"),
  subject: headerValueSchema("Subject"),
  content: z.string().min(1, "Content is required"),
})

export async function GET(req: NextRequest) {
  let userId = ""
  try {
    const user = await getSessionUser(req)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    userId = user.id

    const { searchParams } = new URL(req.url)
    const maxResults = parseInt(searchParams.get("maxResults") || "10")

    await provisionTenant(userId)
    const listResult = await listInboxThreads(user.id, maxResults)
    const messages = (listResult.messages || []) as Array<{ threadId: string }>

    const threadIds = Array.from(new Set(messages.map((m) => m.threadId)))
    const threads = await Promise.all(
      threadIds.slice(0, 8).map(async (threadId: string) => {
        try {
          const detail = await getThreadMessages(user.id, threadId)
          if (!detail || !detail.messages || detail.messages.length === 0) return null
          const latest = detail.messages[detail.messages.length - 1]
          const headers = (latest.payload?.headers || []) as Array<{ name: string; value: string }>
          const getHeader = (name: string) => {
            const h = headers.find((x) => x.name.toLowerCase() === name.toLowerCase())
            return h ? h.value : null
          }
          
          let from = getHeader("from") || "Unknown Sender"
          const match = from.match(/<(.+)>/)
          if (match) {
            from = match[1] 
          }

          let formattedDate = getHeader("date") || ""
          try {
            const date = new Date(formattedDate)
            formattedDate = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
          } catch {
            
          }

          return {
            id: threadId,
            subject: getHeader("subject") || latest.snippet || "No Subject",
            from: from,
            date: formattedDate,
            snippet: latest.snippet || "",
          }
        } catch (err) {
          console.error("Error fetching thread details:", err)
          return null
        }
      })
    )

    return NextResponse.json({
      threads: threads.filter(Boolean),
    })
  } catch (error) {
    const err = error as Error
    console.error("[api/emails] GET Error:", err.message || String(err))
    return NextResponse.json({ error: err.message || "Failed to list emails" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  let userId = ""
  try {
    const user = await getSessionUser(req)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    userId = user.id

    const validation = composeEmailSchema.safeParse(await req.json())
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || "Invalid email payload" },
        { status: 400 }
      )
    }
    const { to, cc, bcc, subject, content } = validation.data

    try {
      await provisionTenant(userId)
      const tenant = getTenant(userId)
      
      const buildEmailRaw = () => {
        const headers = [`To: ${to}`]
        if (cc) headers.push(`Cc: ${cc}`)
        if (bcc) headers.push(`Bcc: ${bcc}`)
        headers.push(`Subject: ${subject}`)
        headers.push("MIME-Version: 1.0")
        headers.push('Content-Type: text/plain; charset="UTF-8"')
        headers.push("")
        headers.push(content)
        
        return Buffer.from(headers.join("\r\n"))
          .toString("base64")
          .replace(/\+/g, "-")
          .replace(/\//g, "_")
          .replace(/=+$/g, "")
      }

      const token = await getValidAccessToken(userId)
      const url = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages/send")
      const sendRes = await fetch(url.toString(), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ raw: buildEmailRaw() })
      })

      if (!sendRes.ok) {
        throw new Error("Failed to send message via Gmail API")
      }

      return NextResponse.json({ success: true }, { status: 200 })
    } catch (apiErr) {
      const err = apiErr as Error
      console.error("[api/emails] Google API send failed:", err.message)
      return NextResponse.json({ error: err.message || "Failed to send email via Google API" }, { status: 500 })
    }
  } catch (error) {
    const err = error as Error
    console.error("[api/emails] POST send Error:", err)
    return NextResponse.json({ error: err.message || "Failed to send email" }, { status: 500 })
  }
}

import { getValidAccessToken } from "@/lib/auth/google"

export type GmailThreadSummary = {
    id: string
    threadId: string
    snippet?: string | null
    subject?: string | null
    from?: string | null
    date?: string | null
}

export async function listInboxThreads(userId: string, maxResults = 20) {
    if (!userId) {
        throw new Error("userId is required")
    }

    const token = await getValidAccessToken(userId)
    const url = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages")
    url.searchParams.set("maxResults", maxResults.toString())
    url.searchParams.set("labelIds", "INBOX")

    const listRes = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` }
    })
    
    if (!listRes.ok) {
      throw new Error("Failed to list messages from Gmail API")
    }

    return await listRes.json()
}

export async function getThreadMessages(userId: string, threadId: string) {
    if (!userId || !threadId) {
        throw new Error("userId and threadId are required")
    }

    const token = await getValidAccessToken(userId)
    const url = new URL(`https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}`)

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` }
    })

    if (!res.ok) {
      throw new Error(`Failed to get thread ${threadId} from Gmail API`)
    }

    return await res.json()
}
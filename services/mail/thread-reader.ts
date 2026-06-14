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

    const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&labelIds=INBOX`, {
        headers: { Authorization: `Bearer ${token}` }
    })

    if (!res.ok) {
        throw new Error("Failed to list inbox threads")
    }

    return res.json()
}

export async function getThreadMessages(userId: string, threadId: string) {
    if (!userId || !threadId) {
        throw new Error("userId and threadId are required")
    }

    const token = await getValidAccessToken(userId)

    const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}`, {
        headers: { Authorization: `Bearer ${token}` }
    })

    if (!res.ok) {
        throw new Error("Failed to get thread messages")
    }

    return res.json()
}
import { getTenant } from "@/lib/corsair/tenant"

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

    const tenant = getTenant(userId)
    const res = await tenant.gmail.api.users.messages.list({
        userId: "me",
        maxResults,
        labelIds: ["INBOX"]
    })

    return res.data
}

export async function getThreadMessages(userId: string, threadId: string) {
    if (!userId || !threadId) {
        throw new Error("userId and threadId are required")
    }

    const tenant = getTenant(userId)
    const res = await tenant.gmail.api.users.threads.get({
        userId: "me",
        id: threadId
    })

    return res.data
}
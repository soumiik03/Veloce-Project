import { corsair } from "@/lib/corsair"

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

    const tenant = corsair.withTenant(userId)

    const result = await tenant.gmail.api.messages.list({
        userId: "me",
        maxResults,
        labelIds: ["INBOX"],
    })

    return result
}

export async function getThreadMessages(userId: string, threadId: string) {
    if (!userId || !threadId) {
        throw new Error("userId and threadId are required")
    }

    const tenant = corsair.withTenant(userId)

    const result = await tenant.gmail.api.threads.get({
        userId: "me",
        id: threadId,
    })

    return result
}
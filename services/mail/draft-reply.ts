import { corsair } from "@/lib/corsair"
import type { MeetingIntent } from "./thread-parser"

import { getThreadMessages } from "./thread-reader"

function base64UrlEncode(input: string) {
    return Buffer.from(input)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "")
}

function buildEmailReply({
    to,
    subject,
    body,
    messageId,
}: {
    to: string
    subject: string
    body: string
    messageId?: string | null
}) {
    const headers = [
        `To: ${to}`,
        `Subject: ${subject}`,
        "MIME-Version: 1.0",
        'Content-Type: text/plain; charset="UTF-8"',
    ]

    if (messageId) {
        headers.push(`In-Reply-To: ${messageId}`)
        headers.push(`References: ${messageId}`)
    }

    headers.push("")
    headers.push(body)

    return headers.join("\r\n")
}

export async function createReplyDraft(input: {
    userId: string
    to: string
    subject: string
    intent: MeetingIntent
}) {
    const { userId, to, subject, intent } = input

    if (!userId || !to || !subject) {
        throw new Error("userId, to, and subject are required")
    }

    const tenant = corsair.withTenant(userId)

    const body = intent.isRescheduleRequest
        ? "Thanks for the update. I’m checking availability and will suggest the best time shortly."
        : "Thanks for reaching out. I’ll take a look and get back with a few good options."

    const raw = base64UrlEncode(
        buildEmailReply({
            to,
            subject: subject.startsWith("Re:") ? subject : `Re: ${subject}`,
            body,
        })
    )

    return tenant.gmail.api.drafts.create({
        userId: "me",
        draft: {
            message: {
                raw,
            },
        },
    })
}

export async function sendDraftReply(input: {
    userId: string
    draftId: string
}) {
    const { userId, draftId } = input

    if (!userId || !draftId) {
        throw new Error("userId and draftId are required")
    }

    const tenant = corsair.withTenant(userId)

    return tenant.gmail.api.drafts.send({
        userId: "me",
        id: draftId,
    })
}

export async function sendThreadReply(input: {
    userId: string
    threadId: string
    body: string
}) {
    const { userId, threadId, body } = input

    if (!userId || !threadId || !body) {
        throw new Error("userId, threadId, and body are required")
    }

    const thread = await getThreadMessages(userId, threadId)
    if (!thread || !thread.messages || thread.messages.length === 0) {
        throw new Error("Thread not found or has no messages")
    }

    const latestMessage = thread.messages[thread.messages.length - 1]
    const headers = latestMessage.payload?.headers || []
    const getHeader = (name: string) => {
        const h = headers.find((x: any) => x.name.toLowerCase() === name.toLowerCase())
        return h ? h.value : null
    }

    const subject = getHeader("subject") || "Re: Reply"
    const replySubject = subject.startsWith("Re:") ? subject : `Re: ${subject}`
    const fromHeader = getHeader("from") || ""

    // Extract raw email address
    const emailRegex = /<([^>]+)>/
    const match = fromHeader.match(emailRegex)
    const to = match ? match[1] : fromHeader

    const messageId = getHeader("message-id")

    const tenant = corsair.withTenant(userId)
    const raw = base64UrlEncode(
        buildEmailReply({
            to,
            subject: replySubject,
            body,
            messageId,
        })
    )

    return tenant.gmail.api.messages.send({
        userId: "me",
        raw,
        threadId,
    })
}
import type { MeetingIntent } from "./thread-parser"
import { getThreadMessages } from "./thread-reader"
import { getValidAccessToken } from "@/lib/auth/google"

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
    const encodedSubject = `=?UTF-8?B?${Buffer.from(subject).toString("base64")}?=`
    const headers = [
        `To: ${to}`,
        `Subject: ${encodedSubject}`,
        "MIME-Version: 1.0",
        'Content-Type: text/plain; charset="UTF-8"',
    ]

    if (messageId) {
        headers.push(`In-Reply-To: ${messageId}`)
        headers.push(`References: ${messageId}`)
    }

    headers.push("")
    headers.push(body.replace(/\r?\n/g, "\r\n"))

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

    const token = await getValidAccessToken(userId)

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

    const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/drafts", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            message: { raw }
        })
    })

    if (!res.ok) {
        throw new Error("Failed to create draft")
    }
    return res.json()
}

export async function sendDraftReply(input: {
    userId: string
    draftId: string
}) {
    const { userId, draftId } = input

    if (!userId || !draftId) {
        throw new Error("userId and draftId are required")
    }

    const token = await getValidAccessToken(userId)

    const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/drafts/send", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            id: draftId
        })
    })

    if (!res.ok) {
        throw new Error("Failed to send draft")
    }
    return res.json()
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

    
    const emailRegex = /<([^>]+)>/
    const match = fromHeader.match(emailRegex)
    const to = match ? match[1] : fromHeader

    const messageId = getHeader("message-id")

    const raw = base64UrlEncode(
        buildEmailReply({
            to,
            subject: replySubject,
            body,
            messageId,
        })
    )

    const token = await getValidAccessToken(userId)

    const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            raw,
            threadId,
        })
    })

    if (!res.ok) {
        throw new Error("Failed to send thread reply")
    }
    return res.json()
}
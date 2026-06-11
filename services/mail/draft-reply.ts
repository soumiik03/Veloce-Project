import { corsair } from "@/lib/corsair"
import type { MeetingIntent } from "./thread-parser"

function base64UrlEncode(input: string) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "")
}

function buildEmail({
  to,
  subject,
  body,
}: {
  to: string
  subject: string
  body: string
}) {
  return [
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "",
    body,
  ].join("\r\n")
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
    buildEmail({
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

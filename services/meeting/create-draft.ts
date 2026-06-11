import { corsair } from "@/lib/corsair"

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

export async function createNegotiationDraft(input: {
  userId: string
  to: string
  subject: string
  slot: { start: string; end: string } | null
}) {
  const { userId, to, subject, slot } = input
  const tenant = corsair.withTenant(userId)

  let body = ""
  if (slot) {
    const startStr = new Date(slot.start).toLocaleString()
    const endStr = new Date(slot.end).toLocaleString()
    body = `Thanks for reaching out. I'm available to meet at the following proposed time slot:\n\nStart: ${startStr}\nEnd: ${endStr}\n\nPlease let me know if this works for you!`
  } else {
    body = `Thanks for reaching out. I couldn't find an available slot within the requested time range. Please let me know other times that work for you.`
  }

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

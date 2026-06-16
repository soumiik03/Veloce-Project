import { db } from "@/db"
import { users } from "@/db/schema/users"
import { commitments } from "@/db/schema/commitments"
import { getValidAccessToken } from "@/lib/auth/google"
import { and, eq, gte, lte, asc } from "drizzle-orm"

async function generateBriefingText(prompt: string): Promise<string> {
  const openrouterKey = process.env.OPENROUTER_API_KEY
  const openrouterModel = process.env.OPENROUTER_MODEL || "google/gemini-2.5-flash"
  const geminiKey = process.env.GEMINI_API_KEY || process.env.Gemini_API_KEY

  if (openrouterKey) {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openrouterKey}`,
          "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
          "X-Title": "Veloce"
        },
        body: JSON.stringify({
          model: openrouterModel,
          messages: [{ role: "user", content: prompt }]
        })
      })

      const data = await response.json()
      if (response.ok && data.choices?.[0]?.message?.content) {
        return data.choices[0].message.content
      }
    } catch (err) {
      console.warn("[Morning Briefing OpenRouter Error]:", err)
    }
  }

  if (geminiKey) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }]
            }
          ]
        })
      }
    )

    const data = await response.json()
    if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
      return data.candidates[0].content.parts[0].text
    }
  }

  throw new Error("No AI key configured or AI generation failed")
}

export async function sendMorningBriefingToUser(userId: string, email: string): Promise<{ success: boolean; briefing: string }> {
  // 1. Fetch unread emails from Gmail
  let emailSummary: any[] = []
  try {
    const gmailToken = await getValidAccessToken(userId, "gmail")
    const yesterdayTimestamp = Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000)
    const mailUrl = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages")
    mailUrl.searchParams.set("q", `is:unread after:${yesterdayTimestamp}`)
    mailUrl.searchParams.set("maxResults", "10")

    const mailRes = await fetch(mailUrl.toString(), {
      headers: { Authorization: `Bearer ${gmailToken}` }
    })

    if (mailRes.ok) {
      const mailData = await mailRes.json()
      const messages = mailData.messages || []

      const details = await Promise.all(
        messages.slice(0, 5).map(async (msg: any) => {
          try {
            const detailRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`, {
              headers: { Authorization: `Bearer ${gmailToken}` }
            })
            if (!detailRes.ok) return null
            const detail = await detailRes.json()
            const headers = detail.payload?.headers || []
            const getHeader = (n: string) => headers.find((h: any) => h.name.toLowerCase() === n.toLowerCase())?.value || ""
            const subject = getHeader("subject")
            const from = getHeader("from")
            const snippet = detail.snippet || ""

            const bodyLower = (snippet + " " + subject).toLowerCase()
            let priority = "low"
            if (bodyLower.includes("urgent") || bodyLower.includes("asap") || bodyLower.includes("deadline") || bodyLower.includes("today")) {
              priority = "high"
            } else if (bodyLower.includes("please") || bodyLower.includes("question") || bodyLower.includes("meeting")) {
              priority = "medium"
            }

            return { sender: from, subject, snippet, priority }
          } catch {
            return null
          }
        })
      )
      emailSummary = details.filter(Boolean)
    }
  } catch (err: any) {
    console.warn(`[Briefing Gmail Fetch failed for ${email}]:`, err.message)
  }

  // 2. Fetch today's meetings from Calendar
  let meetingSummary: any[] = []
  try {
    const calToken = await getValidAccessToken(userId, "calendar")
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)

    const calUrl = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events")
    calUrl.searchParams.set("timeMin", todayStart.toISOString())
    calUrl.searchParams.set("timeMax", todayEnd.toISOString())
    calUrl.searchParams.set("singleEvents", "true")
    calUrl.searchParams.set("orderBy", "startTime")

    const calRes = await fetch(calUrl.toString(), {
      headers: { Authorization: `Bearer ${calToken}` }
    })

    if (calRes.ok) {
      const meetings = await calRes.json()
      meetingSummary = (meetings.items || []).map((event: any) => ({
        title: event.summary || "No Title",
        startTime: event.start?.dateTime || event.start?.date || "",
        endTime: event.end?.dateTime || event.end?.date || "",
        attendees: event.attendees?.map((a: any) => a.email) || [],
        location: event.location || "",
        description: event.description || ""
      }))
    }
  } catch (err: any) {
    console.warn(`[Briefing Calendar Fetch failed for ${email}]:`, err.message)
  }

  // 3. Fetch pending commitments from DB (and seed mock data if empty)
  const thisWeekEnd = new Date()
  thisWeekEnd.setDate(thisWeekEnd.getDate() + 7)

  let userCommitments = await db
    .select()
    .from(commitments)
    .where(
      and(
        eq(commitments.userId, userId),
        eq(commitments.status, "pending"),
        gte(commitments.deadline, new Date()),
        lte(commitments.deadline, thisWeekEnd)
      )
    )
    .orderBy(asc(commitments.deadline))

  if (userCommitments.length === 0) {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(12, 0, 0, 0)

    const inThreeDays = new Date()
    inThreeDays.setDate(inThreeDays.getDate() + 3)
    inThreeDays.setHours(17, 0, 0, 0)

    const inFiveDays = new Date()
    inFiveDays.setDate(inFiveDays.getDate() + 5)
    inFiveDays.setHours(9, 0, 0, 0)

    const mockData = [
      { userId, promise: "Send project report draft", deadline: tomorrow, status: "pending", priority: "high" },
      { userId, promise: "Review user onboarding mockups", deadline: inThreeDays, status: "pending", priority: "medium" },
      { userId, promise: "Submit Q3 budget proposal", deadline: inFiveDays, status: "pending", priority: "high" }
    ]

    await db.insert(commitments).values(mockData)

    userCommitments = await db
      .select()
      .from(commitments)
      .where(
        and(
          eq(commitments.userId, userId),
          eq(commitments.status, "pending"),
          gte(commitments.deadline, new Date()),
          lte(commitments.deadline, thisWeekEnd)
        )
      )
      .orderBy(asc(commitments.deadline))
  }

  const commitmentSummary = userCommitments.map(c => {
    const daysLeft = Math.ceil((c.deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    return {
      promise: c.promise,
      deadline: c.deadline.toLocaleDateString(),
      daysLeft,
      priority: c.priority
    }
  })

  // 4. Generate Briefing using AI
  const formattedDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  })

  const aiPrompt = `
Create a morning briefing for ${email} with this data:

TOP EMAILS (unread from past 24h):
${emailSummary.map(e => `- FROM: ${e.sender} | SUBJECT: "${e.subject}" | PRIORITY: ${e.priority} | SNIPPET: ${e.snippet}`).join("\n")}

TODAY'S MEETINGS:
${meetingSummary.map(m => `- ${m.title} at ${new Date(m.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`).join("\n")}

PENDING COMMITMENTS:
${commitmentSummary.map(c => `- ${c.promise} (due: ${c.deadline}, ${c.daysLeft} days left, priority: ${c.priority})`).join("\n")}

Format the output EXACTLY like this:

MORNING BRIEFING — ${formattedDate}

TOP 3 EMAILS TO RESPOND:
1. [Sender]: "[Subject snippet]" → [Priority/Deadline]
2. [Sender]: "[Subject snippet]" → [Priority/Deadline]
3. [Sender]: "[Subject snippet]" → [Priority/Deadline]

TODAY'S MEETINGS ([Count]):
[Time] IST — [Meeting Title]
  • Prep: [Context from previous emails/meetings]

COMMITMENTS THIS WEEK:
• [Promise] → [Deadline] ([Days left] days left)

SUGGESTION:
"[One actionable suggestion tip based on priority]"

Total review time: 30 seconds

CRITICAL FORMATTING RULE: Do NOT use markdown symbols (like **, *, __, _, or bullet points with stars) in your output message. Write clean, natural plain text, using uppercase headings (e.g. SUMMARY, TIME) or standard spaces/indents for formatting. Do not output asterisks or stars. Do not include any emojis in the output.
`

  const briefing = await generateBriefingText(aiPrompt)

  // 5. Send Briefing Email to User via Gmail API
  const gmailToken = await getValidAccessToken(userId, "gmail")
  
  const subjectText = `Morning Briefing — ${formattedDate}`
  const fromName = "Veloce Assistant"
  const encodedSubject = `=?UTF-8?B?${Buffer.from(subjectText).toString("base64")}?=`
  const encodedFromName = `=?UTF-8?B?${Buffer.from(fromName).toString("base64")}?=`

  const emailHeaders = [
    `From: ${encodedFromName} <${email}>`,
    `To: ${email}`,
    `Subject: ${encodedSubject}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "",
    briefing.replace(/\r?\n/g, "\r\n")
  ]
  const raw = Buffer.from(emailHeaders.join("\r\n"))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "")

  const sendRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${gmailToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw })
  })

  if (!sendRes.ok) {
    const errorText = await sendRes.text()
    throw new Error(`Gmail API send failed: ${errorText}`)
  }

  return { success: true, briefing }
}

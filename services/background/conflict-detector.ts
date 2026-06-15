
import { listInboxThreads, getThreadMessages } from "@/services/mail/thread-reader"
import { getValidAccessToken } from "@/lib/auth/google"
import { Redis } from "@upstash/redis"

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})


const localCache = new Map<string, { value: any; expires: number }>()

async function getCache(key: string): Promise<any> {
  try {
    return await redis.get(key)
  } catch {
    const entry = localCache.get(key)
    if (entry && entry.expires > Date.now()) {
      return entry.value
    }
    return null
  }
}

async function setCache(key: string, value: any, ttlSeconds: number) {
  try {
    await redis.set(key, JSON.stringify(value), { ex: ttlSeconds })
  } catch {
    localCache.set(key, {
      value,
      expires: Date.now() + ttlSeconds * 1000
    })
  }
}


async function getEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.Gemini_API_KEY
  if (!apiKey) {
    
    return Array.from({ length: 768 }, () => Math.random())
  }

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "models/gemini-embedding-001",
          content: { parts: [{ text }] }
        })
      }
    )

    if (!res.ok) {
      throw new Error(`Gemini embedding failed: ${await res.text()}`)
    }

    const data = await res.json()
    return data.embedding?.values || Array.from({ length: 768 }, () => Math.random())
  } catch (err) {
    console.error("Embedding API error:", err)
    return Array.from({ length: 768 }, () => Math.random())
  }
}

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0
  let dotProduct = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i]
    normA += vecA[i] * vecA[i]
    normB += vecB[i] * vecB[i]
  }
  if (normA === 0 || normB === 0) return 0
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

const CONFLICT_KEYWORDS = [
  "reschedule", "can't make it", "conflict", "move the meeting", 
  "postpone", "change the time", "busy that day", "other commitment",
  "shift the call", "another time"
]

export async function detectConflicts(userId: string) {
  const cacheKey = `conflicts:${userId}`
  
  
  const lastRun = await getCache(`last_conflict_run:${userId}`)
  if (lastRun) {
    return await getCache(cacheKey)
  }

  console.log(`[Conflict Detector] Starting scan for user ${userId}...`)

  try {
    
    let emails: any[] = []
    try {
      const listResult = await listInboxThreads(userId, 10)
      const messages = listResult.messages || []
      const threadIds = Array.from(new Set(messages.map((m: any) => m.threadId)))
      
      const fetchedEmails = await Promise.all(
        threadIds.slice(0, 5).map(async (tId: any) => {
          const detail = await getThreadMessages(userId, tId)
          if (!detail || !detail.messages || detail.messages.length === 0) return null
          const latest = detail.messages[detail.messages.length - 1]
          const headers = latest.payload?.headers || []
          const getHeader = (n: string) => headers.find((x: any) => x.name.toLowerCase() === n.toLowerCase())?.value || ""
          return {
            id: tId,
            subject: getHeader("subject"),
            from: getHeader("from"),
            snippet: latest.snippet || ""
          }
        })
      )
      emails = fetchedEmails.filter(Boolean) as any
    } catch (err: any) {
      console.error("[Conflict Detector] Failed to fetch emails:", err.message)
      throw err
    }

    
    let events: any[] = []
    try {
      const tomorrow = new Date()
      tomorrow.setHours(0,0,0,0)
      const nextWeek = new Date(tomorrow)
      nextWeek.setDate(tomorrow.getDate() + 7)

      const token = await getValidAccessToken(userId, 'calendar')
      const calendarUrl = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events")
      calendarUrl.searchParams.set("timeMin", tomorrow.toISOString())
      calendarUrl.searchParams.set("timeMax", nextWeek.toISOString())
      calendarUrl.searchParams.set("singleEvents", "true")

      const res = await fetch(calendarUrl.toString(), {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (!res.ok) throw new Error("Failed to fetch events")
      
      const result = await res.json()
      events = result.items || []
    } catch (err: any) {
      console.error("[Conflict Detector] Failed to fetch events:", err.message)
      throw err
    }

    const conflicts: any[] = []

    
    for (const email of emails) {
      const emailText = `${email.subject} ${email.snippet}`.toLowerCase()
      
      
      const hasKeyword = CONFLICT_KEYWORDS.some(kw => emailText.includes(kw))
      if (!hasKeyword) continue

      
      const emailEmbedding = await getEmbedding(`${email.subject}: ${email.snippet}`)

      for (const event of events) {
        const eventEmbedding = await getEmbedding(event.summary)

        const similarity = cosineSimilarity(emailEmbedding, eventEmbedding)

        
        const isAttendeeMatch = event.attendees?.some((att: any) => 
          email.from.toLowerCase().includes(att.email.toLowerCase())
        )

        if (similarity > 0.65 || (hasKeyword && isAttendeeMatch)) {
          
          const friday = new Date()
          const dayOfWeek = friday.getDay()
          const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7
          friday.setDate(friday.getDate() + daysUntilFriday)
          
          const friday11am = new Date(friday)
          friday11am.setHours(11, 0, 0, 0)
          const friday2pm = new Date(friday)
          friday2pm.setHours(14, 0, 0, 0)
          const friday4pm = new Date(friday)
          friday4pm.setHours(16, 0, 0, 0)

          conflicts.push({
            id: `conflict-${email.id}-${event.id}`,
            emailThreadId: email.id,
            emailSubject: email.subject,
            emailSnippet: email.snippet,
            sender: email.from,
            currentEventId: event.id,
            currentEventSummary: event.summary,
            currentEventStart: event.start.dateTime || event.start.date || new Date().toISOString(),
            suggestedTimes: [
              friday11am.toISOString(),
              friday2pm.toISOString(),
              friday4pm.toISOString()
            ]
          })
        }
      }
    }

    
    await setCache(cacheKey, conflicts, 300) 
    await setCache(`last_conflict_run:${userId}`, "true", 60) 
    
    console.log(`[Conflict Detector] Completed. Found ${conflicts.length} conflicts.`)
    return conflicts
  } catch (error) {
    console.error("[Conflict Detector] Execution error:", error)
    return []
  }
}

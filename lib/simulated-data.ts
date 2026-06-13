import fs from "fs"
import path from "path"

const EMAILS_FILE = path.resolve(process.cwd(), "db/simulated-emails.json")
const EVENTS_FILE = path.resolve(process.cwd(), "db/simulated-events.json")

function readJsonFile(filePath: string): any {
  try {
    if (!fs.existsSync(filePath)) {
      return {}
    }
    const data = fs.readFileSync(filePath, "utf-8")
    return JSON.parse(data)
  } catch (err) {
    console.error(`Error reading file ${filePath}:`, err)
    return {}
  }
}

function writeJsonFile(filePath: string, data: any) {
  try {
    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8")
  } catch (err) {
    console.error(`Error writing file ${filePath}:`, err)
  }
}

export interface SimulatedEmail {
  id: string
  subject: string
  from: string
  to: string
  date: string
  snippet: string
  messages?: any[]
}

const defaultMockThreads = [
  {
    id: "mock-thread-1",
    subject: "Re: Quick sync on project architecture",
    from: "john.davis@company.com",
    to: "me",
    date: "Today, 2:14 PM",
    snippet: "Hey, I have a conflict with our 4pm call tomorrow. Can we reschedule it to Friday morning?",
    messages: [
      {
        payload: {
          headers: [
            { name: "Subject", value: "Re: Quick sync on project architecture" },
            { name: "From", value: "john.davis@company.com" },
            { name: "Date", value: "Today, 2:14 PM" }
          ]
        },
        snippet: "Hey, I have a conflict with our 4pm call tomorrow. Can we reschedule it to Friday morning?"
      }
    ]
  },
  {
    id: "mock-thread-2",
    subject: "Weekly marketing review",
    from: "sarah.smith@marketing.com",
    to: "me",
    date: "Yesterday, 5:30 PM",
    snippet: "All set for the review next Tuesday. I will share the slide deck beforehand.",
    messages: [
      {
        payload: {
          headers: [
            { name: "Subject", value: "Weekly marketing review" },
            { name: "From", value: "sarah.smith@marketing.com" },
            { name: "Date", value: "Yesterday, 5:30 PM" }
          ]
        },
        snippet: "All set for the review next Tuesday. I will share the slide deck beforehand."
      }
    ]
  }
]

export function getSimulatedEmails(userId: string): SimulatedEmail[] {
  const store = readJsonFile(EMAILS_FILE)
  const userEmails = store[userId] || []
  return [...userEmails, ...defaultMockThreads]
}

export function saveSimulatedEmail(userId: string, email: Omit<SimulatedEmail, "id">) {
  const store = readJsonFile(EMAILS_FILE)
  if (!store[userId]) {
    store[userId] = []
  }
  const id = `sim-thread-${Date.now()}`
  const newEmail: SimulatedEmail = {
    ...email,
    id,
    messages: [
      {
        payload: {
          headers: [
            { name: "Subject", value: email.subject },
            { name: "From", value: email.from },
            { name: "To", value: email.to },
            { name: "Date", value: email.date }
          ]
        },
        snippet: email.snippet
      }
    ]
  }
  store[userId].unshift(newEmail)
  writeJsonFile(EMAILS_FILE, store)
  return newEmail
}

export interface SimulatedEvent {
  id: string
  summary: string
  start: { dateTime: string }
  end: { dateTime: string }
  attendees: { email: string }[]
  status: string
}

export function getSimulatedEvents(userId: string): SimulatedEvent[] {
  const store = readJsonFile(EVENTS_FILE)
  const userEvents = store[userId] || []
  
  // Default events relative to today
  const defaultEvents = [
    {
      id: "mock-event-1",
      summary: "Project Architecture Sync",
      start: { dateTime: new Date(Date.now() + 24 * 3600 * 1000).toISOString() }, // Tomorrow
      end: { dateTime: new Date(Date.now() + 24 * 3600 * 1000 + 1800 * 1000).toISOString() },
      attendees: [{ email: "john.davis@company.com" }, { email: "me" }],
      status: "confirmed"
    },
    {
      id: "mock-event-2",
      summary: "Sync on Marketing Deck",
      start: { dateTime: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString() },
      end: { dateTime: new Date(Date.now() + 3 * 24 * 3600 * 1000 + 3600 * 1000).toISOString() },
      attendees: [{ email: "sarah.smith@marketing.com" }, { email: "me" }],
      status: "confirmed"
    }
  ]

  return [...userEvents, ...defaultEvents]
}

export function saveSimulatedEvent(userId: string, event: Omit<SimulatedEvent, "id">) {
  const store = readJsonFile(EVENTS_FILE)
  if (!store[userId]) {
    store[userId] = []
  }
  const id = `sim-event-${Date.now()}`
  const newEvent = { ...event, id }
  store[userId].push(newEvent)
  writeJsonFile(EVENTS_FILE, store)
  return newEvent
}

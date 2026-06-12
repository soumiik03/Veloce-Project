import { useEffect, useState } from "react"
import { Thread } from "@/types"

export function useInbox() {
  const [threads, setThreads] = useState<Thread[]>([])
  const [loading, setLoading] = useState(true)
  const [isDemoMode, setIsDemoMode] = useState(false)

  const mockThreads: Thread[] = [
    {
      id: "mock-thread-1",
      subject: "Re: Quick sync on project architecture",
      from: "john.davis@company.com",
      date: "Today, 2:14 PM",
      snippet: "Hey, I have a conflict with our 4pm call tomorrow. Can we reschedule it to Friday morning?",
    },
    {
      id: "mock-thread-2",
      subject: "Weekly marketing review",
      from: "sarah.smith@marketing.com",
      date: "Yesterday, 5:30 PM",
      snippet: "All set for the review next Tuesday. I will share the slide deck beforehand.",
    }
  ]

  const fetchThreads = async () => {
    setLoading(true)
    try {
      const cookieVal = document.cookie
        .split("; ")
        .find(row => row.startsWith("accessToken="))
        ?.split("=")[1]

      const res = await fetch("/api/emails", {
        headers: {
          "Authorization": `Bearer ${cookieVal || ""}`
        }
      })
      const data = await res.json()
      if (res.ok && data.threads && data.threads.length > 0) {
        setThreads(data.threads)
        setIsDemoMode(false)
      } else {
        setThreads(mockThreads)
        setIsDemoMode(true)
      }
    } catch (err) {
      setThreads(mockThreads)
      setIsDemoMode(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchThreads()
  }, [])

  return { threads, loading, isDemoMode, refresh: fetchThreads }
}

export const unstable_instant = {
  prefetch: "runtime",
  unstable_disableValidation: true,
  samples: [
    {
      params: { id: "sample-thread-id" }
    }
  ]
}

import { Suspense } from "react"
import { ChatPageClient } from "../chat-page-client"

export default async function ChatThreadPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center bg-[#0d0d0d] text-[#888888] font-mono text-[13px] h-screen">
        LOADING CHAT THREAD...
      </div>
    }>
      {params.then(({ id }) => (
        <ChatPageClient id={id} />
      ))}
    </Suspense>
  )
}

export const unstable_instant = {
  prefetch: "runtime",
  unstable_disableValidation: true,
  samples: [
    {
      params: { threadId: "sample-thread-id" }
    }
  ]
}

import { Suspense } from "react"
import { MailPageClient } from "../mail-page-client"

export default async function MailThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>
}) {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center bg-[#0d0d0d] text-[#888888] font-mono text-[13px] h-screen">
        LOADING EMAIL CONTEXT...
      </div>
    }>
      {params.then(({ threadId }) => (
        <MailPageClient initialThreadId={threadId} />
      ))}
    </Suspense>
  )
}

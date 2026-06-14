import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import NeuroBackground from "@/components/neuro-background"
import { Suspense } from "react"
import { ClerkProvider } from "@clerk/nextjs"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Veloce | AI-Native Rescheduling Console",
  description: "Intercept reschedule requests, scan availability constraints, and orchestrate calendar updates.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col relative bg-[#030712]">
        <ClerkProvider>
          <NeuroBackground />
          <div className="relative z-10 min-h-screen flex flex-col">
            <Suspense fallback={
              <div className="flex-1 flex items-center justify-center bg-[#030712] text-[#888888] font-mono text-[13px] h-screen">
                INITIALIZING VELOCE SYSTEM...
              </div>
            }>
              {children}
            </Suspense>
          </div>
        </ClerkProvider>
      </body>
    </html>
  )
}

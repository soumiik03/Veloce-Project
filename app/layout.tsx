import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import NeuroBackground from "@/components/neuro-background"
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
        <NeuroBackground />
        <div className="relative z-10 min-h-screen flex flex-col">
          {children}
        </div>
      </body>
    </html>
  )
}

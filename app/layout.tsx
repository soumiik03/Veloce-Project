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
        <ClerkProvider
          appearance={{
            variables: {
              colorBackground: "#090d16",
              colorPrimary: "#6366f1",
              colorForeground: "#f9fafb",
              colorMutedForeground: "#9ca3af",
              colorInput: "#111827",
              colorInputForeground: "#f9fafb",
              colorBorder: "rgba(255, 255, 255, 0.12)",
            },
            elements: {
              card: "bg-[#090d16] border border-white/10 shadow-2xl rounded-2xl",
              headerTitle: "!text-white font-semibold",
              headerSubtitle: "!text-gray-400",
              socialButtonsBlockButton: "bg-[#111827] border border-white/10 !text-white hover:bg-white/10 transition-colors",
              socialButtonsBlockButtonText: "!text-white font-medium",
              formButtonPrimary: "bg-indigo-600 hover:bg-indigo-500 !text-white font-medium transition-colors shadow-lg shadow-indigo-500/20",
              footerActionLink: "!text-indigo-400 hover:!text-indigo-300 font-medium",
              formFieldInput: "bg-[#111827] border border-white/10 !text-white focus:border-indigo-500 transition-colors",
              identityPreviewText: "!text-white font-medium",
              identityPreviewEditButton: "!text-indigo-400 hover:!text-indigo-300",
              dividerLine: "bg-white/10",
              dividerText: "!text-gray-400",
              formFieldLabel: "!text-gray-300 font-medium",
              userButtonPopoverCard: "bg-[#090d16] border border-white/10 shadow-2xl",
              userButtonPopoverActionButton: "hover:bg-white/5 !text-gray-300 hover:!text-white",
              userButtonPopoverActionButtonText: "!text-gray-300 hover:!text-white",
              userButtonPopoverFooter: "hidden",
            }
          }}
        >
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

import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import { validatePassword, upsertGoogleAccount } from "@/lib/auth/oauth"
import { verifyAccessToken } from "@/lib/auth/jwt"
import { handleGoogleOAuth } from "@/services/auth/google"
import type { NextRequest } from "next/server"

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          access_type: "offline",
          prompt: "consent",
          scope: "openid profile email https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/calendar",
        },
      },
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        const result = await validatePassword(credentials.email as string, credentials.password as string)
        if (!result) return null
        return {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.userId = user.id
      }
      if (account && account.provider === "google") {
        const googleProfile = {
          id: account.providerAccountId,
          email: token.email || "",
          name: token.name || "",
          image: token.picture || "",
          accessToken: account.access_token || "",
          refreshToken: account.refresh_token || "",
          accessTokenExpiresAt: account.expires_at ? new Date(account.expires_at * 1000) : undefined,
        }
        try {
          const result = await handleGoogleOAuth(googleProfile)
          token.userId = result.userId
        } catch (error) {
          console.error("Error handling Google OAuth in jwt callback:", error)
        }
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.userId as string
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  secret: process.env.AUTH_SECRET,
})

export async function getSessionUser(req?: NextRequest) {
  const session = await auth()
  if (session?.user?.id) {
    return {
      id: session.user.id,
      email: session.user.email || "",
      name: session.user.name || "",
    }
  }

  let token: string | null = null
  if (req) {
    const authHeader = req.headers.get("Authorization")
    if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
      token = authHeader.substring(7)
    } else {
      token = req.cookies.get("accessToken")?.value || null
    }
  }

  if (token) {
    const payload = verifyAccessToken(token)
    if (payload) {
      return {
        id: payload.userId,
        email: payload.email,
        name: "",
      }
    }
  }

  return null
}
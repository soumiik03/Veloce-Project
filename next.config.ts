import type { NextConfig } from "next";

const securityHeaders = [
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.clerk.accounts.dev https://clerk.com https://challenges.cloudflare.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' blob: data: https: https://*.clerk.accounts.dev https://img.clerk.com https://images.clerk.dev",
      "font-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "frame-src 'self' https://*.clerk.accounts.dev https://clerk.com https://challenges.cloudflare.com",
      "connect-src 'self' https://accounts.google.com https://*.clerk.accounts.dev https://clerk.com https://challenges.cloudflare.com",
      "upgrade-insecure-requests",
    ].join("; "),
  },
]

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  cacheComponents: true,
  headers: async () => [
    {
      source: "/(.*)",
      headers: securityHeaders,
    },
  ],
  poweredByHeader: false,
}

export default nextConfig;

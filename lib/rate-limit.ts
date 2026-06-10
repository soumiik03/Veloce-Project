import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'


if (!process.env.UPSTASH_REDIS_REST_URL) {
  throw new Error('UPSTASH_REDIS_REST_URL is not set')
}
if (!process.env.UPSTASH_REDIS_REST_TOKEN) {
  throw new Error('UPSTASH_REDIS_REST_TOKEN is not set')
}

const redis = new Redis({
  url:   process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})


export const loginRateLimit = new Ratelimit({
  redis,
  limiter:  Ratelimit.slidingWindow(5, '15 m'),
  prefix:   'rl:login',
  analytics: true,
})


export const registerRateLimit = new Ratelimit({
  redis,
  limiter:  Ratelimit.slidingWindow(3, '1 h'),
  prefix:   'rl:register',
  analytics: true,
})

import { NextRequest, NextResponse } from 'next/server'

type RateLimitResult =
  | { limited: false }
  | { limited: true; response: NextResponse }


function getIP(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  const ip = forwarded?.split(',')[0]?.trim()
  return ip ?? '127.0.0.1'
}

export async function applyRateLimit(
  req: NextRequest,
  limiter: Ratelimit
): Promise<RateLimitResult> {
  const ip = getIP(req)
  const { success, limit, remaining, reset } = await limiter.limit(ip)

  if (success) return { limited: false }

  return {
    limited: true,
    response: NextResponse.json(
      {
        error:   'Too many requests',
        message: 'You have exceeded the rate limit. Please try again later.',
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit':     limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset':     reset.toString(),
         
          'Retry-After':           Math.ceil((reset - Date.now()) / 1000).toString(),
        },
      }
    ),
  }
}
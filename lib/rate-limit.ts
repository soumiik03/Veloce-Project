import { redis } from "@/lib/redis"

interface RateLimitOptions {
  key: string
  limit: number
  windowMs: number
}

interface RateLimitResult {
  success: boolean
  remaining: number
  resetAt: number
}

export async function rateLimit({
  key,
  limit,
  windowMs,
}: RateLimitOptions): Promise<RateLimitResult> {
  const windowSeconds = Math.floor(windowMs / 1000)
  const now = Date.now()
  const resetAt = now + windowMs

  const current = await redis.incr(key)

  if (current === 1) {
    await redis.expire(key, windowSeconds)
  }

  const ttl = await redis.ttl(key)
  const actualResetAt = now + ttl * 1000

  return {
    success: current <= limit,
    remaining: Math.max(0, limit - current),
    resetAt: actualResetAt,
  }
}
import { Redis } from "@upstash/redis";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

// Safely create Redis client - allows building without env vars
const createRedisClient = () => {
  try {
    return new Redis({
      url: process.env.REDIS_URL || "",
      token: process.env.REDIS_TOKEN || "",
    });
  } catch {
    console.warn("Redis initialization deferred (will error at runtime if used without env vars)");
    return undefined;
  }
};

export const redis = globalForRedis.redis ?? createRedisClient();

if (process.env.NODE_ENV !== "production" && redis) {
  globalForRedis.redis = redis;
}

export default redis;

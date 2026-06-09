import { Redis } from "ioredis";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

export const redis =
  globalForRedis.redis ??
  new Redis(process.env.REDIS_URL!, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  });

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;

export default redis;
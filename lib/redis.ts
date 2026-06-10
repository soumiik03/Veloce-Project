import { Redis } from "@upstash/redis";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

export const redis =
  globalForRedis.redis ??
  new Redis({
    url: process.env.REDIS_URL || "",
    token: process.env.REDIS_TOKEN || "",
  });

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;

export default redis;
import { getRedisClient, isRedisReady } from "../config/redis.js";
import logger from "../utils/logger.js";

const DEFAULT_TTL = 60;

export async function cacheGet(key) {
  if (!isRedisReady()) return null;
  try {
    const raw = await getRedisClient().get(`cache:${key}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    logger.warn("cacheGet failed", { key, error: err.message });
    return null;
  }
}

export async function cacheSet(key, value, ttlSeconds = DEFAULT_TTL) {
  if (!isRedisReady()) return false;
  try {
    await getRedisClient().set(`cache:${key}`, JSON.stringify(value), {
      EX: ttlSeconds,
    });
    return true;
  } catch (err) {
    logger.warn("cacheSet failed", { key, error: err.message });
    return false;
  }
}

export async function cacheDel(key) {
  if (!isRedisReady()) return;
  try {
    await getRedisClient().del(`cache:${key}`);
  } catch (err) {
    logger.warn("cacheDel failed", { key, error: err.message });
  }
}

export async function cacheDelPattern(pattern) {
  if (!isRedisReady()) return;
  try {
    const redis = getRedisClient();
    const keys = await redis.keys(`cache:${pattern}`);
    if (keys.length) await redis.del(keys);
  } catch (err) {
    logger.warn("cacheDelPattern failed", { pattern, error: err.message });
  }
}

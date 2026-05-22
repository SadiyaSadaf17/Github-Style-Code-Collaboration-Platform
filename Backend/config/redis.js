import { createClient } from "redis";
import logger from "../utils/logger.js";

let client = null;
let ready = false;
let lastErrorLog = 0;
const ERROR_LOG_INTERVAL = 5000; // ms

export function isRedisReady() {
  return ready && client?.isOpen;
}

export async function connectRedis() {
  const url = process.env.REDIS_URL;
  if (!url) {
    logger.info("REDIS_URL not set — caching and job queues disabled");
    return null;
  }

  try {
    client = createClient({ url });
    client.on("error", (err) => {
      const now = Date.now();
      if (now - lastErrorLog > ERROR_LOG_INTERVAL) {
        logger.warn("Redis client error", { error: err.message });
        lastErrorLog = now;
      }
      ready = false;
    });
    client.on("connect", () => {
      ready = true;
      logger.info("Redis connected");
    });
    client.on("end", () => {
      ready = false;
    });
    await client.connect();
    ready = true;
    return client;
  } catch (err) {
    logger.warn("Redis connection failed — running without cache/queues", {
      error: err.message,
    });
    client = null;
    ready = false;
    return null;
  }
}

export function getRedisClient() {
  return client;
}

export async function disconnectRedis() {
  if (client?.isOpen) {
    await client.quit();
  }
  client = null;
  ready = false;
}

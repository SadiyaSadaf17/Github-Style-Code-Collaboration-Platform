import mongoose from "mongoose";
import { isRedisReady, getRedisClient } from "../config/redis.js";
import { isQueueEnabled } from "./queueService.js";

const startTime = Date.now();

export function getUptimeSeconds() {
  return Math.floor((Date.now() - startTime) / 1000);
}

export async function getMongoStatus() {
  const state = mongoose.connection.readyState;
  const labels = ["disconnected", "connected", "connecting", "disconnecting"];
  return {
    status: state === 1 ? "up" : state === 2 ? "connecting" : "down",
    readyState: state,
    label: labels[state] || "unknown",
  };
}

export async function getRedisStatus() {
  if (!process.env.REDIS_URL) {
    return { status: "disabled", configured: false };
  }
  if (!isRedisReady()) {
    return { status: "down", configured: true };
  }
  try {
    const pong = await getRedisClient().ping();
    return { status: pong === "PONG" ? "up" : "degraded", configured: true };
  } catch (err) {
    return { status: "down", configured: true, error: err.message };
  }
}

export async function getPlatformHealth() {
  const [mongo, redis] = await Promise.all([getMongoStatus(), getRedisStatus()]);
  const queues = { enabled: isQueueEnabled() };

  const coreUp = mongo.status === "up";
  const status = coreUp ? "healthy" : "unhealthy";

  return {
    status,
    timestamp: new Date().toISOString(),
    uptimeSeconds: getUptimeSeconds(),
    nodeEnv: process.env.NODE_ENV || "development",
    version: process.env.npm_package_version || "1.0.0",
    services: {
      mongodb: mongo,
      redis,
      queues,
    },
  };
}

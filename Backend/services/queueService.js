import logger from "../utils/logger.js";
import { isRedisReady } from "../config/redis.js";
import {
  handleEmailJob,
  handleSearchIndexJob,
  handleCleanupJob,
} from "../workers/jobHandlers.js";

const QUEUE_NAME = "platform-jobs";

let bullmqModule = null;
let emailQueue = null;
let worker = null;
let queueEnabled = false;

async function loadBullMQ() {
  if (bullmqModule !== null) return bullmqModule;
  try {
    bullmqModule = await import("bullmq");
    return bullmqModule;
  } catch (err) {
    logger.warn("BullMQ not installed — background jobs run inline", {
      error: err.message,
    });
    bullmqModule = false;
    return false;
  }
}

function redisConnectionOptions() {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: Number(parsed.port) || 6379,
      password: parsed.password || undefined,
      username: parsed.username || undefined,
    };
  } catch {
    return { host: "127.0.0.1", port: 6379 };
  }
}

export function isQueueEnabled() {
  return queueEnabled;
}

async function runInline(name, data) {
  if (name === "email") return handleEmailJob(data);
  if (name === "search-index") return handleSearchIndexJob(data);
  if (name === "cleanup") return handleCleanupJob(data);
  logger.warn("unknown job type", { name });
}

export async function enqueueJob(name, data, options = {}) {
  if (emailQueue && queueEnabled) {
    await emailQueue.add(name, data, {
      removeOnComplete: 100,
      removeOnFail: 50,
      attempts: options.attempts ?? 3,
      backoff: { type: "exponential", delay: 2000 },
      ...options,
    });
    return { queued: true };
  }
  setImmediate(() => {
    runInline(name, data).catch((err) =>
      logger.error("inline job failed", { name, error: err.message })
    );
  });
  return { queued: false, inline: true };
}

export async function enqueueEmail(payload) {
  return enqueueJob("email", payload);
}

export async function enqueueSearchIndex(payload) {
  return enqueueJob("search-index", payload, { delay: 500 });
}

export async function enqueueCleanup(payload = {}) {
  return enqueueJob("cleanup", payload);
}

export async function startWorkers() {
  if (!process.env.REDIS_URL || !isRedisReady()) {
    logger.info("Job workers skipped (Redis unavailable)");
    return;
  }

  const bull = await loadBullMQ();
  if (!bull) return;

  const { Queue, Worker } = bull;
  const connection = redisConnectionOptions();

  emailQueue = new Queue(QUEUE_NAME, { connection });

  worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      if (job.name === "email") return handleEmailJob(job.data);
      if (job.name === "search-index") return handleSearchIndexJob(job.data);
      if (job.name === "cleanup") return handleCleanupJob(job.data);
      throw new Error(`Unknown job: ${job.name}`);
    },
    { connection, concurrency: 3 }
  );

  worker.on("failed", (job, err) => {
    logger.error("job failed", { id: job?.id, name: job?.name, error: err.message });
  });

  queueEnabled = true;
  logger.info("BullMQ workers started", { queue: QUEUE_NAME });

  const intervalHours = Number(process.env.CLEANUP_INTERVAL_HOURS) || 24;
  setInterval(() => {
    enqueueCleanup({ daysOld: 90 }).catch(() => {});
  }, intervalHours * 60 * 60 * 1000);
}

export async function stopWorkers() {
  if (worker) await worker.close();
  if (emailQueue) await emailQueue.close();
  worker = null;
  emailQueue = null;
  queueEnabled = false;
}

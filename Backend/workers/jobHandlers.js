import notificationService from "../services/notificationService.js";
import { cacheSet } from "../services/cacheService.js";
import { NotificationModel } from "../models/notificationModel.js";
import logger from "../utils/logger.js";

export async function handleEmailJob(data) {
  const { to, subject, html, text } = data;
  await notificationService.sendEmailDirect(to, subject, html, text);
}

export async function handleSearchIndexJob(data) {
  const { cacheKey, q, types, userId, limit } = data;
  const { globalSearch } = await import("../services/searchService.js");
  const payload = await globalSearch({ q, types, userId, limit });
  if (cacheKey) {
    await cacheSet(cacheKey, payload, 120);
  }
  return payload;
}

export async function handleCleanupJob(data) {
  const daysOld = data?.daysOld ?? 90;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysOld);
  const result = await NotificationModel.deleteMany({
    createdAt: { $lt: cutoff },
    read: true,
  });
  logger.info("notification cleanup completed", { deleted: result.deletedCount });
  return { deleted: result.deletedCount };
}

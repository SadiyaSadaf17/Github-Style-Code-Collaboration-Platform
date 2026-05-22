import { AuditLogModel } from "../models/auditLogModel.js";
import logger from "../utils/logger.js";

/**
 * Record a security-relevant action. Fire-and-forget; never blocks the request path.
 */
export async function recordAudit({
  actorId,
  action,
  resourceType,
  resourceId,
  status = "success",
  ip,
  userAgent,
  requestId,
  metadata = {},
}) {
  try {
    await AuditLogModel.create({
      actorId: actorId || undefined,
      action,
      resourceType,
      resourceId: resourceId != null ? String(resourceId) : undefined,
      status,
      ip,
      userAgent,
      requestId,
      metadata,
    });
  } catch (err) {
    logger.warn("audit log write failed", { action, error: err.message });
  }
}

export function auditFromRequest(req, fields) {
  return recordAudit({
    ...fields,
    ip: req.ip || req.headers["x-forwarded-for"],
    userAgent: req.get?.("user-agent"),
    requestId: req.requestId,
    actorId: fields.actorId ?? req.user?.userId,
  });
}

import exp from "express";
import { getPlatformHealth } from "../services/platformStatus.js";
import { verifyToken } from "../middlewares/verifyToken.js";
import { AuditLogModel } from "../models/auditLogModel.js";
import logger from "../utils/logger.js";

export const healthRoute = exp.Router();

healthRoute.get("/", async (req, res) => {
  const health = await getPlatformHealth();
  const code = health.status === "healthy" ? 200 : 503;
  res.status(code).json(health);
});

healthRoute.get("/live", (req, res) => {
  res.status(200).json({ status: "alive", timestamp: new Date().toISOString() });
});

healthRoute.get("/ready", async (req, res) => {
  const health = await getPlatformHealth();
  const ready = health.services.mongodb.status === "up";
  res.status(ready ? 200 : 503).json({
    status: ready ? "ready" : "not_ready",
    mongodb: health.services.mongodb,
  });
});

/** Recent audit entries — admin-only stub (role check when RBAC expanded) */
healthRoute.get("/audit", verifyToken("user"), async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const logs = await AuditLogModel.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("actorId", "username email");
    res.status(200).json({ message: "audit logs", payload: logs });
  } catch (err) {
    logger.error("audit fetch failed", { error: err.message });
    res.status(500).json({ message: err.message });
  }
});

export default healthRoute;

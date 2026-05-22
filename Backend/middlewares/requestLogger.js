import { randomUUID } from "crypto";
import logger from "../utils/logger.js";

export function requestIdMiddleware(req, res, next) {
  const incoming = req.headers["x-request-id"];
  req.requestId = incoming && String(incoming).slice(0, 64) || randomUUID();
  res.setHeader("X-Request-Id", req.requestId);
  next();
}

export function requestLoggerMiddleware(req, res, next) {
  const start = Date.now();

  res.on("finish", () => {
    const durationMs = Date.now() - start;
    const level = res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";
    logger.log(level, "HTTP request", {
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl || req.url,
      status: res.statusCode,
      durationMs,
      userId: req.user?.userId,
    });
  });

  next();
}

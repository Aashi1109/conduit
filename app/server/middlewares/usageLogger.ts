import type { RequestHandler } from "express";
import { UsageLog } from "@/features/usage/model";
import { logger } from "@/shared";

const usageLogger: RequestHandler = (req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const latencyMs = Date.now() - start;
    const apiKeyId = req.apiKey?.id;
    const service = req.proxyService || "unknown";

    if (!apiKeyId) return;

    UsageLog.create({
      apiKeyId,
      service,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      latencyMs,
      ip: req.ip,
    }).catch((err) => logger.error("Failed to write usage log", { err }));
  });

  next();
};

export default usageLogger;

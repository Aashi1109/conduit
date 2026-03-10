import type { RequestHandler } from "express";
import { ApiKey } from "@/features/auth/model";
import { User } from "@/features/user/model";
import { hashToken, UnauthorizedError } from "@/shared";
import config from "@/shared/config";

const authenticate: RequestHandler = async (req, res, next) => {
  // Skip authentication if the current relative path matches any skipPaths from config
  // (e.g., /docs, /healthz). For proxied services, req.path is the sub-path.
  const servicePath = /\/proxy\/([^\/]+)/.exec(req.originalUrl);

  if (servicePath) {
    const service = config.services[servicePath[1]];
    if (service.skipPaths.includes(req.path)) {
      return next();
    }
  }
  try {
    const headerKey = req.header("X-API-Key");
    const authHeader = req.header("Authorization");
    const queryKey =
      typeof req.query.api_key === "string" ? req.query.api_key : undefined;

    const bearerMatch =
      authHeader && authHeader.startsWith("Bearer ")
        ? authHeader.slice("Bearer ".length)
        : undefined;

    const rawKey = headerKey || bearerMatch || queryKey;

    if (!rawKey) throw new UnauthorizedError(`Missing api key`);

    const tokenHash = hashToken(rawKey);

    const apiKey = await ApiKey.findOne({
      where: { keyHash: tokenHash },
      include: [{ model: User }],
    });

    if (!apiKey) throw new UnauthorizedError(`Missing api key`);

    if (!apiKey.isActive) throw new UnauthorizedError(`Forbidden`);

    // Attach to request, including associated user if present
    const userInstance = (apiKey as any).user;
    req.apiKey = {
      ...(apiKey.toJSON() as any),
      user: userInstance
        ? {
            id: userInstance.id,
            name: userInstance.name,
            email: userInstance.email,
          }
        : undefined,
    };

    // Fire and forget lastUsedAt update
    void apiKey.update({ lastUsedAt: new Date() });

    next();
  } catch (err) {
    next(err);
  }
};

export default authenticate;

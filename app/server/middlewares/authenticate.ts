import type { RequestHandler } from "express";
import { ApiKey, RefreshToken } from "@/features/auth/model";
import { User } from "@/features/user/model";
import { hashToken } from "@/shared";

const authenticate: RequestHandler = async (req, res, next) => {
  try {
    const headerKey = req.header("X-API-Key");
    const authHeader = req.header("Authorization");
    const queryKey = typeof req.query.api_key === "string" ? req.query.api_key : undefined;

    const bearerMatch =
      authHeader && authHeader.startsWith("Bearer ")
        ? authHeader.slice("Bearer ".length)
        : undefined;

    const rawKey = headerKey || bearerMatch || queryKey;

    if (!rawKey) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const keyPrefix = rawKey.slice(0, 8);
    const tokenHash = hashToken(rawKey);

    const apiKey = await ApiKey.findOne({
      where: { keyHash: tokenHash },
      include: [{ model: User }],
    });

    if (!apiKey) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!apiKey.isActive) {
      return res.status(403).json({ error: "Forbidden" });
    }

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


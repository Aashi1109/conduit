import type { RequestHandler } from "express";
import { getDBConnection, DB_CONNECTION_NAMES } from "@/shared";
import { RateLimitCounter } from "@/features/rate-limit/model";

const sequelize = getDBConnection(DB_CONNECTION_NAMES.Default);

const rateLimiter: RequestHandler = async (req, res, next) => {
  try {
    if (!req.apiKey) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id, rateLimit, rateWindow } = req.apiKey;

    const windowSeconds = rateWindow || 60;
    const nowSeconds = Math.floor(Date.now() / 1000);
    const windowStart = Math.floor(nowSeconds / windowSeconds) * windowSeconds;
    const windowEnd = new Date((windowStart + windowSeconds) * 1000);

    const bucketKey = `${id}:${windowStart}`;

    const [result] = await sequelize.query<[{ count: number }]>(
      `
      INSERT INTO rate_limit_counters (bucket_key, count, window_end, updated_at)
      VALUES (:bucketKey, 1, :windowEnd, NOW())
      ON CONFLICT (bucket_key)
      DO UPDATE SET
        count = rate_limit_counters.count + 1,
        updated_at = NOW()
      RETURNING count
    `,
      {
        replacements: {
          bucketKey,
          windowEnd,
        },
        type: "RAW" as any,
      },
    );

    const currentCount = Array.isArray(result)
      ? (result[0] as any).count
      : (result as any).count;
    const limit = rateLimit || 100;
    const remaining = Math.max(limit - currentCount, 0);

    res.setHeader("X-RateLimit-Limit", String(limit));
    res.setHeader("X-RateLimit-Remaining", String(remaining));
    res.setHeader("X-RateLimit-Reset", String(windowStart + windowSeconds));

    if (currentCount > limit) {
      return res.status(429).json({
        error: "Rate limit exceeded",
        limit,
        reset_at: windowStart + windowSeconds,
      });
    }

    // Lazy cleanup, fire and forget
    if (Math.random() < 0.01) {
      void sequelize.query(
        "DELETE FROM rate_limit_counters WHERE window_end < NOW()",
      );
    }

    next();
  } catch (err) {
    next(err);
  }
};

export default rateLimiter;

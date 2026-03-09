import { ApiKey, type ApiKeyAttributes } from "@/features/auth/model";
import { UsageLog } from "@/features/usage/model";
import { omit, NotFoundError } from "@/shared";

export async function listKeys(): Promise<Array<Omit<ApiKeyAttributes, "keyHash">>> {
  const keys = await ApiKey.findAll();
  return keys.map((key) =>
    omit(key.toJSON() as ApiKeyAttributes, ["keyHash"]),
  );
}

export async function updateKey(params: {
  id: string;
  isActive?: boolean;
  rateLimit?: number;
  rateWindow?: number;
  name?: string;
}) {
  const key = await ApiKey.findByPk(params.id);
  if (!key) {
    throw new NotFoundError("Key not found");
  }

  if (typeof params.isActive === "boolean") key.isActive = params.isActive;
  if (typeof params.rateLimit === "number") key.rateLimit = params.rateLimit;
  if (typeof params.rateWindow === "number") key.rateWindow = params.rateWindow;
  if (typeof params.name === "string") key.name = params.name;

  await key.save();

  return omit(key.toJSON() as ApiKeyAttributes, ["keyHash"]);
}

export async function deleteKey(id: string): Promise<void> {
  const deleted = await ApiKey.destroy({ where: { id } });
  if (!deleted) {
    throw new NotFoundError("Key not found");
  }
}

export async function listUsage(params: {
  keyId?: string;
  service?: string;
  from?: string;
  to?: string;
  limit?: number;
}): Promise<UsageLog[]> {
  const where: Record<string, unknown> = {};
  if (params.keyId) where.apiKeyId = params.keyId;
  if (params.service) where.service = params.service;
  if (params.from || params.to) {
    const createdAt: Record<string, Date> = {};
    if (params.from) createdAt.$gte = new Date(params.from);
    if (params.to) createdAt.$lte = new Date(params.to);
    where.createdAt = createdAt;
  }

  const cappedLimit = Math.min(params.limit ?? 100, 1000);

  return UsageLog.findAll({
    where,
    order: [["createdAt", "DESC"]],
    limit: cappedLimit,
  });
}

export async function usageSummary() {
  const sequelize = UsageLog.sequelize!;

  const [rows] = await sequelize.query(`
      SELECT
        api_key_id AS "apiKeyId",
        service,
        COUNT(*) AS total_requests,
        AVG(latency_ms) AS avg_latency,
        SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) AS error_count
      FROM usage_logs
      GROUP BY api_key_id, service
    `);

  return rows;
}


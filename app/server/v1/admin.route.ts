import { Router, type Router as ExpressRouter } from "express";
import { asyncHandler } from "../middlewares";
import {
  listKeys,
  updateKey,
  deleteKey,
  listUsage,
  usageSummary,
} from "@/features/admin/service";

const router: ExpressRouter = Router();

/**
 * @openapi
 * /api/v1/admin/keys:
 *   get:
 *     summary: List all API keys
 *     tags:
 *       - Admin
 *     responses:
 *       200:
 *         description: List of API keys (without key hashes).
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   keyPrefix:
 *                     type: string
 *                   name:
 *                     type: string
 *                   owner:
 *                     type: string
 *                   userId:
 *                     type: string
 *                   isActive:
 *                     type: boolean
 *                   rateLimit:
 *                     type: integer
 *                   rateWindow:
 *                     type: integer
 *                   lastUsedAt:
 *                     type: string
 *                     format: date-time
 */
router.get(
  "/keys",
  asyncHandler(async (req, res) => {
    const keys = await listKeys();
    res.json(keys);
  })
);

/**
 * @openapi
 * /api/v1/admin/keys/{id}:
 *   patch:
 *     summary: Update an API key
 *     tags:
 *       - Admin
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the API key to update.
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isActive:
 *                 type: boolean
 *               rateLimit:
 *                 type: integer
 *               rateWindow:
 *                 type: integer
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Updated API key.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       404:
 *         description: Key not found.
 */
router.patch(
  "/keys/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params as { id: string };
    const { isActive, rateLimit, rateWindow, name } = req.body as {
      isActive?: boolean;
      rateLimit?: number;
      rateWindow?: number;
      name?: string;
    };

    const updated = await updateKey({ id, isActive, rateLimit, rateWindow, name });
    res.json(updated);
  })
);

/**
 * @openapi
 * /api/v1/admin/keys/{id}:
 *   delete:
 *     summary: Delete an API key
 *     tags:
 *       - Admin
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Key deleted successfully.
 *       404:
 *         description: Key not found.
 */
router.delete(
  "/keys/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params as { id: string };
    await deleteKey(id);
    res.status(204).send();
  })
);

/**
 * @openapi
 * /api/v1/admin/usage:
 *   get:
 *     summary: List usage logs
 *     description: Query usage logs with optional filters and limit.
 *     tags:
 *       - Admin
 *     parameters:
 *       - in: query
 *         name: keyId
 *         schema:
 *           type: string
 *         required: false
 *         description: Filter by API key ID.
 *       - in: query
 *         name: service
 *         schema:
 *           type: string
 *         required: false
 *         description: Filter by proxied service name.
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *         required: false
 *         description: Start of createdAt range.
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *         required: false
 *         description: End of createdAt range.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         required: false
 *         description: Max number of records (capped at 1000).
 *     responses:
 *       200:
 *         description: List of usage logs.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   apiKeyId:
 *                     type: string
 *                   service:
 *                     type: string
 *                   method:
 *                     type: string
 *                   path:
 *                     type: string
 *                   statusCode:
 *                     type: integer
 *                     nullable: true
 *                   latencyMs:
 *                     type: integer
 *                     nullable: true
 *                   ip:
 *                     type: string
 *                     nullable: true
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 */
router.get(
  "/usage",
  asyncHandler(async (req, res) => {
    const { keyId, service, from, to, limit } = req.query as {
      keyId?: string;
      service?: string;
      from?: string;
      to?: string;
      limit?: string;
    };

    const logs = await listUsage({
      keyId,
      service,
      from,
      to,
      limit: limit ? Number(limit) : undefined,
    });
    res.json(logs);
  })
);

/**
 * @openapi
 * /api/v1/admin/usage/summary:
 *   get:
 *     summary: Get aggregated usage summary
 *     description: Returns aggregated metrics per API key and service.
 *     tags:
 *       - Admin
 *     responses:
 *       200:
 *         description: Aggregated usage rows.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   apiKeyId:
 *                     type: string
 *                   service:
 *                     type: string
 *                   total_requests:
 *                     type: integer
 *                   avg_latency:
 *                     type: number
 *                   error_count:
 *                     type: integer
 */
router.get(
  "/usage/summary",
  asyncHandler(async (req, res) => {
    const rows = await usageSummary();
    res.json(rows);
  })
);

export default router;


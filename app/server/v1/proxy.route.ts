import type { Request, Response } from "express";
import { Router } from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { authenticate, rateLimiter, usageLogger } from "../middlewares";
import { config, logger } from "@/shared";

const router: Router = Router();

interface ServiceConfig {
  name: string;
  path: string;
  target: string;
}

/**
 * @openapi
 * /api/v1/{serviceName}:
 *   get:
 *     summary: Proxy GET requests to a configured upstream service
 *     description: >
 *       Dynamic proxy endpoint that forwards GET requests to services configured in `config.services`.
 *       Additional path segments after `{serviceName}` and query parameters are forwarded transparently.
 *     tags:
 *       - Proxy
 *     parameters:
 *       - in: path
 *         name: serviceName
 *         required: true
 *         schema:
 *           type: string
 *         description: Name of the proxied service (from configuration).
 *     responses:
 *       200:
 *         description: Successful proxied response from the upstream service.
 *       4XX:
 *         description: Client error returned by the upstream or validation middleware.
 *       5XX:
 *         description: Server or upstream error.
 *   post:
 *     summary: Proxy POST requests to a configured upstream service
 *     description: >
 *       Dynamic proxy endpoint that forwards POST requests to services configured in `config.services`.
 *       Additional path segments after `{serviceName}` and query parameters are forwarded transparently.
 *     tags:
 *       - Proxy
 *     parameters:
 *       - in: path
 *         name: serviceName
 *         required: true
 *         schema:
 *           type: string
 *         description: Name of the proxied service (from configuration).
 *     responses:
 *       200:
 *         description: Successful proxied response from the upstream service.
 *       4XX:
 *         description: Client error returned by the upstream or validation middleware.
 *       5XX:
 *         description: Server or upstream error.
 */
function discoverServices(): ServiceConfig[] {
  const services = config.services.map((svc) => ({
    name: svc.name,
    path: `/${svc.name}`,
    target: svc.url,
  }));

  if (services.length === 0) {
    logger.warn("No proxy services discovered from configuration");
  } else {
    services.forEach((svc) => {
      logger.info(`Proxy service discovered: ${svc.name} -> ${svc.target}`);
    });
  }

  return services;
}

const services = discoverServices();

type ProxiedRequest = Request & {
  apiKey?: {
    id: string;
    owner: string;
  };
  proxyService?: string;
};

for (const service of services) {
  const proxy = createProxyMiddleware<ProxiedRequest, Response>({
    target: service.target,
    changeOrigin: true,
    pathRewrite: {
      [`^${service.path}`]: "",
    },
    on: {
      proxyReq: (proxyReq, req: ProxiedRequest, _res: Response) => {
        proxyReq.setHeader("X-Internal-Token", config.security.internalSecret);

        if (req.apiKey) {
          proxyReq.setHeader("X-Proxy-Key-Id", req.apiKey.id);
          proxyReq.setHeader("X-Proxy-Owner", req.apiKey.owner);
        }

        req.proxyService = service.name;
      },
      proxyRes: (proxyRes, req: ProxiedRequest, _res) => {
        if (proxyRes.statusCode && proxyRes.statusCode >= 400) {
          logger.warn("Proxy upstream returned error status", {
            service: service.name,
            statusCode: proxyRes.statusCode,
            method: req.method,
            path: req.originalUrl,
          });
        }
      },
      error: (err: any, _req, res, _target) => {
        logger.error("Proxy upstream connection error", {
          service: service.name,
          code: err.code,
          message: err.message,
        });
        (res as Response).status(502).json({
          error: {
            message: "Bad Gateway",
            status: 502,
            type: "BadGatewayError",
          },
          service: service.name,
        });
      },
    },
  });

  router.use(service.path, authenticate, rateLimiter, usageLogger, proxy);
}

export default router;

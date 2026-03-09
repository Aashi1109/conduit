import cors from "cors";
import express from "express";
import cookieparser from "cookie-parser";
import swaggerUI from "swagger-ui-express";

import helmet from "helmet";
import { config, logger } from "@/shared";
import {
  errorHandler,
  morganLogger,
  // INJECT:REQUEST_CONTEXT_IMPORT
} from "./middlewares";
import appRoutes from "./v1";
import { NotFoundError } from "@/shared";
import { swaggerSpec } from "./docs/swagger";

const app = express();

// cors setup to allow requests from the frontend only for now
app.use(helmet());
app.use(cors(config.corsOptions));

// Skip body parsing for proxy routes — their raw stream must stay intact
// so http-proxy-middleware can pipe it to the upstream directly.
const isProxyRoute = (req: express.Request) =>
  req.path.startsWith("/api/v1/proxy");

// parse requests of content-type - application/json
app.use((req, res, next) => {
  if (isProxyRoute(req)) return next();
  express.json({ limit: config.express.fileSizeLimit })(req, res, next);
});

app.use((req, res, next) => {
  if (isProxyRoute(req)) return next();
  express.urlencoded({ extended: true, limit: config.express.fileSizeLimit })(
    req,
    res,
    next,
  );
});

app.use(morganLogger);
app.use(cookieparser());

// routes setup
// INJECT:REQUEST_CONTEXT_MIDDLEWARE
// swagger docs
app.use("/docs", swaggerUI.serve, swaggerUI.setup(swaggerSpec));

/**
 * @openapi
 * /:
 *   get:
 *     summary: API health and metadata
 *     tags:
 *       - Meta
 *     responses:
 *       200:
 *         description: Basic information about the API.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 name:
 *                   type: string
 *                 description:
 *                   type: string
 *                 version:
 *                   type: string
 *                 uptimeSeconds:
 *                   type: number
 *                   format: float
 */
app.get("/", (req, res) => {
  res.send({
    name: "Conduit API",
    description:
      "Conduit is an API gateway and key management service for proxying internal services.",
    version: "1.0.0",
    uptimeSeconds: process.uptime(),
  });
});

/**
 * @openapi
 * /healthz:
 *   get:
 *     summary: Liveness probe
 *     tags:
 *       - Meta
 *     responses:
 *       200:
 *         description: Server is healthy.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 uptimeSeconds:
 *                   type: number
 *                   format: float
 */
app.get("/healthz", (req, res) => {
  res.status(200).json({
    status: "ok",
    uptimeSeconds: process.uptime(),
  });
});

app.use("/api/v1", appRoutes);

app.use((req, res, next) => {
  next(new NotFoundError(`path not found: ${req.originalUrl}`));
});

app.use(errorHandler);

// Start server
app.listen(config.port, () => {
  logger.info(`Server is running on port ${config.port}`, {
    port: config.port,
    environment: config.nodeEnv,
  });
});

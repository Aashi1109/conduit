import swaggerJSDoc from "swagger-jsdoc";
import config from "@/shared/config";

const servers: swaggerJSDoc.Server[] = [
  {
    url: "http://localhost:3000",
    description: "Development server",
  },
];

// If a deployed URL is configured (Cloud Run or similar), add it as well
if (config.baseUrl && !config.baseUrl.startsWith("http://localhost")) {
  servers.push({
    url: config.baseUrl,
    description: "Deployed server",
  });
}

const swaggerOptions: swaggerJSDoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Conduit API",
      version: "1.0.0",
      description:
        "Conduit is an API gateway and key management service that proxies traffic to internal services, tracks usage, and manages API keys.",
    },
    servers,
  },
  // Paths are resolved from the project root where the process runs.
  // Include both .ts (dev) and .js (build) — compiled output preserves JSDoc.
  apis: ["./app/server/**/*.ts", "./app/server/**/*.js"],
};

export const swaggerSpec = swaggerJSDoc(swaggerOptions);

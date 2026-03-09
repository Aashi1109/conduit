import swaggerJSDoc from "swagger-jsdoc";

const swaggerOptions: swaggerJSDoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Conduit API",
      version: "1.0.0",
      description:
        "Conduit is an API gateway and key management service that proxies traffic to internal services, tracks usage, and manages API keys.",
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Development server",
      },
    ],
  },
  // Paths are resolved from the project root where the process runs.
  apis: ["./app/server/**/*.ts"],
};

export const swaggerSpec = swaggerJSDoc(swaggerOptions);

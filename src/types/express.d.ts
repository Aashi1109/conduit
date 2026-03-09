import type { ApiKeyAttributes } from "@/features/auth/model";

declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
    interface Request {
      apiKey?: ApiKeyAttributes & {
        user?: { id: string; name: string; email: string };
      };
      proxyService?: string;
    }
  }
}

export {};

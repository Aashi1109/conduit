import { validateSchema } from "@/shared/helpers/validation";

export interface RegisterBody {
  name: string;
  email: string;
}

export interface RotateBody {
  refresh_token: string;
}

export interface RecoverBody {
  email?: string;
}

const registerSchema = {
  type: "object",
  properties: {
    name: { type: "string", minLength: 1 },
    email: { type: "string", format: "email" },
  },
  required: ["name", "email"],
  additionalProperties: false,
} as const;

const rotateSchema = {
  type: "object",
  properties: {
    refresh_token: { type: "string", minLength: 1 },
  },
  required: ["refresh_token"],
  additionalProperties: false,
} as const;

const recoverSchema = {
  type: "object",
  properties: {
    email: { type: "string", format: "email" },
  },
  additionalProperties: false,
} as const;

export function validateRegisterPayload(body: unknown): RegisterBody {
  return validateSchema("auth.register", registerSchema)(
    body as RegisterBody,
    (data) => data,
  );
}

export function validateRotatePayload(body: unknown): RotateBody {
  return validateSchema("auth.rotate", rotateSchema)(
    body as RotateBody,
    (data) => data,
  );
}

export function validateRecoverPayload(body: unknown): RecoverBody {
  return validateSchema("auth.recover", recoverSchema)(
    body as RecoverBody,
    (data) => data,
  );
}

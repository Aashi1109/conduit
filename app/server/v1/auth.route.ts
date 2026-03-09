import { Router, type Router as ExpressRouter } from "express";
import { asyncHandler } from "../middlewares";
import { registerUser, rotateKey, recoverKey } from "@/features/auth/service";
import {
  validateRegisterPayload,
  validateRotatePayload,
  validateRecoverPayload,
  type RegisterBody,
  type RotateBody,
  type RecoverBody,
} from "@/features/auth/validations";
import { UnauthorizedError } from "@/shared";

const router: ExpressRouter = Router();

/**
 * @openapi
 * /api/v1/auth/register:
 *   post:
 *     summary: Register a new API user
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       201:
 *         description: User registered successfully; credentials will be emailed.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user_id:
 *                   type: string
 *       400:
 *         description: Missing name or email.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.post(
  "/register",
  asyncHandler(async (req, res) => {
    const { name, email } = validateRegisterPayload(req.body);

    const result = await registerUser({ name, email });

    return res.status(201).json({
      message: "Registered successfully. Credentials will be delivered to your email.",
      user_id: result.userId,
    });
  })
);

/**
 * @openapi
 * /api/v1/auth/rotate:
 *   post:
 *     summary: Rotate an existing API key using a refresh token
 *     description: >
 *       Requires a valid API key in the request context and a non-expired refresh token.
 *     tags:
 *       - Auth
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refresh_token
 *             properties:
 *               refresh_token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Key rotated; new credentials emailed to the owner.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized or invalid/expired refresh token.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.post(
  "/rotate",
  asyncHandler(async (req, res) => {
    if (!req.apiKey) {
      throw new UnauthorizedError("Missing or invalid API key");
    }

    const { refresh_token } = validateRotatePayload(req.body);

    await rotateKey({
      apiKeyUserId: req.apiKey.userId,
      apiKeyOwner: req.apiKey.owner,
      refreshToken: refresh_token,
    });

    return res.status(200).json({
      message: "Key rotated. New credentials have been sent to your registered email.",
    });
  })
);

/**
 * @openapi
 * /api/v1/auth/recover:
 *   post:
 *     summary: Recover API credentials for a user
 *     description: >
 *       If the email is registered and has a valid token, new credentials will be sent.
 *       For security, this endpoint always returns a generic success message.
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Generic recovery response.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
router.post(
  "/recover",
  asyncHandler(async (req, res) => {
    const { email } = validateRecoverPayload(req.body);

    const genericResponse = {
      message:
        "If that email is registered with a valid token, new credentials have been sent.",
    };

    if (!email) {
      return res.status(200).json(genericResponse);
    }

    await recoverKey({ email });

    return res.status(200).json(genericResponse);
  })
);

export default router;


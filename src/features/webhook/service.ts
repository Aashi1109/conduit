import crypto from "crypto";
import { config } from "@/shared";

export interface WebhookPayload {
  event: "key.created" | "key.rotated" | "key.recovered";
  user: { id: string; name: string; email: string };
  api_key: string;
  refresh_token: string;
  issued_at: string;
  expires_at: string;
}

export async function fireWebhook(payload: WebhookPayload): Promise<void> {
  const { url, secret } = config.webhook;

  if (!url || !secret) {
    return;
  }

  try {
    const body = JSON.stringify(payload);
    const signature = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");

    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Signature": `sha256=${signature}`,
      },
      body,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Webhook dispatch failed", err);
  }
}

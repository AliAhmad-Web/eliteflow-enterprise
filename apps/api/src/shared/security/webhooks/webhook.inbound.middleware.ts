/**
 * Inbound webhook verification middleware.
 * Wire onto any POST receive route that accepts signed webhooks.
 * There is currently no public integrations inbound receive route;
 * keep this as the single verification entry to avoid a second implementation.
 */

import type { NextFunction, Request, Response } from "express";

import { WEBHOOK_HEADERS } from "./webhook.constants.js";
import { webhookSecurityService } from "./webhook.service.js";
import { isWebhookSecurityEnabled } from "./webhook.config.js";

function headerString(
  req: Request,
  name: string,
): string | undefined {
  const raw = req.headers[name.toLowerCase()];
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw) && typeof raw[0] === "string") return raw[0];
  return undefined;
}

/**
 * Fail-closed when webhook security is enabled.
 * When security is disabled (non-production default), passes through.
 */
export async function verifyInboundWebhookMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!isWebhookSecurityEnabled()) {
      next();
      return;
    }

    const body =
      typeof req.body === "string"
        ? req.body
        : Buffer.isBuffer(req.body)
          ? req.body.toString("utf8")
          : JSON.stringify(req.body ?? {});

    const result = await webhookSecurityService.verifyInbound({
      body,
      signature: headerString(req, WEBHOOK_HEADERS.SIGNATURE) ?? "",
      timestamp: headerString(req, WEBHOOK_HEADERS.TIMESTAMP) ?? "",
      nonce: headerString(req, WEBHOOK_HEADERS.NONCE) ?? "",
      eventId: headerString(req, WEBHOOK_HEADERS.EVENT_ID) ?? "",
      keyId: headerString(req, WEBHOOK_HEADERS.KEY_ID),
    });

    if (!result.valid) {
      res.status(401).json({
        success: false,
        error: {
          code: "WEBHOOK_VERIFICATION_FAILED",
          message: "Inbound webhook verification failed",
          reason: result.reason ?? "invalid",
        },
      });
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
}

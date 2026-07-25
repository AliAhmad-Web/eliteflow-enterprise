import type { Request } from "express";

import type { RequestContext } from "./auth.types.js";

export function extractRequestContext(req: Request): RequestContext {
  const forwarded = req.headers["x-forwarded-for"];
  const ipAddress =
    (typeof forwarded === "string" ? forwarded.split(",")[0]?.trim() : undefined) ??
    req.ip ??
    req.socket.remoteAddress ??
    "unknown";

  const userAgent = req.headers["user-agent"] ?? "unknown";

  return { ipAddress, userAgent };
}

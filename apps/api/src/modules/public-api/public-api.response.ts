import type { Request, Response } from "express";
import { randomBytes } from "node:crypto";

import type { PublicApiErrorCode } from "@enterprise/shared";

export interface PublicApiSuccessBody<T> {
  data: T;
  meta: {
    requestId: string;
    page?: number;
    pageSize?: number;
    total?: number;
    totalPages?: number;
    timestamp: string;
  };
}

export interface PublicApiErrorBody {
  error: {
    code: PublicApiErrorCode | string;
    message: string;
  };
}

export function getPublicRequestId(req: Request): string {
  const header = req.headers["x-request-id"];
  if (typeof header === "string" && header.trim()) {
    return header.trim().slice(0, 128);
  }
  return `req_${Date.now().toString(36)}_${randomBytes(4).toString("hex")}`;
}

export function publicSuccess<T>(
  res: Response,
  data: T,
  meta: Partial<PublicApiSuccessBody<T>["meta"]> = {},
  status = 200,
): void {
  const requestId =
    (res.locals.requestId as string | undefined) ??
    `req_${Date.now().toString(36)}_${randomBytes(4).toString("hex")}`;
  res.setHeader("X-Request-Id", requestId);
  const body: PublicApiSuccessBody<T> = {
    data,
    meta: {
      requestId,
      timestamp: new Date().toISOString(),
      ...meta,
    },
  };
  res.status(status).json(body);
}

export function publicError(
  res: Response,
  status: number,
  code: string,
  message: string,
): void {
  const requestId =
    (res.locals.requestId as string | undefined) ??
    `req_${Date.now().toString(36)}_${randomBytes(4).toString("hex")}`;
  res.setHeader("X-Request-Id", requestId);
  const body: PublicApiErrorBody = {
    error: { code, message },
  };
  res.status(status).json(body);
}

import type { AuthenticatedContext } from "@enterprise/shared";

declare global {
  namespace Express {
    interface Request {
      auth?: AuthenticatedContext;
    }
  }
}

export {};

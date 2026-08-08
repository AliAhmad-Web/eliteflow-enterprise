import type { Request, Response } from "express";

import type { GlobalSearchQueryInput } from "@enterprise/shared";
import { prisma } from "@enterprise/database";

import { successResponse } from "../../shared/utils/api-response.js";
import { AppError } from "../../shared/errors/app-error.js";
import { searchService, type SearchActor } from "./search.service.js";

async function getActor(req: Request): Promise<SearchActor> {
  if (!req.auth) {
    throw new AppError("Authentication required", 401, "SEARCH_UNAUTHORIZED");
  }

  let companyId: string | null = null;
  if (req.auth.role === "CLIENT") {
    const user = await prisma.user.findUnique({
      where: { id: req.auth.userId },
      select: { companyId: true },
    });
    companyId = user?.companyId ?? null;
  }

  return {
    userId: req.auth.userId,
    role: req.auth.role,
    email: req.auth.email,
    permissions: req.auth.permissions,
    companyId,
  };
}

export class SearchController {
  async search(req: Request, res: Response) {
    const result = await searchService.search(
      req.query as unknown as GlobalSearchQueryInput,
      await getActor(req),
    );
    res.json(successResponse(result, "Search results"));
  }
}

export const searchController = new SearchController();

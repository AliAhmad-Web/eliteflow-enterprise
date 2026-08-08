import { Router } from "express";

import { RATE_LIMIT, globalSearchQuerySchema } from "@enterprise/shared";

import { authenticate } from "../../shared/authorization.js";
import {
  rateLimit,
  rateLimitByUser,
} from "../../middleware/rate-limit.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { asyncHandler } from "../../shared/utils/async-handler.js";
import { searchController } from "./search.controller.js";

const searchRouter = Router();
searchRouter.use(authenticate);

const readLimit = rateLimit({
  name: "search.global",
  ...RATE_LIMIT.GLOBAL_API,
  max: 60,
  keyGenerator: rateLimitByUser,
});

searchRouter.get(
  "/",
  readLimit,
  validate(globalSearchQuerySchema, "query"),
  asyncHandler((req, res) => searchController.search(req, res)),
);

export { searchRouter };

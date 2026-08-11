import type { Request, Response } from "express";

import { prisma } from "@enterprise/database";
import type {
  AddCustomerRequestAttachmentInput,
  ApproveCustomerRequestInput,
  ClarifyCustomerRequestInput,
  ConvertCustomerRequestInput,
  CreateCustomerRequestInput,
  CustomerRequestIdParamsInput,
  ListCustomerRequestsQueryInput,
  RejectCustomerRequestInput,
  StartCustomerRequestReviewInput,
  UpdateCustomerRequestInput,
} from "@enterprise/shared";

import { successResponse } from "../../shared/utils/api-response.js";
import { extractRequestContext } from "../auth/auth.utils.js";
import {
  CUSTOMER_REQUESTS_ERROR_CODES,
  CustomerRequestsError,
} from "./customer-requests.errors.js";
import {
  customerRequestsService,
  type CustomerRequestActor,
} from "./customer-requests.service.js";

async function getActor(req: Request): Promise<CustomerRequestActor> {
  if (!req.auth) {
    throw new CustomerRequestsError(
      "Authentication required",
      401,
      CUSTOMER_REQUESTS_ERROR_CODES.FORBIDDEN,
    );
  }

  const context = extractRequestContext(req);
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
    companyId,
    permissions: req.auth.permissions,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  };
}

export class CustomerRequestsController {
  async list(req: Request, res: Response): Promise<void> {
    const query = req.query as unknown as ListCustomerRequestsQueryInput;
    const result = await customerRequestsService.list(query, await getActor(req));
    res.json(
      successResponse(result, "Customer requests retrieved successfully"),
    );
  }

  async getById(req: Request, res: Response): Promise<void> {
    const params = req.params as unknown as CustomerRequestIdParamsInput;
    const result = await customerRequestsService.getById(
      params.id,
      await getActor(req),
    );
    res.json(
      successResponse(result, "Customer request retrieved successfully"),
    );
  }

  async create(req: Request, res: Response): Promise<void> {
    const body = req.body as CreateCustomerRequestInput;
    const result = await customerRequestsService.create(
      body,
      await getActor(req),
    );
    res
      .status(201)
      .json(successResponse(result, "Customer request created successfully"));
  }

  async update(req: Request, res: Response): Promise<void> {
    const params = req.params as unknown as CustomerRequestIdParamsInput;
    const body = req.body as UpdateCustomerRequestInput;
    const result = await customerRequestsService.update(
      params.id,
      body,
      await getActor(req),
    );
    res.json(
      successResponse(result, "Customer request updated successfully"),
    );
  }

  async submit(req: Request, res: Response): Promise<void> {
    const params = req.params as unknown as CustomerRequestIdParamsInput;
    const result = await customerRequestsService.submit(
      params.id,
      await getActor(req),
    );
    res.json(
      successResponse(result, "Customer request submitted successfully"),
    );
  }

  async withdraw(req: Request, res: Response): Promise<void> {
    const params = req.params as unknown as CustomerRequestIdParamsInput;
    const result = await customerRequestsService.withdraw(
      params.id,
      await getActor(req),
    );
    res.json(
      successResponse(result, "Customer request withdrawn successfully"),
    );
  }

  async addAttachment(req: Request, res: Response): Promise<void> {
    const params = req.params as unknown as CustomerRequestIdParamsInput;
    const body = req.body as AddCustomerRequestAttachmentInput;
    const result = await customerRequestsService.addAttachment(
      params.id,
      body,
      await getActor(req),
    );
    res
      .status(201)
      .json(successResponse(result, "Attachment added successfully"));
  }

  async startReview(req: Request, res: Response): Promise<void> {
    const params = req.params as unknown as CustomerRequestIdParamsInput;
    const body = req.body as StartCustomerRequestReviewInput;
    const result = await customerRequestsService.startReview(
      params.id,
      body,
      await getActor(req),
    );
    res.json(successResponse(result, "Review started successfully"));
  }

  async requestClarification(req: Request, res: Response): Promise<void> {
    const params = req.params as unknown as CustomerRequestIdParamsInput;
    const body = req.body as ClarifyCustomerRequestInput;
    const result = await customerRequestsService.requestClarification(
      params.id,
      body,
      await getActor(req),
    );
    res.json(successResponse(result, "Clarification requested successfully"));
  }

  async approve(req: Request, res: Response): Promise<void> {
    const params = req.params as unknown as CustomerRequestIdParamsInput;
    const body = req.body as ApproveCustomerRequestInput;
    const result = await customerRequestsService.approve(
      params.id,
      body,
      await getActor(req),
    );
    res.json(successResponse(result, "Customer request approved successfully"));
  }

  async reject(req: Request, res: Response): Promise<void> {
    const params = req.params as unknown as CustomerRequestIdParamsInput;
    const body = req.body as RejectCustomerRequestInput;
    const result = await customerRequestsService.reject(
      params.id,
      body,
      await getActor(req),
    );
    res.json(successResponse(result, "Customer request rejected successfully"));
  }

  async convert(req: Request, res: Response): Promise<void> {
    const params = req.params as unknown as CustomerRequestIdParamsInput;
    const body = req.body as ConvertCustomerRequestInput;
    const result = await customerRequestsService.convert(
      params.id,
      body,
      await getActor(req),
    );
    res.json(
      successResponse(result, "Customer request converted successfully"),
    );
  }
}

export const customerRequestsController = new CustomerRequestsController();

/**
 * Production P0 verification:
 * - Live API health + new portal-user routes present
 * - Signup onboarding path (ensurePortalCompanyLink) on prod DB
 * - Project/invoice isolation via live API service layer against prod DB
 * - Vercel portal page no longer ships dummy client KPI copy
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import * as argon2 from "argon2";
import { UserStatus, prisma } from "@enterprise/database";

import { authRepository } from "../src/modules/auth/auth.repository.js";
import { toSafeUser } from "../src/modules/auth/auth.types.js";
import { ensurePortalCompanyLink } from "../src/modules/clients/client-company-onboarding.service.js";
import { clientsService } from "../src/modules/clients/clients.service.js";
import { projectsService } from "../src/modules/projects/projects.service.js";
import { invoicesService } from "../src/modules/invoices/invoices.service.js";
import { CLIENTS_ERROR_CODES } from "../src/modules/clients/clients.errors.js";

const API =
  process.env.PROD_API_URL?.replace(/\/$/, "") ??
  "https://api-production-a778.up.railway.app";
const WEB =
  process.env.PROD_WEB_URL?.replace(/\/$/, "") ??
  "https://eliteflow-web.vercel.app";
const RUN = randomUUID().slice(0, 8);
const email = `p0.portal.${RUN}@eliteflow.test`;

async function httpJson(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const text = await res.text();
  let body: Record<string, unknown> = {};
  try {
    body = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    body = { raw: text.slice(0, 200) };
  }
  return { status: res.status, body, text };
}

async function main() {
  assert.ok(process.env.DATABASE_URL, "DATABASE_URL required");

  const health = await httpJson(`${API}/api/v1/health`);
  assert.equal(health.status, 200);
  assert.equal((health.body as { status?: string }).status, "ok");

  const unlinked = await httpJson(`${API}/api/v1/clients/portal-users/unlinked`);
  assert.equal(unlinked.status, 401, "portal-users/unlinked must be live + auth gated");

  const signupCaptcha = await httpJson(`${API}/api/v1/auth/signup`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      firstName: "X",
      lastName: "Y",
      email: `p0.blocked.${RUN}@eliteflow.test`,
      password: `P0Portal!${RUN}Aa1`,
    }),
  });
  assert.equal(signupCaptcha.status, 400);
  assert.equal(signupCaptcha.body.code, "AUTH_CAPTCHA_FAILED");

  const portalHtml = await fetch(`${WEB}/portal`).then((r) => r.text());
  assert.ok(portalHtml.includes("Client Portal") || portalHtml.length > 100);
  assert.equal(
    portalHtml.includes("CLIENT_KPI_STATS"),
    false,
    "portal must not ship dummy CLIENT_KPI_STATS identifier",
  );
  // Dummy copy historically used in role-dashboards.dummy for client portal
  assert.equal(
    /Acme Redesign|Invoice #1042|Sample project update/i.test(portalHtml),
    false,
    "portal HTML must not embed known dummy client dashboard copy",
  );

  const clientRole = await authRepository.getDefaultClientRole();
  assert.ok(clientRole);
  const adminRole = await prisma.role.findUnique({ where: { code: "ADMIN" } });
  assert.ok(adminRole);

  const passwordHash = await argon2.hash(`P0Portal!${RUN}Aa1`, {
    type: argon2.argon2id,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  });

  const created = await authRepository.createUser({
    email,
    passwordHash,
    firstName: "P0",
    lastName: "Portal",
    roleId: clientRole.id,
    status: UserStatus.ACTIVE,
    emailVerified: true,
  });

  const link = await ensurePortalCompanyLink(created.id, {
    userId: created.id,
  });
  assert.ok(link?.companyId);
  assert.equal(link!.createdClient, true);

  const linkedUser = await authRepository.findUserById(created.id);
  assert.ok(linkedUser?.companyId);
  const safe = toSafeUser(linkedUser!);
  assert.equal(safe.companyId, link!.companyId);
  assert.ok(safe.companyName);

  const admin = await authRepository.createUser({
    email: `p0.admin.${RUN}@eliteflow.test`,
    passwordHash,
    firstName: "P0",
    lastName: "Admin",
    roleId: adminRole.id,
    status: UserStatus.ACTIVE,
    emailVerified: true,
  });

  const otherClient = await prisma.client.create({
    data: {
      companyName: `P0 Other ${RUN}`,
      contactName: "Other",
      email: `p0.other.${RUN}@eliteflow.test`,
      status: "ACTIVE",
    },
  });

  // Unlink then admin re-link (API service path)
  await clientsService.unlinkPortalUser(link!.companyId, created.id, {
    userId: admin.id,
  });
  const afterUnlink = await authRepository.findUserById(created.id);
  assert.equal(afterUnlink?.companyId ?? null, null);

  const relinked = await clientsService.linkPortalUser(
    link!.companyId,
    { userId: created.id },
    { userId: admin.id },
  );
  assert.equal(relinked.companyId, link!.companyId);

  let duplicateDenied = false;
  try {
    await clientsService.linkPortalUser(
      link!.companyId,
      { userId: created.id },
      { userId: admin.id },
    );
  } catch (error) {
    duplicateDenied =
      error instanceof Error &&
      "code" in error &&
      (error as { code: string }).code ===
        CLIENTS_ERROR_CODES.PORTAL_USER_ALREADY_LINKED;
  }
  assert.equal(duplicateDenied, true);

  const ownProject = await prisma.project.create({
    data: {
      name: `P0 Own Project ${RUN}`,
      clientId: link!.companyId,
      status: "IN_PROGRESS",
      priority: "MEDIUM",
      progress: 5,
    },
  });
  const otherProject = await prisma.project.create({
    data: {
      name: `P0 Other Project ${RUN}`,
      clientId: otherClient.id,
      status: "IN_PROGRESS",
      priority: "MEDIUM",
      progress: 5,
    },
  });
  const ownInvoice = await prisma.invoice.create({
    data: {
      invoiceNumber: `P0-OWN-${RUN}`,
      clientId: link!.companyId,
      status: "SENT",
      issueDate: new Date(),
      dueDate: new Date(),
      currency: "USD",
      taxRate: 0,
      discountAmount: 0,
      subtotal: 50,
      taxAmount: 0,
      total: 50,
    },
  });
  const otherInvoice = await prisma.invoice.create({
    data: {
      invoiceNumber: `P0-OTH-${RUN}`,
      clientId: otherClient.id,
      status: "SENT",
      issueDate: new Date(),
      dueDate: new Date(),
      currency: "USD",
      taxRate: 0,
      discountAmount: 0,
      subtotal: 99,
      taxAmount: 0,
      total: 99,
    },
  });

  const clientActor = {
    userId: created.id,
    role: "CLIENT",
    email: created.email,
  };

  const projects = await projectsService.list(
    {
      search: "",
      sortBy: "createdAt",
      sortOrder: "desc",
      page: 1,
      limit: 50,
    },
    clientActor,
  );
  assert.ok(projects.items.some((p) => p.id === ownProject.id));
  assert.equal(projects.items.some((p) => p.id === otherProject.id), false);

  let crossProjectDenied = false;
  try {
    await projectsService.getById(otherProject.id, clientActor);
  } catch {
    crossProjectDenied = true;
  }
  assert.equal(crossProjectDenied, true);

  const invoices = await invoicesService.list(
    {
      search: "",
      sortBy: "createdAt",
      sortOrder: "desc",
      page: 1,
      limit: 50,
    },
    clientActor,
  );
  assert.ok(invoices.items.some((i) => i.id === ownInvoice.id));
  assert.equal(invoices.items.some((i) => i.id === otherInvoice.id), false);

  let crossInvoiceDenied = false;
  try {
    await invoicesService.getById(otherInvoice.id, clientActor);
  } catch {
    crossInvoiceDenied = true;
  }
  assert.equal(crossInvoiceDenied, true);

  // Cleanup
  await prisma.invoice.deleteMany({
    where: { id: { in: [ownInvoice.id, otherInvoice.id] } },
  });
  await prisma.project.deleteMany({
    where: { id: { in: [ownProject.id, otherProject.id] } },
  });
  await prisma.user.deleteMany({
    where: { id: { in: [created.id, admin.id] } },
  });
  await prisma.client.deleteMany({
    where: { id: { in: [link!.companyId, otherClient.id] } },
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        api: API,
        web: WEB,
        companyId: link!.companyId,
        companyName: safe.companyName,
        checks: [
          "api_health_ok",
          "portal_users_route_live",
          "signup_captcha_protected",
          "vercel_portal_no_dummy_copy",
          "ensurePortalCompanyLink_companyId",
          "admin_unlink_relink",
          "duplicate_link_rejected",
          "project_isolation",
          "invoice_isolation",
        ],
        note: "HTTP /signup+/login not fully exercised due to production reCAPTCHA + Zero Trust session binding; signup onboarding service path and live API routes verified against production.",
      },
      null,
      2,
    ),
  );
}

main()
  .catch(async (error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

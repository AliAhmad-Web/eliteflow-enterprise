"use client";

import type {
  CreateCustomerRequestInput,
  CustomerRequestTypeValue,
} from "@enterprise/shared";
import {
  CUSTOMER_REQUEST_CONTINUATION_TYPES,
  CUSTOMER_REQUEST_INTAKE_TYPES,
} from "@enterprise/shared";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { ErrorState } from "@/components/common/feedback/error-state";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requestDetailPath, ROUTES } from "@/constants/routes";
import { useProject, useProjects } from "@/features/projects/hooks/use-projects";
import { getApiErrorMessage } from "@/services/api/api-error";

import { useCreateCustomerRequest } from "../hooks/use-customer-request-mutations";
import { RequestForm } from "./request-form";

const INTAKE_TYPES = new Set<string>(CUSTOMER_REQUEST_INTAKE_TYPES);
const CONTINUATION_TYPES = new Set<string>(CUSTOMER_REQUEST_CONTINUATION_TYPES);

export function RequestNewPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const typeParam = searchParams.get("type");
  const projectId = searchParams.get("projectId");
  const continuationMode = Boolean(projectId);

  const defaultType: CustomerRequestTypeValue = continuationMode
    ? typeParam && CONTINUATION_TYPES.has(typeParam)
      ? (typeParam as CustomerRequestTypeValue)
      : "REVISION"
    : typeParam && INTAKE_TYPES.has(typeParam)
      ? (typeParam as CustomerRequestTypeValue)
      : "NEW_PROJECT";

  const createMutation = useCreateCustomerRequest();
  const projectsQuery = useProjects({
    search: "",
    sortBy: "name",
    sortOrder: "asc",
    page: 1,
    limit: 100,
  });
  const projectQuery = useProject(projectId);

  const handleSubmit = async (
    values: CreateCustomerRequestInput,
    options: { submit: boolean },
  ) => {
    const created = await createMutation.mutateAsync({
      ...values,
      targetProjectId: projectId ?? values.targetProjectId,
      submit: options.submit,
    });
    router.push(requestDetailPath(created.id));
  };

  if (continuationMode && projectQuery.isLoading) {
    return <LoadingState label="Loading project" />;
  }

  if (continuationMode && (projectQuery.isError || !projectQuery.data)) {
    return (
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
          <Link href={ROUTES.PROJECTS}>
            <ArrowLeft className="mr-2 size-4" aria-hidden />
            Back to projects
          </Link>
        </Button>
        <ErrorState
          title="Project not found"
          description="This project is not available for a change request."
          onRetry={() => void projectQuery.refetch()}
        />
      </div>
    );
  }

  const lockedProject = projectQuery.data
    ? { id: projectQuery.data.id, name: projectQuery.data.name }
    : null;

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
        <Link href={continuationMode ? ROUTES.PROJECTS : ROUTES.REQUESTS}>
          <ArrowLeft className="mr-2 size-4" aria-hidden />
          {continuationMode ? "Back to projects" : "Back to requests"}
        </Link>
      </Button>

      <PageHeader
        title={
          continuationMode ? "Request change / additional work" : "New request"
        }
        description={
          continuationMode
            ? `Request a revision, extra scope, next phase, maintenance, or reopen for ${lockedProject?.name ?? "this project"}. EliteFlow will review before any work is accepted.`
            : "Submit your project request. After review and approval, your workspace unlocks automatically."
        }
      />

      <Card className="border-border/50 shadow-(--shadow-sm)">
        <CardContent className="space-y-4 p-6">
          {continuationMode ? (
            <p className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
              This request stays linked to{" "}
              <span className="font-medium text-foreground">
                {lockedProject?.name}
              </span>
              . You do not need to pick or link a company. Approval of the work
              request is not financial or invoice approval.
            </p>
          ) : (
            <p className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
              No existing company link is required to submit. You will only see
              your own requests until EliteFlow approves and accepts your
              project.
            </p>
          )}
          <RequestForm
            mode="create"
            defaultType={defaultType}
            allowedTypes={
              continuationMode
                ? CUSTOMER_REQUEST_CONTINUATION_TYPES
                : CUSTOMER_REQUEST_INTAKE_TYPES
            }
            lockedProject={lockedProject}
            projects={projectsQuery.data?.items ?? []}
            isSubmitting={createMutation.isPending}
            onSubmit={handleSubmit}
            onCancel={() =>
              router.push(continuationMode ? ROUTES.PROJECTS : ROUTES.REQUESTS)
            }
          />
          {createMutation.isError ? (
            <p className="mt-4 text-sm text-destructive" role="alert">
              {getApiErrorMessage(createMutation.error)}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

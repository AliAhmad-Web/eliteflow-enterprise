"use client";

import type {
  CreateCustomerRequestInput,
  CustomerRequestTypeValue,
} from "@enterprise/shared";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requestDetailPath, ROUTES } from "@/constants/routes";
import { useProjects } from "@/features/projects/hooks/use-projects";
import { getApiErrorMessage } from "@/services/api/api-error";

import { useCreateCustomerRequest } from "../hooks/use-customer-request-mutations";
import { RequestForm } from "./request-form";

const VALID_TYPES = new Set<CustomerRequestTypeValue>([
  "NEW_PROJECT",
  "NEW_TASK",
  "GENERAL_SERVICE",
]);

export function RequestNewPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const typeParam = searchParams.get("type");
  const defaultType =
    typeParam && VALID_TYPES.has(typeParam as CustomerRequestTypeValue)
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

  const handleSubmit = async (
    values: CreateCustomerRequestInput,
    options: { submit: boolean },
  ) => {
    const created = await createMutation.mutateAsync({
      ...values,
      submit: options.submit,
    });
    router.push(requestDetailPath(created.id));
  };

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
        <Link href={ROUTES.REQUESTS}>
          <ArrowLeft className="mr-2 size-4" aria-hidden />
          Back to requests
        </Link>
      </Button>

      <PageHeader
        title="New request"
        description="Submit your project request. After review and approval, your workspace unlocks automatically."
      />

      <Card className="border-border/50 shadow-(--shadow-sm)">
        <CardContent className="space-y-4 p-6">
          <p className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
            No existing company link is required to submit. You will only see
            your own requests until EliteFlow approves and accepts your
            project.
          </p>
          <RequestForm
            mode="create"
            defaultType={defaultType}
            projects={projectsQuery.data?.items ?? []}
            isSubmitting={createMutation.isPending}
            onSubmit={handleSubmit}
            onCancel={() => router.push(ROUTES.REQUESTS)}
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

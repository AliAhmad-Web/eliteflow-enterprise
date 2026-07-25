import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <p className="text-sm font-medium uppercase tracking-wider text-primary">
        404
      </p>
      <h1 className="mt-2 text-2xl font-bold text-foreground">Page not found</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        The page you are looking for does not exist or has been moved.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button asChild>
          <Link href={ROUTES.HOME}>Go to home</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href={ROUTES.LOGIN}>Sign in</Link>
        </Button>
      </div>
    </div>
  );
}

import { UserRole } from "@enterprise/shared";

/** Post-auth home route — CLIENT lands on portal shell, staff on dashboard. */
export function getAuthenticatedHomePath(roleCode?: string | null): string {
  if (roleCode === UserRole.CLIENT) {
    return "/(app)/portal";
  }
  return "/(app)/(tabs)";
}

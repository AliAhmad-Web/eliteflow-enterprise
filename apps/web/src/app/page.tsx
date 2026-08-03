import type { Metadata } from "next";

import { RoleHomeRedirect } from "@/features/auth/components/role-home-redirect";
import { isSeoRobotsEnabled } from "@/features/seo/feature-flags";
import { composePrivateSurfaceMetadata } from "@/features/seo/metadata/compose-public-page-metadata";

const HOME_BASELINE: Metadata = {};

export const metadata: Metadata = composePrivateSurfaceMetadata(
  HOME_BASELINE,
  isSeoRobotsEnabled(),
);

export default function HomePage() {
  return <RoleHomeRedirect />;
}

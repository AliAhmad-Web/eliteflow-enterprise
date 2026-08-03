/**
 * Hide Communication nav entries when their presentation flags are OFF.
 * Implementation and routes remain — only visibility is gated for rollback.
 */

import type { NavigationSection } from "@/config/navigation.config";
import { ROUTES } from "@/constants/routes";

import {
  isCommunicationEmailPresentationEnabled,
  isCommunicationVoicePresentationEnabled,
  isCommunicationWhatsappPresentationEnabled,
} from "../feature-flags";

function isCommunicationNavItemVisible(href: string): boolean {
  if (href === ROUTES.VOICE_AI) {
    return isCommunicationVoicePresentationEnabled();
  }
  if (href === ROUTES.WHATSAPP) {
    return isCommunicationWhatsappPresentationEnabled();
  }
  if (href === ROUTES.EMAIL_AUTOMATION) {
    return isCommunicationEmailPresentationEnabled();
  }
  return true;
}

/** Filter sidebar / mobile nav after RBAC. */
export function filterNavigationByCommunicationFlags(
  sections: NavigationSection[],
): NavigationSection[] {
  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) =>
        isCommunicationNavItemVisible(item.href),
      ),
    }))
    .filter((section) => section.items.length > 0);
}

/**
 * Hide only standalone Communication nav pages (Voice AI / WhatsApp).
 * Does NOT gate AI Agent capabilities in AI Assistant or Email Automation.
 */

import type { NavigationSection } from "@/config/navigation.config";
import { ROUTES } from "@/constants/routes";

import {
  isCommunicationEmailPresentationEnabled,
  isCommunicationVoiceAiPageEnabled,
  isCommunicationWhatsappPageEnabled,
} from "../feature-flags";

function isCommunicationNavItemVisible(href: string): boolean {
  if (href === ROUTES.VOICE_AI) {
    return isCommunicationVoiceAiPageEnabled();
  }
  if (href === ROUTES.WHATSAPP) {
    return isCommunicationWhatsappPageEnabled();
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

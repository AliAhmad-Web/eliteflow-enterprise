import { siteConfig } from "@/config/site.config";

import {
  isSeoEntityOptimizationEnabled,
  isSeoKnowledgeGraphEnabled,
  isSeoRichResultsEnabled,
  isSeoStructuredDataEnabled,
} from "../feature-flags";

export type JsonLdRecord = Record<string, unknown>;

const ORGANIZATION_ID = `${siteConfig.url}/#organization`;
const WEBSITE_ID = `${siteConfig.url}/#website`;

export function buildOrganizationJsonLd(): JsonLdRecord | null {
  if (!isSeoStructuredDataEnabled()) return null;

  const org: JsonLdRecord = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
    url: siteConfig.url,
    description: siteConfig.description,
    logo: `${siteConfig.url}/brand/eliteflow-mark.svg`,
  };

  if (isSeoEntityOptimizationEnabled() || isSeoKnowledgeGraphEnabled()) {
    org["@id"] = ORGANIZATION_ID;
    org.alternateName = ["EliteFlow BMS", siteConfig.tagline];
    org.sameAs = [siteConfig.repositoryUrl, siteConfig.webAppUrl];
  }

  if (isSeoRichResultsEnabled()) {
    org.image = `${siteConfig.url}/brand/eliteflow-mark.svg`;
  }

  return org;
}

export function buildWebSiteJsonLd(): JsonLdRecord | null {
  if (!isSeoStructuredDataEnabled()) return null;

  const site: JsonLdRecord = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: siteConfig.url,
    description: siteConfig.description,
  };

  if (isSeoKnowledgeGraphEnabled() || isSeoEntityOptimizationEnabled()) {
    site["@id"] = WEBSITE_ID;
    site.publisher = { "@id": ORGANIZATION_ID };
  }

  return site;
}

export function buildWebPageJsonLd(input: {
  name: string;
  path: string;
  description: string;
}): JsonLdRecord | null {
  if (!isSeoStructuredDataEnabled()) return null;

  const pageUrl = `${siteConfig.url}${input.path}`;
  const page: JsonLdRecord = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: input.name,
    url: pageUrl,
    description: input.description,
    isPartOf: isSeoKnowledgeGraphEnabled()
      ? { "@id": WEBSITE_ID }
      : { "@type": "WebSite", name: siteConfig.name, url: siteConfig.url },
  };

  if (isSeoEntityOptimizationEnabled()) {
    page["@id"] = `${pageUrl}#webpage`;
    page.inLanguage = "en";
  }

  return page;
}

export function buildBreadcrumbListJsonLd(
  items: readonly { name: string; path: string }[],
): JsonLdRecord | null {
  if (!isSeoStructuredDataEnabled() || items.length === 0) return null;

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${siteConfig.url}${item.path}`,
    })),
  };
}

/** Graph bundle for public download pages (Organization + WebSite + WebPage + optional breadcrumbs). */
export function buildPublicPageJsonLdGraph(input: {
  name: string;
  path: string;
  description: string;
  breadcrumbs?: readonly { name: string; path: string }[];
}): JsonLdRecord[] {
  const nodes: JsonLdRecord[] = [];
  const organization = buildOrganizationJsonLd();
  const website = buildWebSiteJsonLd();
  const webpage = buildWebPageJsonLd(input);
  const breadcrumbs = input.breadcrumbs
    ? buildBreadcrumbListJsonLd(input.breadcrumbs)
    : null;

  if (organization) nodes.push(organization);
  if (website) nodes.push(website);
  if (webpage) nodes.push(webpage);
  if (breadcrumbs) nodes.push(breadcrumbs);

  return nodes;
}

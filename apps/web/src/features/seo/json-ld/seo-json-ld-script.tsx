import {
  buildPublicPageJsonLdGraph,
  type JsonLdRecord,
} from "./build-json-ld";

type SeoJsonLdScriptProps = {
  data: JsonLdRecord | JsonLdRecord[];
};

/**
 * Renders JSON-LD script tags. Caller must only mount when structured data is enabled
 * (or pass empty array — renders nothing).
 */
export function SeoJsonLdScript({ data }: SeoJsonLdScriptProps) {
  const nodes = Array.isArray(data) ? data : [data];
  if (nodes.length === 0) return null;

  return (
    <>
      {nodes.map((node, index) => (
        <script
          // Stable order; content is deterministic JSON from builders.
          key={`seo-jsonld-${index}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(node) }}
        />
      ))}
    </>
  );
}

type PublicPageJsonLdProps = {
  name: string;
  path: string;
  description: string;
  breadcrumbs?: readonly { name: string; path: string }[];
};

/** Convenience wrapper — no-ops when SEO_STRUCTURED_DATA / SEO_JSON_LD are OFF. */
export function PublicPageJsonLd(props: PublicPageJsonLdProps) {
  const graph = buildPublicPageJsonLdGraph(props);
  return <SeoJsonLdScript data={graph} />;
}

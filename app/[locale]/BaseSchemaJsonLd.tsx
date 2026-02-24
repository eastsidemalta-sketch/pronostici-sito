import { getBaseSchemaJsonLd } from "@/lib/seo/schema";

export default function BaseSchemaJsonLd() {
  const jsonLd = getBaseSchemaJsonLd();
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

import Script from "next/script";
import { organizationJsonLd } from "@/lib/seo/json-ld";

export function JsonLd() {
  const data = organizationJsonLd();
  return (
    <Script id="neya-org-jsonld" type="application/ld+json" strategy="afterInteractive">
      {JSON.stringify(data)}
    </Script>
  );
}

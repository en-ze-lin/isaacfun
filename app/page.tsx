import { JsonLd } from "@/components/JsonLd";
import { Shell } from "@/components/Shell";
import { absoluteUrl, pageMetadata, site } from "@/lib/site";

export const metadata = pageMetadata({ description: site.description, path: "/" });

export default function Home() {
  return (
    <>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            "@id": absoluteUrl("/#website"),
            name: site.name,
            url: absoluteUrl("/"),
            description: site.description,
            inLanguage: ["en", "zh-Hant"],
            author: { "@id": absoluteUrl("/#person") },
          },
          {
            "@context": "https://schema.org",
            "@type": "Person",
            "@id": absoluteUrl("/#person"),
            name: "En-Ze Lin",
            alternateName: "Isaac Lin",
            url: absoluteUrl("/"),
            mainEntityOfPage: absoluteUrl("/about/"),
          },
        ]}
      />
      <Shell home />
    </>
  );
}

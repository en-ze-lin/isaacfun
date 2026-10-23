import { JsonLd } from "@/components/JsonLd";
import { Shell } from "@/components/Shell";
import { absoluteUrl, aboutParagraphs, pageMetadata, site, summarize } from "@/lib/site";

const description = summarize(aboutParagraphs[0] ?? site.description, 155);

export const metadata = pageMetadata({ title: "About", description, path: "/about/" });

export default function About() {
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "AboutPage",
          name: `About — ${site.name}`,
          url: absoluteUrl("/about/"),
          description,
          isPartOf: { "@id": absoluteUrl("/#website") },
          about: { "@id": absoluteUrl("/#person") },
          breadcrumb: {
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: site.name, item: absoluteUrl("/") },
              { "@type": "ListItem", position: 2, name: "about", item: absoluteUrl("/about/") },
            ],
          },
        }}
      />
      <Shell>
        <h1 className="page-title">about</h1>
        <div className="about">
          {aboutParagraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </Shell>
    </>
  );
}

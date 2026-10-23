import { notFound } from "next/navigation";
import { Card } from "@/components/Card";
import { JsonLd } from "@/components/JsonLd";
import { Shell } from "@/components/Shell";
import {
  SECTION_SLUGS,
  absoluteUrl,
  getProjects,
  pageMetadata,
  projectHref,
  sectionDescription,
  sectionIntro,
  sectionLabel,
  site,
} from "@/lib/site";

// Only the sections listed in the menu exist; anything else is a real 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return SECTION_SLUGS.map((section) => ({ section }));
}

type Props = { params: Promise<{ section: string }> };

export async function generateMetadata({ params }: Props) {
  const { section } = await params;
  return pageMetadata({
    title: sectionLabel(section),
    description: sectionDescription(section),
    path: `/${section}/`,
  });
}

export default async function Section({ params }: Props) {
  const { section } = await params;
  if (!SECTION_SLUGS.includes(section)) notFound();

  const items = getProjects(section);
  const intro = sectionIntro(section);
  const url = absoluteUrl(`/${section}/`);

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `${sectionLabel(section)} — ${site.name}`,
          url,
          description: sectionDescription(section),
          isPartOf: { "@id": absoluteUrl("/#website") },
          breadcrumb: {
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: site.name, item: absoluteUrl("/") },
              { "@type": "ListItem", position: 2, name: sectionLabel(section), item: url },
            ],
          },
          mainEntity: {
            "@type": "ItemList",
            numberOfItems: items.length,
            itemListElement: items.map((p, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: p.title,
              description: p.description,
              url: absoluteUrl(projectHref(section, p)),
            })),
          },
        }}
      />
      <Shell>
        <h1 className="page-title">{sectionLabel(section)}</h1>
        {intro && <p className="section-intro">{intro}</p>}
        {items.length > 0 ? (
          <div className="grid">
            {items.map((item) => (
              <Card key={item.slug} section={section} item={item} />
            ))}
          </div>
        ) : (
          <p className="empty">nothing here yet.</p>
        )}
      </Shell>
    </>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/JsonLd";
import { Shell } from "@/components/Shell";
import { SECTION_SLUGS, absoluteUrl, getPlaceholders, pageMetadata, sectionLabel, site } from "@/lib/site";

// Stub pages for projects that don't have their own built page yet. Built
// projects (those with a `url`) are static folders in /public and never come here.
export const dynamicParams = false;

export function generateStaticParams() {
  const params = SECTION_SLUGS.flatMap((section) => getPlaceholders(section).map((p) => ({ section, slug: p.slug })));
  // `output: "export"` refuses an empty list. When every project has its own page there are no
  // stubs to build, so emit one throwaway entry; tools/postbuild.mjs deletes it from ./out.
  return params.length > 0 ? params : [{ section: SECTION_SLUGS[0] ?? "use", slug: "__none" }];
}

type Props = { params: Promise<{ section: string; slug: string }> };

const find = (section: string, slug: string) => getPlaceholders(section).find((p) => p.slug === slug);

export async function generateMetadata({ params }: Props) {
  const { section, slug } = await params;
  const item = find(section, slug);
  if (!item) return {};
  return pageMetadata({ title: item.title, description: item.description, path: `/${section}/${slug}/` });
}

export default async function Stub({ params }: Props) {
  const { section, slug } = await params;
  const item = find(section, slug);
  if (!item) notFound();

  const url = absoluteUrl(`/${section}/${slug}/`);
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: `${item.title} — ${site.name}`,
          url,
          description: item.description,
          isPartOf: { "@id": absoluteUrl("/#website") },
          breadcrumb: {
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: site.name, item: absoluteUrl("/") },
              { "@type": "ListItem", position: 2, name: sectionLabel(section), item: absoluteUrl(`/${section}/`) },
              { "@type": "ListItem", position: 3, name: item.title, item: url },
            ],
          },
        }}
      />
      <Shell>
        <h1 className="page-title">{item.title}</h1>
        <div className="about">
          <p>{item.description}</p>
          <p>
            this project lives at{" "}
            <code>
              {section}/{slug}/
            </code>
          </p>
        </div>
        <p className="back">
          <Link href={`/${section}/`}>&larr; {sectionLabel(section)}</Link>
        </p>
      </Shell>
    </>
  );
}

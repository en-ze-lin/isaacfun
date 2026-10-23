import type { MetadataRoute } from "next";
import { SECTION_SLUGS, absoluteUrl, getProjects, projectHref } from "@/lib/site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const urls = ["/", "/about/"];
  for (const section of SECTION_SLUGS) {
    urls.push(`/${section}/`);
    for (const project of getProjects(section)) urls.push(projectHref(section, project));
  }
  return [...new Set(urls)].map((href) => ({ url: absoluteUrl(href) }));
}

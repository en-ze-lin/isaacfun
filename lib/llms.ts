import { SECTION_SLUGS, absoluteUrl, aboutParagraphs, getProjects, projectHref, sectionIntro, sectionLabel, site } from "./site";

/** Plain-text/Markdown summary of the whole site for LLM crawlers (https://llmstxt.org). */
export function buildLlmsTxt(full = false): string {
  const lines: string[] = [`# ${site.name}`, "", `> ${site.description}`, ""];

  if (full) {
    lines.push("## About", "", ...aboutParagraphs.flatMap((p) => [p, ""]));
  } else {
    lines.push("## Pages", "", `- [About](${absoluteUrl("/about/")}): Who made this site.`, "");
  }

  for (const section of SECTION_SLUGS) {
    const items = getProjects(section);
    const heading = sectionLabel(section);
    lines.push(`## ${heading[0].toUpperCase()}${heading.slice(1)}`, "");
    const intro = sectionIntro(section);
    if (intro && full) lines.push(intro, "");
    if (items.length === 0) lines.push("_Nothing here yet._", "");
    else {
      lines.push(...items.map((p) => `- [${p.title}](${absoluteUrl(projectHref(section, p))}): ${p.description}`), "");
    }
  }

  lines.push("## Machine-readable", "", `- [Sitemap](${absoluteUrl("/sitemap.xml")})`, `- [Full text version](${absoluteUrl("/llms-full.txt")})`, "");
  return lines.join("\n");
}

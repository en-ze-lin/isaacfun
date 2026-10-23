import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import raw from "../content/site.json";

/* =============================================================
   Site data. ALL content lives in content/site.json — this file
   only reads it and provides helpers. Nothing here needs editing
   to add a project; the add-project skill edits the JSON.
   ============================================================= */

export type Project = {
  slug: string;
  title: string;
  description: string;
  /** Square thumbnail path, relative to /public (e.g. "use/x/thumbnail.webp"). */
  image?: string;
  /** Set once the project has its own built page under /public/<section>/<slug>/. */
  url?: string;
};

export type MenuItem = {
  label: string;
  slug: string;
  masked?: string;
  blanks?: number;
};

type SiteData = {
  site: { name: string; url: string; author: string; description: string };
  menu: MenuItem[];
  intro?: Record<string, string>;
  about?: string[];
  sections?: Record<string, Project[]>;
};

const data = raw as unknown as SiteData;

export const site = data.site;
export const menu: MenuItem[] = data.menu ?? [];
export const aboutParagraphs: string[] = data.about ?? [];

/** Every menu entry except "about" is a collection page — even if it has no projects yet. */
export const SECTION_SLUGS: string[] = menu.map((m) => m.slug).filter((s) => s !== "about");

const FALLBACK_DESCRIPTIONS: Record<string, string> = {
  use: "Small web tools you can use, built by Isaac Lin.",
  imagine: "Unofficial brand remix ideas and fictional concepts, imagined by Isaac Lin.",
  enjoy: "Playful web pages, experiments and interactive tools made for fun.",
  digest: "Short writing and reading notes.",
};

const trimSlashes = (s: string) => s.replace(/^\/+|\/+$/g, "");

export const sectionLabel = (slug: string) =>
  (menu.find((m) => m.slug === slug)?.label ?? slug).toLowerCase();

export const sectionIntro = (slug: string): string | undefined => data.intro?.[slug];

/** A short, meta-description-sized summary for a section. */
export function sectionDescription(slug: string): string {
  const intro = data.intro?.[slug];
  if (intro) return summarize(intro, 155);
  return FALLBACK_DESCRIPTIONS[slug] ?? site.description;
}

export const getProjects = (section: string): Project[] => data.sections?.[section] ?? [];

export const isBuiltProject = (p: Project) => Boolean(p.url);

/** Placeholder projects get a small generated stub page; built ones live in /public. */
export const getPlaceholders = (section: string) => getProjects(section).filter((p) => !p.url);

/** Root-relative link for a card / sitemap entry, always with a leading and (for folders) trailing slash. */
export function projectHref(section: string, p: Project): string {
  if (p.url) {
    const clean = "/" + trimSlashes(p.url);
    return /\.[a-z0-9]+$/i.test(clean) ? clean : clean + "/";
  }
  return `/${section}/${p.slug}/`;
}

export const absoluteUrl = (href: string) => site.url + (href.startsWith("/") ? href : "/" + href);

/** Root-relative image path, or "" if no file exists (the card then shows a monogram). */
export function resolveImage(image?: string): string {
  if (!image) return "";
  const rel = trimSlashes(image);
  return fs.existsSync(path.join(process.cwd(), "public", rel)) ? "/" + rel : "";
}

export const initials = (title: string) =>
  (title
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2) || "·"
  ).toUpperCase();

/** Trim text to a sentence boundary / word boundary under `max` characters. */
export function summarize(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const sentence = clean.slice(0, max).match(/^.*[.!?](?=\s|$)/);
  if (sentence && sentence[0].length > max * 0.5) return sentence[0];
  return clean.slice(0, max).replace(/\s+\S*$/, "") + "…";
}

/* Deterministic "missing letter" for the home menu — same word, same hidden spot, always. */
const hashOf = (s: string) => {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
};

export function maskLabel(item: MenuItem): string {
  if (item.masked) return item.masked;
  const label = item.label;
  if (label.length < 2) return label;
  const positions: number[] = [];
  for (let i = 1; i < label.length; i++) positions.push(i);
  positions.sort((a, b) => hashOf(label + "#" + a) - hashOf(label + "#" + b));
  const hide = new Set(positions.slice(0, Math.min(item.blanks ?? 1, positions.length)));
  return [...label].map((ch, i) => (hide.has(i) ? "_" : ch)).join("");
}

/* ---------- metadata ---------- */

const OG_IMAGE = { url: "/og.png", width: 1200, height: 630, alt: "isaacfun.xyz" };

/** Per-page metadata: title, description, canonical URL, Open Graph and Twitter cards. */
export function pageMetadata(opts: { title?: string; description: string; path: string; noindex?: boolean }): Metadata {
  const canonical = opts.path === "/" ? "/" : opts.path.endsWith("/") ? opts.path : opts.path + "/";
  const fullTitle = opts.title ? `${opts.title} — ${site.name}` : undefined;
  return {
    ...(opts.title ? { title: opts.title } : {}),
    description: opts.description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      siteName: site.name,
      url: canonical,
      title: fullTitle ?? site.name,
      description: opts.description,
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle ?? site.name,
      description: opts.description,
      images: [OG_IMAGE.url],
    },
    ...(opts.noindex ? { robots: { index: false, follow: true } } : {}),
  };
}

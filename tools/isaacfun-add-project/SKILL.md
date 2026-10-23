---
name: isaacfun-add-project
description: Adds a new project to the Isaac Fun portfolio site (github en-ze-lin/isaacfun, deployed on Vercel, eventually isaacfun.xyz). Use whenever the user uploads a file, folder, or zip, or points at a repo, and asks to "add it to my site", "publish this", "put this on isaacfun", "add a new tool/concept/idea", or similar. Creates public/<section>/<slug>/, captures a square thumbnail, injects the back button and SEO metadata, and adds the entry to content/site.json so the card, sitemap and llms.txt update on the next build.
metadata:
  triggers:
    - "add this to my site"
    - "publish to isaacfun"
    - "new tool on my site"
    - "add a concept/idea"
    - "put this project on isaacfun"
---

# isaacfun-add-project

Registers a new project on the **Isaac Fun** site. The site is a Next.js static
export (`output: "export"`). All content lives in **`content/site.json`**; built
projects are plain static folders under **`public/<section>/<slug>/`** that are
copied verbatim into the output. The card, the section page, `sitemap.xml`,
`llms.txt` and `llms-full.txt` are all generated from the JSON at build time.

## The site

- Repo: `en-ze-lin/isaacfun`. Hosting: Vercel, domain `isaacfun.xyz`.
- The site root is the folder containing **both** `content/site.json` and
  `package.json`. Locate it; do not hardcode a path. If you can't find it, ask.
- Sections are the entries in `menu` (currently `use`, `imagine`, `enjoy`,
  `digest`; `about` is prose). A section may be empty or have no folder yet —
  adding a project to it must still work (the script creates what is missing).
- Theme: light-gray "paper", black text, Courier Prime, square corners, no color
  accents. Descriptions and fallback thumbnails must fit that quiet, print-like
  tone — no marketing words like "powerful" or "amazing".

## What you'll be given

A folder with `index.html` + assets, a single `.html`, or a `.zip` of either
(unzip to a temp folder first), or a path inside the repo.

## Steps, in order

1. **Find the site root** (`content/site.json` + `package.json`).

2. **Pick a slug** (kebab-case from the name; show it, let the user override).

3. **Ask for metadata in ONE `AskUserQuestion` call**: section (any menu entry
   except about), title, and a one-sentence description (≤ 90 chars, drafted from
   the project's `<title>`/`<h1>`/first paragraph). Never guess silently.

4. **Copy files** into `<site>/public/<section>/<slug>/` (create it if needed). A
   lone `.html` is saved as `index.html`. If the folder exists, ask to overwrite.
   Convert large PNG photos to WebP (≈q82, max width 2000) and update references;
   keep any Open Graph image as PNG/JPG.

5. **Thumbnail**:
   `python3 scripts/capture_thumbnail.py <site>/public/<section>/<slug>/index.html <site>/public/<section>/<slug>/thumbnail`
   Use the printed path **relative to `public/`** as `--image` below.

6. **Back button**: `python3 scripts/inject_nav.py <site>/public/<section>/<slug>/index.html`
   (idempotent; touches only its marked block).

7. **Register the project** (never hand-edit the JSON):
   `python3 scripts/update_projects.py --site <site> --section <section> --slug <slug> --title "<title>" --description "<desc>" --image "<section>/<slug>/thumbnail.png" [--overwrite]`
   - If a placeholder card with the same slug exists, it is upgraded to the real project.
   - Use `--placeholder` to add only a card (Next then generates a stub page).

8. **SEO metadata for the static page**:
   `python3 scripts/inject_meta.py <site>`
   Adds description, canonical, Open Graph, Twitter and JSON-LD to every built
   project page (idempotent, fills only missing tags, rewrites off-site og:url/og:image).
   **Re-run it whenever a project is rebuilt** (e.g. Sky Sonnet's Vite build
   overwrites `index.html`, so re-run `inject_nav.py` and `inject_meta.py` too).

9. **Build and verify** from `<site>`: `npm run build && npm run check`.
   `check` audits `out/` the way a crawler sees it (titles, canonicals, OG,
   sitemap↔pages, robots, llms.txt, internal links). Fix anything it reports.

10. **Report back**: slug, folder, thumbnail kind, check result. Remind the user
    that publishing = `git add -A && git commit && git push` (Vercel builds it).

## Writing a description

If none is given, read `<title>`, `<h1>` and the first paragraphs and write one
calm sentence under 90 characters. Show it before saving.

## Don't

- Don't edit `app/` or `components/` — this skill only adds content.
- Don't reorder existing entries; the script appends.
- Don't add analytics or external CDN scripts to ingested projects.
- Don't proceed without a chosen slug, section and description.
- Don't put project folders at the repo root — they must be under `public/`.

## Scripts

- `scripts/capture_thumbnail.py <project_html> <out_base>` — screenshot, else SVG monogram.
- `scripts/inject_nav.py <project_html>` — idempotent back-button block.
- `scripts/update_projects.py --site … --section … --slug … --title … --description … --image … [--url …] [--placeholder] [--overwrite]` — edit `content/site.json`.
- `scripts/inject_meta.py <site>` — SEO metadata for all built project pages.

Run with `python3`. Only the screenshot path benefits from Playwright/network.

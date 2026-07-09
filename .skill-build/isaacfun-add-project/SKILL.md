---
name: isaacfun-add-project
description: Adds a new project to the Isaac Fun portfolio site (github en-ze-lin/isaacfun, deployed on Vercel, eventually isaacfun.xyz). Use whenever the user uploads a file, folder, or zip, or points at a repo, and asks to "add it to my site", "publish this", "put this on isaacfun", "add a new tool/concept/idea", or similar. Creates projects/<slug>/, auto-captures a square thumbnail as the card logo, injects the shared navbar into the project, and appends an entry to projects.js so the card shows up automatically.
metadata:
  triggers:
    - "add this to my site"
    - "publish to isaacfun"
    - "new tool on my site"
    - "add a concept/idea"
    - "put this project on isaacfun"
---

# isaacfun-add-project

Registers a new project on the **Isaac Fun** site. The homepage is data-driven:
every card is built by `.map()` over `projects.js`, so the one required change is
appending an entry there. Everything else (folder, thumbnail, navbar) is bookkeeping.

## The site

- Repo: `en-ze-lin/isaacfun`. Hosting: Vercel now, domain `isaacfun.xyz` later.
- The site folder is the one containing **both** `projects.js` and `index.html`.
  Locate it before doing anything; do not hardcode a path. If you can't find it,
  ask the user where the site lives and stop.
- Sections are `tools`, `concepts`, and `ideas`. `about` is prose, not projects.
- Theme: dark slate + gray + orange, Helvetica Neue, minimal rounding. Anything
  you generate (descriptions, fallback thumbnails) must fit that quiet tone —
  no marketing words like "powerful" or "amazing".

## What you'll be given

The user uploads one of: a folder with `index.html` + assets, a single `.html`
file, or a `.zip` of either — or they point at a path inside the `isaacfun` repo.
If a `.zip` is provided, unzip to a temp folder first.

## Steps, in order

1. **Find the site.** Confirm `projects.js` and `index.html` exist together.
   That folder is `<site>` for the scripts below.

2. **Pick a slug.** Derive a short kebab-case slug from the file/folder name
   (`Cool Game.html` → `cool-game`). Show it and let the user override.

3. **Ask for metadata in ONE `AskUserQuestion` call.** Ask:
   - **section** — Tools, Concepts, or Ideas (which page the card belongs on).
   - **title** — the bold card text (default: slug, title-cased).
   - **description** — one sentence, ≤ 90 chars. Draft a candidate from the
     project's `<title>`/`<h1>`/first paragraph and let them accept or edit.

   Always ask — never guess the title or description silently.

4. **Copy files into place.** Create `<site>/projects/<slug>/` and copy all
   uploaded files in. A lone `.html` file is saved as `index.html`. If the slug
   folder already exists, ask to pick another name or confirm overwrite.

5. **Capture the thumbnail (card logo).**
   `python3 scripts/capture_thumbnail.py <site>/projects/<slug>/index.html <site>/projects/<slug>/thumbnail`
   It screenshots the page with Playwright when available, else writes a themed
   SVG monogram. It prints the final path (`thumbnail.png` or `thumbnail.svg`).
   Use that path, relative to `<site>`, as the `image` value in the next step.
   Remind the user the `image` field in `projects.js` is a plain path they can
   later swap for any other image.

6. **Inject the shared navbar** so the project links back to the site. Pass the
   section so the bar shows a prominent "&larr; Concepts" (etc.) back button:
   `python3 scripts/inject_nav.py <site>/projects/<slug>/index.html <section>`
   It is idempotent (safe to re-run) and only touches a marked block — it does
   not rewrite the user's own code or styles.

7. **Update `projects.js`** — never hand-edit by string replacement:
   `python3 scripts/update_projects.py --site <site> --section <tools|concepts|ideas> --slug <slug> --title "<title>" --description "<desc>" --image "projects/<slug>/thumbnail.png" [--overwrite]`

8. **(Optional) Subdomain.** If the user wants `slug.isaacfun.xyz`, tell them to
   add the domain in the Vercel dashboard and a CNAME pointing at
   `cname.vercel-dns.com`, and add a matching rewrite to `vercel.json`. You can
   scaffold the `vercel.json` rewrite but cannot provision live DNS.

9. **Report back.** Give the slug, the new folder path, whether the thumbnail was
   a screenshot or a generated monogram, and remind them they can edit the
   title/description/image any time in `projects.js`.

## Writing a description

If the user gives none, read the project's `index.html` — `<title>`, `<h1>`, and
the first couple of paragraphs — and summarize in one calm sentence under 90
characters. Show it before saving.

## Don't

- Don't edit `styles.css` or the homepage layout — this skill only adds content.
- Don't reorder existing entries in `projects.js`; the script appends at the end.
- Don't add analytics or external CDN scripts to ingested projects.
- Don't proceed without a chosen slug, section, and description.

## Scripts

- `scripts/capture_thumbnail.py <project_html> <out_base>` — screenshot, else SVG monogram.
- `scripts/inject_nav.py <project_html> [section]` — idempotently inject the back-to-site navbar (with a "&larr; Section" back button when section is given).
- `scripts/update_projects.py --site … --section … --slug … --title … --description … --image … [--overwrite]` — append/replace an entry in `projects.js`.

Run all with `python3`. Only the thumbnail screenshot path benefits from network/Playwright; every fallback works offline.

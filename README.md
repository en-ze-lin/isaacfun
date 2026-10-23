# isaacfun.xyz

Personal site of En-Ze Lin (Isaac). A **Next.js** site that is **pre-rendered to plain HTML** at build time, so
browsers, search engines and AI crawlers all see real content — no JavaScript needed to read it.

```
content/site.json      ← ALL site content: menu, intros, About text, every project card
app/                   ← pages: home, about, [section] lists, project stubs, 404, sitemap, robots, llms.txt
components/, lib/      ← page frame, project card, JSON-LD, helpers
public/                ← static files served as-is (see below)
  favicon.*, nav-icon.png, og.png
  use/<slug>/  imagine/<slug>/  enjoy/<slug>/  digest/<slug>/   ← each built project, with its own index.html
api/                   ← Go serverless function (Sky Sonnet's poem endpoint)
tools/                 ← preview server, post-build audit, and the add-project skill
```

## Commands

```bash
npm install            # once
npm run build          # writes the finished site to ./out
npm run preview        # serve ./out at http://localhost:3000 (works like Vercel: folders, 404 page)
npm run check          # audit ./out the way a crawler sees it (titles, links, sitemap, robots, ...)
npm run dev            # Next dev server (cards/pages only — use `preview` to test built projects)
```

## Adding a project

Use the **add-project** skill (`tools/isaacfun-add-project.skill`), or by hand:

1. Put the project in `public/<section>/<slug>/` (it needs an `index.html`; sections are `use`, `imagine`, `enjoy`, `digest`).
2. Add an entry to that section in `content/site.json`:
   `{ "slug": "my-tool", "title": "My Tool", "description": "One short sentence.", "image": "use/my-tool/thumbnail.webp", "url": "use/my-tool/" }`
3. Run `python3 tools/isaacfun-add-project/scripts/inject_meta.py .` (adds description/canonical/Open Graph/JSON-LD to built project pages; re-run after rebuilding a project).
4. `npm run build && npm run check`.

Leave out `url` for a placeholder — the site then generates a small "coming soon" page for it. Empty sections,
or a section with no entries at all, are fine: the page still builds and says "nothing here yet."
A new top-level section = one more entry in `menu` in `content/site.json`.

## How crawlers see the site

* Every page is real HTML (`out/**/index.html`) — verify with `curl https://isaacfun.xyz/use/ | less`.
* Each page has a title, description, canonical URL, Open Graph/Twitter tags and schema.org JSON-LD.
* `/sitemap.xml`, `/robots.txt` (every search and AI crawler explicitly allowed; only `/api/` is excluded),
  `/llms.txt` and `/llms-full.txt` (a plain-text summary for LLMs) are generated from `content/site.json`.
* Unknown URLs return a real `404` (not an empty app shell).

## Deploying

Vercel runs `npm ci && npm run build` and serves `out/`; `vercel.json` also sets security headers and
the Go function's timeout. The Go function needs `GEMINI_API_KEY` (and optionally `GEMINI_MODEL`) set in
the Vercel project's environment variables.

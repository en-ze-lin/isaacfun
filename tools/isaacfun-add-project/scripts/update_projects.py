#!/usr/bin/env python3
"""Add (or replace) a project entry in content/site.json.

content/site.json holds ALL site content:

    { "site": {...}, "menu": [{label, slug}], "intro": {...}, "about": [...],
      "sections": { "<slug>": [ {slug,title,description,image,url?}, ... ] } }

The file is edited with the json module (never string-replaced), so it cannot
be corrupted. This script also:
  * accepts any section listed in `menu` (not just use/imagine/enjoy/digest),
  * creates the section list if it is missing or empty,
  * creates public/<section>/<slug>/ if the folder does not exist yet,
  * turns an existing placeholder card with the same slug into the real project
    (placeholders have no `url`; the real one gets url "<section>/<slug>/").

Usage:
  python3 update_projects.py --site /path/to/repo --section use --slug my-tool \\
      --title "My Tool" --description "One calm sentence." \\
      --image "use/my-tool/thumbnail.webp" [--url use/my-tool/] [--overwrite]
  Add --placeholder to register a card WITHOUT a built page (gets a stub page).
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--site", required=True, help="repo root (contains content/site.json)")
    ap.add_argument("--section", required=True)
    ap.add_argument("--slug", required=True)
    ap.add_argument("--title", required=True)
    ap.add_argument("--description", required=True)
    ap.add_argument("--image", default="", help="path relative to public/")
    ap.add_argument("--url", default="", help="folder under public/ (default: <section>/<slug>/)")
    ap.add_argument("--placeholder", action="store_true", help="no built page; Next generates a stub")
    ap.add_argument("--overwrite", action="store_true")
    args = ap.parse_args()

    if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", args.slug):
        print(f"[site] slug must be kebab-case: {args.slug}", file=sys.stderr)
        return 1

    root = Path(args.site)
    path = root / "content" / "site.json"
    if not path.is_file():
        print(f"[site] not found: {path}", file=sys.stderr)
        return 1
    data = json.loads(path.read_text(encoding="utf-8"))

    menu_slugs = [m["slug"] for m in data.get("menu", [])]
    if args.section not in menu_slugs or args.section == "about":
        print(f"[site] section must be one of {[s for s in menu_slugs if s != 'about']}", file=sys.stderr)
        return 1

    sections = data.setdefault("sections", {})
    items = sections.get(args.section)
    if items is None:
        items = sections[args.section] = []

    entry = {"slug": args.slug, "title": args.title, "description": args.description, "image": args.image}
    if not args.placeholder:
        url = (args.url or f"{args.section}/{args.slug}/").strip("/") + "/"
        entry["url"] = url
        # make sure the folder exists, even for an empty/new section
        (root / "public" / url.strip("/")).mkdir(parents=True, exist_ok=True)

    idx = next((i for i, p in enumerate(items) if p.get("slug") == args.slug), None)
    if idx is None:
        items.append(entry)
        action = "added"
    else:
        was_placeholder = "url" not in items[idx]
        if not (args.overwrite or was_placeholder):
            print(f"[site] slug already present: {args.slug} (pass --overwrite)", file=sys.stderr)
            return 2
        items[idx] = entry
        action = "upgraded placeholder" if was_placeholder else "updated"

    # atomic write: temp file in the same folder, then replace
    tmp = path.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    tmp.replace(path)
    print(f"[site] {action} {args.slug} in {args.section}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

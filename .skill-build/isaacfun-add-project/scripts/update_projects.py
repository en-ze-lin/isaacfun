#!/usr/bin/env python3
"""Append (or replace) a project entry inside projects.js.

projects.js has the shape:

    window.SITE = {
      about: [ "...", "..." ],
      tools: [ {slug,title,description,image}, ... ],
      concepts: [ ... ],
      ideas: [ ... ]
    };

This inserts a new object literal into one of the array sections
(tools | concepts | ideas). It scans brackets while ignoring anything
inside quotes, so it won't be fooled by '[' or ']' in text.

Usage:
  python3 update_projects.py \\
    --site /path/to/site \\
    --section tools \\
    --slug waveform-editor \\
    --title "Waveform Editor" \\
    --description "A browser-based audio slicer." \\
    --image "use/waveform-editor/thumbnail.png" \\
    [--overwrite]
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

SECTIONS = ("use", "imagine", "enjoy", "digest")


def find_section_array(text: str, section: str):
    """Return (open_idx, close_idx) of the [...] following `section:`."""
    key = re.search(r"\b" + re.escape(section) + r"\s*:\s*\[", text)
    if not key:
        return None
    open_idx = text.index("[", key.start())
    depth = 0
    in_str = False
    quote = ""
    i = open_idx
    while i < len(text):
        ch = text[i]
        if in_str:
            if ch == "\\":
                i += 2
                continue
            if ch == quote:
                in_str = False
        else:
            if ch in "\"'":
                in_str = True
                quote = ch
            elif ch == "[":
                depth += 1
            elif ch == "]":
                depth -= 1
                if depth == 0:
                    return open_idx, i
        i += 1
    return None


def slug_present(section_text: str, slug: str) -> bool:
    return re.search(r'slug\s*:\s*["\']' + re.escape(slug) + r'["\']', section_text) is not None


def format_entry(slug, title, description, image, url) -> str:
    return ("    { slug: %s, title: %s, description: %s, image: %s, url: %s }"
            % (json.dumps(slug), json.dumps(title), json.dumps(description),
               json.dumps(image), json.dumps(url)))


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--site", required=True)
    ap.add_argument("--section", required=True, choices=SECTIONS)
    ap.add_argument("--slug", required=True)
    ap.add_argument("--title", required=True)
    ap.add_argument("--description", required=True)
    ap.add_argument("--image", default="")
    ap.add_argument("--url", default="", help="Path the card opens (default: projects/<slug>/index.html)")
    ap.add_argument("--overwrite", action="store_true")
    args = ap.parse_args()

    pj = Path(args.site) / "projects.js"
    if not pj.is_file():
        print(f"[projects] not found: {pj}", file=sys.stderr)
        return 1

    text = pj.read_text(encoding="utf-8")
    span = find_section_array(text, args.section)
    if not span:
        print(f"[projects] could not locate section: {args.section}", file=sys.stderr)
        return 1
    open_idx, close_idx = span
    inner = text[open_idx + 1:close_idx]

    if slug_present(inner, args.slug) and not args.overwrite:
        print(f"[projects] slug already present: {args.slug} (pass --overwrite)", file=sys.stderr)
        return 2

    url = args.url or f"{args.section}/{args.slug}/index.html"
    entry = format_entry(args.slug, args.title, args.description, args.image, url)

    if slug_present(inner, args.slug):
        # Replace the existing object that carries this slug.
        pattern = re.compile(r"\{[^{}]*slug\s*:\s*[\"']" + re.escape(args.slug) + r"[\"'][^{}]*\}")
        new_inner = pattern.sub(entry.strip(), inner, count=1)
        new_text = text[:open_idx + 1] + new_inner + text[close_idx:]
        action = "updated"
    else:
        stripped = inner.rstrip()
        sep = "," if stripped.strip() else ""
        new_inner = "\n" + stripped.lstrip("\n") + sep + "\n" + entry + "\n  "
        new_text = text[:open_idx + 1] + new_inner + text[close_idx:]
        action = "added"

    pj.write_text(new_text, encoding="utf-8")
    print(f"[projects] {action} {args.slug} in {args.section}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

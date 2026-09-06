#!/usr/bin/env python3
"""Inject a single "go back" icon button into a project's index.html.

Clicking it calls history.back() — it returns to whatever page the visitor
actually came from (a section page, the homepage, search, etc.), not a
hardcoded link. Wrapped in a marker comment so re-running the skill
replaces the old one instead of duplicating it.

Usage:
  python3 inject_nav.py <project_index_html> [section]

The optional `section` argument is accepted for backward compatibility
with existing callers but no longer changes the button — it's the same
single icon everywhere now.
"""
from __future__ import annotations

import os
import sys
import tempfile
from pathlib import Path

MARK_OPEN = "<!-- isaacfun-nav:start -->"
MARK_CLOSE = "<!-- isaacfun-nav:end -->"

SECTIONS = ("use", "imagine", "enjoy", "digest")


def build_nav(section: str | None = None) -> str:
    """A single fixed icon button (the site logo) that navigates back in
    browser history. No text, no site-specific link — self-contained
    inline styles so it works dropped into any project's markup.
    """
    return f"""{MARK_OPEN}
<button type="button" onclick="history.back()" aria-label="Go back"
  style="position:fixed;top:14px;left:14px;z-index:2147483000;
  width:60px;height:60px;padding:0;margin:0;border:none;background:none;
  cursor:pointer;display:flex;align-items:center;justify-content:center;
  opacity:0.92;transition:opacity .15s;"
  onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.92'">
  <img src="/favicon.png" alt="Back" style="width:100%;height:100%;object-fit:contain;display:block;" />
</button>
{MARK_CLOSE}"""


def main(argv: list[str]) -> int:
    if len(argv) not in (2, 3):
        print(__doc__, file=sys.stderr)
        return 2
    path = Path(argv[1])
    section = argv[2].lower() if len(argv) == 3 else None
    if not path.is_file():
        print(f"[nav] not a file: {path}", file=sys.stderr)
        return 1

    nav = build_nav(section)
    html = path.read_text(encoding="utf-8", errors="ignore")

    # Remove any previous injection so we can refresh it idempotently.
    if MARK_OPEN in html and MARK_CLOSE in html:
        pre = html.split(MARK_OPEN)[0]
        post = html.split(MARK_CLOSE, 1)[1]
        html = pre + post

    lower = html.lower()
    if "<body" in lower:
        idx = lower.index("<body")
        idx = html.index(">", idx) + 1
        html = html[:idx] + "\n" + nav + "\n" + html[idx:]
    else:
        # No <body> tag — just prepend.
        html = nav + "\n" + html

    # Atomic write: some mounts block truncating an existing file, but allow
    # creating a new file + renaming over it. This also avoids corrupting the
    # file if writing is interrupted.
    fd, tmp = tempfile.mkstemp(dir=str(path.parent), suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            f.write(html)
        os.replace(tmp, path)
    except OSError:
        # Fallback: remove then rename (for mounts that reject replace-in-place).
        try:
            os.remove(path)
        except OSError:
            pass
        os.rename(tmp, path)
    print(f"[nav] injected into {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))

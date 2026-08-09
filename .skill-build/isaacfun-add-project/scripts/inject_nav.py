#!/usr/bin/env python3
"""Inject a small shared navbar into a project's index.html.

The project lives at projects/<slug>/index.html, so the main site is two
levels up. The injected bar links back to the site's pages and is wrapped
in a marker comment so re-running the skill won't duplicate it.

If a section is given (tools | concepts | ideas), a prominent
"<- Section" back button is added on the left so visitors can return to
the page the project came from in one click.

Usage:
  python3 inject_nav.py <project_index_html> [section]
"""
from __future__ import annotations

import os
import sys
import tempfile
from pathlib import Path

MARK_OPEN = "<!-- isaacfun-nav:start -->"
MARK_CLOSE = "<!-- isaacfun-nav:end -->"

SECTIONS = ("tools", "concepts", "ideas")


def build_nav(section: str | None = None) -> str:
    """A minimal typewriter text link fixed to the top-left of the page.

    No menu/drawer — just plain links back to the site, matching the main
    site's paper/monospace look. Self-contained inline styles.
    """
    _base = ("color:#141414;text-decoration:none;font-size:14px;")
    back = ""
    if section in SECTIONS:
        back = (f'<a href="../../index.html#/{section}" '
                f'style="{_base}" '
                f'onmouseover="this.style.textDecoration=\'underline\'" '
                f'onmouseout="this.style.textDecoration=\'none\'">&larr; {section}</a>')

    return f"""{MARK_OPEN}
<nav style="position:fixed;top:0;left:0;z-index:2147483000;display:flex;gap:16px;
align-items:center;padding:8px 12px;background:rgba(201,201,201,0.92);
border-right:1px solid #333;border-bottom:1px solid #333;
font-family:'Courier Prime','Courier New',Courier,monospace;">
  <a href="../../index.html" style="{_base}font-weight:700;"
     onmouseover="this.style.textDecoration='underline'"
     onmouseout="this.style.textDecoration='none'">isaacfun.xyz</a>
  {back}
</nav>
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

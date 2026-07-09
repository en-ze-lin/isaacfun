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

# Glassy navbar matching the main site (styles.css). Inline-styled so it
# does not depend on the project bringing in the site's stylesheet.
_LINK = ("color:#9aa6b4;text-decoration:none;font-size:13px;font-weight:500;"
         "letter-spacing:.4px;text-transform:uppercase;padding:9px 16px;"
         "border-radius:5px;")

# Prominent back-to-section button (orange, outlined).
_BACK = ("display:inline-flex;align-items:center;gap:7px;color:#ff6a1f;"
         "text-decoration:none;font-size:13px;font-weight:600;letter-spacing:.4px;"
         "text-transform:uppercase;padding:9px 15px;border-radius:5px;"
         "border:1px solid rgba(255,106,31,.45);background:rgba(255,106,31,.08);")

SECTIONS = ("tools", "concepts", "ideas")


def build_nav(section: str | None = None) -> str:
    back = ""
    if section in SECTIONS:
        label = section.capitalize()
        back = (f'\n    <a href="../../index.html#/{section}" style="{_BACK}">'
                f'&larr; {label}</a>')
    return f"""{MARK_OPEN}
<nav style="position:sticky;top:0;z-index:9999;height:66px;display:flex;
align-items:center;justify-content:space-between;
padding:0 clamp(20px,4vw,52px);
background:rgba(23,27,33,0.55);
-webkit-backdrop-filter:blur(16px) saturate(130%);
backdrop-filter:blur(16px) saturate(130%);
border-bottom:1px solid rgba(255,255,255,0.09);
font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <span style="display:flex;align-items:center;gap:14px;">
    <a href="../../index.html" style="display:flex;align-items:center;gap:11px;
       color:#f4f6f8;text-decoration:none;font-size:19px;font-weight:700;letter-spacing:.3px;">
      <span style="width:30px;height:30px;border-radius:5px;
        background:linear-gradient(140deg,#ff6a1f,#ff8f4d);
        box-shadow:0 2px 10px rgba(255,106,31,.35),inset 0 1px 0 rgba(255,255,255,.25);"></span>
      <span>isaacfun<span style="color:#ff6a1f;">.xyz</span></span>
    </a>{back}
  </span>
  <span style="display:flex;gap:4px;align-items:center;">
    <a href="../../index.html#/about"    style="{_LINK}">About</a>
    <a href="../../index.html#/tools"    style="{_LINK}">Tools</a>
    <a href="../../index.html#/concepts" style="{_LINK}">Concepts</a>
    <a href="../../index.html#/ideas"    style="{_LINK}">Ideas</a>
  </span>
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

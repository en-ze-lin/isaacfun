#!/usr/bin/env python3
"""Capture a square thumbnail (card logo) for an isaac.fun project.

Strategy:
  1. Try Playwright (headless Chromium) for a real screenshot of the page,
     cropped to a square so it sits nicely in the card's logo slot.
  2. Fall back to a themed SVG monogram (orange on dark slate) if Playwright
     or a browser binary isn't available.

The resulting image path is meant to go straight into projects.js as the
`image` field, which you can later change to any other image by hand.

Usage:
  python3 capture_thumbnail.py <project_index_html> <output_path_without_ext>

Prints the final image path (…/thumbnail.png or …/thumbnail.svg).
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

SIZE = 640  # square


def try_screenshot(html_path: Path, out_png: Path) -> bool:
    try:
        from playwright.sync_api import sync_playwright  # type: ignore
    except ImportError:
        return False
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            ctx = browser.new_context(viewport={"width": SIZE, "height": SIZE},
                                      device_scale_factor=2)
            page = ctx.new_page()
            page.goto(html_path.resolve().as_uri(), wait_until="networkidle", timeout=15000)
            page.screenshot(path=str(out_png),
                            clip={"x": 0, "y": 0, "width": SIZE, "height": SIZE})
            browser.close()
        return out_png.exists() and out_png.stat().st_size > 0
    except Exception as exc:  # pragma: no cover
        print(f"[capture] playwright failed: {exc}", file=sys.stderr)
        return False


def extract_title(html_path: Path) -> str:
    try:
        text = html_path.read_text(encoding="utf-8", errors="ignore")
    except OSError:
        return ""
    for pat in (r"<title[^>]*>(.*?)</title>", r"<h1[^>]*>(.*?)</h1>"):
        m = re.search(pat, text, re.I | re.S)
        if m:
            return re.sub(r"<[^>]+>|\s+", " ", m.group(1)).strip()
    return ""


def generate_svg(html_path: Path, out_svg: Path) -> None:
    """Themed monogram matching the site: black mark on light gray paper."""
    title = extract_title(html_path) or html_path.parent.name.replace("-", " ").title()
    initials = "".join(w[0] for w in title.split() if w)[:2].upper() or "·"
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {SIZE} {SIZE}">
  <rect width="{SIZE}" height="{SIZE}" fill="#ababab"/>
  <rect x="0" y="0" width="{SIZE}" height="{SIZE}" fill="none" stroke="#333" stroke-width="2"/>
  <text x="50%" y="50%" text-anchor="middle" dominant-baseline="central"
        fill="#141414" font-family="Courier Prime, Courier New, Courier, monospace"
        font-size="240" font-weight="700">{initials}</text>
</svg>
"""
    out_svg.write_text(svg, encoding="utf-8")


def main(argv: list[str]) -> int:
    if len(argv) != 3:
        print(__doc__, file=sys.stderr)
        return 2
    html_path, out_base = Path(argv[1]), Path(argv[2])
    if not html_path.is_file():
        print(f"[capture] not a file: {html_path}", file=sys.stderr)
        return 1
    out_base.parent.mkdir(parents=True, exist_ok=True)

    png = out_base.with_suffix(".png")
    if try_screenshot(html_path, png):
        print(str(png)); return 0

    svg = out_base.with_suffix(".svg")
    generate_svg(html_path, svg)
    print(str(svg)); return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))

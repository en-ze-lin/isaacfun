#!/usr/bin/env python3
"""Inject SEO metadata into the built (static) project pages under public/.

Reads content/site.json; for every project that has a `url`, adds to its
index.html (inside <head>, between marker comments, idempotent):
  description, canonical, Open Graph, Twitter card, JSON-LD (CreativeWork).
Tags the page already has are never duplicated. Off-site og:url / og:image
values (e.g. an old hosting domain) are rewritten to isaacfun.xyz.

Usage:  python3 tools/isaacfun-add-project/scripts/inject_meta.py [repo_root]
Re-run after every rebuild of a project (a Vite rebuild overwrites index.html).
"""
import html, json, os, re, sys

root = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else ".")
data = json.load(open(os.path.join(root, "content", "site.json")))
base = data["site"]["url"].rstrip("/")
START, END = "<!-- isaacfun:meta -->", "<!-- /isaacfun:meta -->"
esc = lambda s: html.escape(s, quote=True)
has = lambda src, pat: re.search(pat, src, re.I) is not None

def process(section, p):
    url = p.get("url")
    if not url or re.search(r"\.[a-z0-9]+$", url, re.I):
        return
    rel = url.strip("/")
    folder = os.path.join(root, "public", rel)
    if not os.path.exists(os.path.join(folder, "index.html")):
        print("missing", os.path.join(folder, "index.html")); return
    # every top-level .html page of the project (index.html + e.g. booking.html)
    for name in sorted(os.listdir(folder)):
        if name.endswith(".html"):
            process_page(p, rel, folder, name)

def process_page(p, rel, folder, name):
    path = os.path.join(folder, name)
    src = open(path, encoding="utf-8").read()
    src = re.sub(re.escape(START) + r".*?" + re.escape(END) + r"\n?", "", src, flags=re.S)
    canon = f"{base}/{rel}/" + ("" if name == "index.html" else name)
    local_img = os.path.join(root, "public", rel, "og.png")
    img = f"{base}/{rel}/og.png" if os.path.exists(local_img) else f"{base}/og.png"
    # rewrite off-site og:url / og:image
    src = re.sub(r'(<meta\s+property="og:url"\s+content=")[^"]*(")', rf"\g<1>{canon}\2", src, flags=re.I)
    src = re.sub(r'(<meta\s+property="og:image"\s+content=")[^"]*(")', rf"\g<1>{img}\2", src, flags=re.I)
    tm = re.search(r"<title>(.*?)</title>", src, re.S | re.I)
    title = html.unescape(tm.group(1).strip()) if tm else p["title"]
    dm = re.search(r'<meta\s+name="description"\s+content="([^"]*)"', src, re.I)
    desc = html.unescape(dm.group(1)) if (dm and name != "index.html") else p["description"]
    tags = []
    def add(pat, tag):
        if not has(src, pat): tags.append(tag)
    add(r'name="description"', f'<meta name="description" content="{esc(desc)}">')
    add(r'rel="canonical"', f'<link rel="canonical" href="{canon}">')
    add(r'property="og:title"', f'<meta property="og:title" content="{esc(title)}">')
    add(r'property="og:description"', f'<meta property="og:description" content="{esc(desc)}">')
    add(r'property="og:type"', '<meta property="og:type" content="website">')
    add(r'property="og:url"', f'<meta property="og:url" content="{canon}">')
    add(r'property="og:image"', f'<meta property="og:image" content="{img}">')
    add(r'property="og:site_name"', f'<meta property="og:site_name" content="{esc(data["site"]["name"])}">')
    add(r'name="twitter:card"', '<meta name="twitter:card" content="summary_large_image">')
    add(r'name="twitter:title"', f'<meta name="twitter:title" content="{esc(title)}">')
    add(r'name="twitter:description"', f'<meta name="twitter:description" content="{esc(desc)}">')
    add(r'name="twitter:image"', f'<meta name="twitter:image" content="{img}">')
    ld = {"@context": "https://schema.org", "@type": "CreativeWork" if name == "index.html" else "WebPage", "name": p["title"] if name == "index.html" else title,
          "description": desc, "url": canon, "image": img,
          "author": {"@type": "Person", "name": data["site"]["author"], "url": base + "/"},
          "isPartOf": {"@type": "WebSite", "name": data["site"]["name"], "url": base + "/"}}
    tags.append('<script type="application/ld+json">' + json.dumps(ld, ensure_ascii=False).replace("<", "\\u003c") + "</script>")
    block = START + "\n" + "\n".join(tags) + "\n" + END + "\n"
    # Client-rendered apps (Vite/React): give the empty root real text so
    # crawlers and AI fetchers that don't run JS still see what the page is.
    # React replaces it on mount; it is visually hidden meanwhile.
    FB = re.compile(r'(<div id="root">)(?:<!-- isaacfun:fallback -->.*?<!-- /isaacfun:fallback -->)?(</div>)', re.S)
    if name == "index.html" and re.search(r'<div id="root">(?:\s*|<!-- isaacfun:fallback -->.*?<!-- /isaacfun:fallback -->)</div>', src, re.S):
        fb = ('<!-- isaacfun:fallback --><div style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap">'
              f'<h1>{esc(p["title"])}</h1><p>{esc(desc)}</p><p><a href="/">{esc(data["site"]["name"])}</a></p></div><!-- /isaacfun:fallback -->')
        src = re.sub(r'<div id="root">.*?</div>(?=\s*(?:<script|</body|<!--|$))', lambda m: '<div id="root">' + fb + '</div>', src, count=1, flags=re.S)
    if "</head>" in src:
        src = src.replace("</head>", block + "</head>", 1)
    else:
        print("no </head>", path); return
    open(path, "w", encoding="utf-8").write(src)
    print("meta ok:", rel + "/" + name, f"({len(tags)} tags)")

for section, items in (data.get("sections") or {}).items():
    for p in items:
        process(section, p)

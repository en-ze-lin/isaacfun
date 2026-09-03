#!/usr/bin/env python3
"""
serve.py — local preview server that matches Vercel's routing.

Plain `python3 -m http.server` doesn't know about the SPA fallback in
vercel.json: a direct visit to a clean path like /imagine has no real
file behind it (the page is rendered by app.js), so the stock server
shows a 404 or a directory listing instead of the site. This server
does what Vercel's `rewrites` rule does: serve a real file/asset when
one exists at that path, otherwise serve index.html so app.js's own
router can take over.

Usage:
    python3 serve.py            # serves the current directory on :8000
    python3 serve.py 5000       # ...or a different port
"""
import sys
import os
from http.server import SimpleHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse, unquote

ROOT = os.path.dirname(os.path.abspath(__file__))


class SPAHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        path = unquote(urlparse(self.path).path)
        fs_path = os.path.join(ROOT, path.lstrip("/"))
        # Serve real files and real directories (that contain their own
        # index.html) exactly as-is. Everything else — /imagine, /use,
        # /enjoy/some-stub, a hard refresh on any clean URL — falls back
        # to index.html, same as the vercel.json rewrite in production.
        if os.path.isfile(fs_path):
            return super().do_GET()
        if os.path.isdir(fs_path) and os.path.isfile(os.path.join(fs_path, "index.html")):
            return super().do_GET()
        self.path = "/index.html"
        return super().do_GET()

    def log_message(self, fmt, *args):
        print(f"  {self.address_string()} - {fmt % args}")


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    os.chdir(ROOT)
    httpd = HTTPServer(("localhost", port), SPAHandler)
    print(f"Serving {ROOT}")
    print(f"-> http://localhost:{port}/  (Ctrl+C to stop)")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nstopped")

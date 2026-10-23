#!/usr/bin/env node
// Tiny zero-dependency static server for the built site (./out), mimicking how
// Vercel serves it: directory index.html files, trailing-slash redirects, and
// 404.html with a real 404 status. Usage: npm run build && npm run preview
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";

const root = resolve(process.argv[2] || "out");
const port = Number(process.env.PORT || process.argv[3] || 3000);
const types = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".json": "application/json", ".txt": "text/plain; charset=utf-8", ".xml": "application/xml", ".svg": "image/svg+xml",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".avif": "image/avif",
  ".ico": "image/x-icon", ".woff": "font/woff", ".woff2": "font/woff2", ".webmanifest": "application/manifest+json",
};

async function exists(p) {
  try { return await stat(p); } catch { return null; }
}

createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  let pathname = decodeURIComponent(url.pathname);
  const safe = normalize(join(root, pathname));
  if (!safe.startsWith(root)) { res.writeHead(403).end("Forbidden"); return; }

  let file = safe;
  const info = await exists(file);
  if (info?.isDirectory()) {
    if (!pathname.endsWith("/")) { res.writeHead(308, { Location: pathname + "/" + url.search }).end(); return; }
    file = join(file, "index.html");
  }
  let status = 200;
  if (!(await exists(file))) { file = join(root, "404.html"); status = 404; }

  try {
    const body = await readFile(file);
    res.writeHead(status, { "Content-Type": types[extname(file)] || "application/octet-stream" }).end(body);
  } catch {
    res.writeHead(404).end("Not found");
  }
}).listen(port, () => console.log(`Serving ${root} at http://localhost:${port}`));

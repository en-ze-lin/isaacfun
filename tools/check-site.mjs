#!/usr/bin/env node
// Post-build audit of ./out — looks at the site the way a crawler (no JavaScript) does.
// Usage: npm run build && npm run check
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const OUT = "out";
const SITE = "https://isaacfun.xyz";
const problems = [];
const warnings = [];
const fail = (msg) => problems.push(msg);
const warn = (msg) => warnings.push(msg);

if (!existsSync(OUT)) { console.error("No ./out folder — run `npm run build` first."); process.exit(1); }

const walk = (dir) => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  return statSync(p).isDirectory() ? walk(p) : [p];
});
const files = walk(OUT);
const pages = files.filter((f) => f.endsWith(".html") && f !== join(OUT, "404.html") && !f.includes("/_next/") && !f.startsWith(join(OUT, "404/")) && !f.startsWith(join(OUT, "_not-found/")));

const pathOf = (file) => "/" + relative(OUT, file).replace(/index\.html$/, "");
const fileFor = (urlPath) => {
  const clean = decodeURIComponent(urlPath.split("#")[0].split("?")[0]);
  const direct = join(OUT, clean);
  if (existsSync(direct) && statSync(direct).isFile()) return direct;
  const idx = join(OUT, clean, "index.html");
  return existsSync(idx) ? idx : null;
};
const attr = (html, re) => (html.match(re) || [])[1];
const text = (html) => html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

let checked = 0;
for (const file of pages) {
  const html = readFileSync(file, "utf8");
  const where = pathOf(file);
  checked++;

  const title = attr(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!title || title.trim().length < 3) fail(`${where}: missing <title>`);
  const desc = attr(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) ?? attr(html, /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i);
  if (!desc) fail(`${where}: missing meta description`);
  else if (desc.length > 200) warn(`${where}: description is ${desc.length} chars (aim for under ~160)`);
  const canonical = attr(html, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["']/i);
  if (!canonical) fail(`${where}: missing canonical link`);
  else if (!canonical.startsWith(SITE)) fail(`${where}: canonical points off-site (${canonical})`);
  else if (canonical !== SITE + where) warn(`${where}: canonical is ${canonical}`);
  if (!/<meta[^>]+name=["']viewport["']/i.test(html)) fail(`${where}: missing viewport meta`);
  if (!/property=["']og:title["']/i.test(html)) fail(`${where}: missing Open Graph tags`);
  if (/property=["']og:(url|image)["'][^>]+content=["']https?:\/\/(?!isaacfun\.xyz)/i.test(html)) fail(`${where}: Open Graph URL/image points at another site`);
  if (text(html).length < 20) fail(`${where}: page has almost no text without JavaScript`);

  // Only generated pages (not the hand-built project pages) must follow the h1 rule.
  const generated = html.includes("/_next/");
  if (generated && (html.match(/<h1[\s>]/g) || []).length !== 1) fail(`${where}: expected exactly one <h1>`);

  for (const block of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { JSON.parse(block[1]); } catch { fail(`${where}: invalid JSON-LD`); }
  }

  for (const m of html.matchAll(/(?:href|src)=["'](\/[^"'#?][^"']*|\/)["']/g)) {
    const target = m[1];
    if (target.startsWith("//") || target.startsWith("/_next/")) continue;
    if (!fileFor(target)) fail(`${where}: broken link/asset → ${target}`);
  }
}

// Sitemap ↔ files
const sitemap = existsSync(join(OUT, "sitemap.xml")) ? readFileSync(join(OUT, "sitemap.xml"), "utf8") : "";
if (!sitemap) fail("sitemap.xml missing");
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
for (const u of urls) {
  if (!u.startsWith(SITE)) { fail(`sitemap: ${u} is not on ${SITE}`); continue; }
  if (!fileFor(u.slice(SITE.length) || "/")) fail(`sitemap: ${u} has no built page`);
}
for (const f of pages) {
  const p = SITE + pathOf(f);
  if (!urls.includes(p) && generatedPage(f)) warn(`not in sitemap: ${p}`);
}
function generatedPage(f) { return readFileSync(f, "utf8").includes("/_next/"); }

// robots / llms / 404 / icons
const robots = existsSync(join(OUT, "robots.txt")) ? readFileSync(join(OUT, "robots.txt"), "utf8") : "";
if (!/Sitemap:\s*https:\/\/isaacfun\.xyz\/sitemap\.xml/i.test(robots)) fail("robots.txt must point at the sitemap");
if (/Disallow:\s*\/\s*$/m.test(robots)) fail("robots.txt blocks the whole site");
for (const bot of ["GPTBot", "ClaudeBot", "PerplexityBot", "Googlebot", "Bingbot", "Google-Extended"]) {
  if (!new RegExp(`User-Agent:\\s*${bot}\\b`, "i").test(robots)) fail(`robots.txt does not mention ${bot}`);
}
for (const f of ["llms.txt", "llms-full.txt", "404.html", "favicon.ico", "favicon.png", "og.png", "manifest.webmanifest"]) {
  if (!existsSync(join(OUT, f))) fail(`missing ${f}`);
}

console.log(`Checked ${checked} pages, ${urls.length} sitemap URLs.`);
for (const w of warnings) console.log("  warn:", w);
if (problems.length) {
  console.log(`\n${problems.length} problem(s):`);
  for (const p of problems) console.log("  FAIL:", p);
  process.exit(1);
}
console.log("All checks passed.");

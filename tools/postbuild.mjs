#!/usr/bin/env node
// Runs after `next build`. Removes the throwaway "__none" stub page that
// generateStaticParams emits when a site has no placeholder projects.
import { readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";

const out = "out";
let removed = 0;
for (const section of readdirSync(out)) {
  const dir = join(out, section);
  if (!statSync(dir).isDirectory()) continue;
  const stray = join(dir, "__none");
  try {
    rmSync(stray, { recursive: true, force: true });
    removed++;
  } catch {}
  for (const f of readdirSync(dir)) {
    if (f.includes("__none")) rmSync(join(dir, f), { recursive: true, force: true });
  }
}
console.log(`postbuild: cleaned ${out}/ (${removed} section folders checked)`);

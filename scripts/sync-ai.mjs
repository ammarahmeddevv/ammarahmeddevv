/**
 * Counts real Claude Code usage from local session transcripts and writes the
 * result into data/ai-usage.json.
 *
 *   npm run sync:ai
 *
 * Why this exists: the alternative was typing plausible-looking numbers into a
 * JSON file, which is the thing this profile is explicitly not going to do.
 * Claude Code writes a transcript per session under ~/.claude/projects. Those
 * are Ammar's own files on his own machine, so counting them is measurement,
 * not scraping — there is no private account page involved and no API invented
 * for the purpose.
 *
 * What it deliberately does NOT record:
 *   - money. A Pro subscription has no per-session spend, so any figure would
 *     be fiction.
 *   - token counts. Countable, but vanity — they describe nothing about how
 *     the work was done.
 *
 * Scope is one workstation and only the history still on disk. That caveat is
 * written into the output and rendered on the profile, because a number without
 * its scope is a half-truth.
 *
 * This runs locally only. CI has no access to a home directory and must never
 * pretend otherwise — the workflow rebuilds from whatever was committed here.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = path.join(root, "data", "ai-usage.json");
const base = path.join(os.homedir(), ".claude", "projects");

if (!fs.existsSync(base)) {
  console.error(`no Claude Code history at ${base} — nothing measured, file left unchanged`);
  process.exit(1);
}

const days = new Set();
const models = new Map();
const projectDirs = new Set();
let sessions = 0;
let first = null;
let last = null;

for (const dir of fs.readdirSync(base, { withFileTypes: true })) {
  if (!dir.isDirectory()) continue;
  const dirPath = path.join(base, dir.name);
  let dirCounted = false;

  for (const file of fs.readdirSync(dirPath)) {
    if (!file.endsWith(".jsonl")) continue;
    let raw;
    try {
      raw = fs.readFileSync(path.join(dirPath, file), "utf8");
    } catch {
      continue;
    }

    // Regex rather than JSON.parse per line: transcripts are large, and a
    // single truncated final line should not throw away a whole session.
    const stamps = [...raw.matchAll(/"timestamp":"(\d{4}-\d{2}-\d{2})T[^"]*"/g)].map((m) => m[1]);
    if (!stamps.length) continue;

    sessions++;
    dirCounted = true;
    for (const d of stamps) {
      days.add(d);
      if (!first || d < first) first = d;
      if (!last || d > last) last = d;
    }

    for (const m of raw.matchAll(/"model":"(claude[^"]*)"/g)) {
      const name = m[1];
      models.set(name, (models.get(name) || 0) + 1);
    }
  }
  if (dirCounted) projectDirs.add(dir.name);
}

const totalCalls = [...models.values()].reduce((a, b) => a + b, 0);
const modelMix = [...models.entries()]
  .sort((a, b) => b[1] - a[1])
  .map(([model, n]) => ({
    model,
    share: totalCalls ? Math.round((n / totalCalls) * 1000) / 10 : 0,
  }))
  .filter((m) => m.share >= 0.5);

const data = JSON.parse(fs.readFileSync(target, "utf8"));
data.measured = {
  ...data.measured,
  measuredAt: new Date().toISOString(),
  firstSession: first,
  lastSession: last,
  sessions,
  activeDays: days.size,
  projects: projectDirs.size,
  modelMix,
};

fs.writeFileSync(target, JSON.stringify(data, null, 2) + "\n");

console.log(`\nmeasured from ${base}\n`);
console.log(`  sessions      ${sessions}`);
console.log(`  active days   ${days.size}`);
console.log(`  projects      ${projectDirs.size}`);
console.log(`  window        ${first} → ${last}`);
for (const m of modelMix) console.log(`  ${m.model.padEnd(28)} ${m.share}%`);
console.log(`\nwritten to data/ai-usage.json — run \`npm run build\` to render it\n`);

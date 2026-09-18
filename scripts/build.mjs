/**
 * Renders every asset and the README itself from data/*.json.
 *
 * The split is deliberate: SVG panels carry the brand moments and only large
 * type; everything dense — project copy, tables, links — is real Markdown, so
 * it reflows on a phone, stays selectable, and keeps working links.
 *
 *   npm run build
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { themes, W, PAD, MIN_TYPE, text, measure, rule, vrule, dot, ring, tick, frame, doc, fit, resetGlyphs } from "./design.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => JSON.parse(fs.readFileSync(path.join(root, "data", f), "utf8"));

const P = read("profile.json");
const { projects } = read("projects.json");
const AI = read("ai-usage.json");
const GH = fs.existsSync(path.join(root, "data", "github.json")) ? read("github.json") : null;

const INNER = W - PAD * 2;

/* ============================================================ panel: hero */

function hero(t) {
  resetGlyphs();
  const H = 286;
  const name = P.identity.name.toUpperCase();
  const role = P.identity.role.toUpperCase();
  const place = P.identity.locationShort.toUpperCase();

  fit("hero/name", measure("display", name, 92, 2), INNER);
  fit("hero/role", measure("mono", role, 26, 4) + measure("mono", place, 24, 2) + 60, INNER);

  return doc(W, H, `${P.identity.name} — ${P.identity.role}, ${P.identity.location}`,
    frame(W, H, t) +
    tick(PAD, 46, t) +
    text("display", name, { x: PAD, y: 158, size: 92, tracking: 2, fill: t.text }) +
    rule(PAD, 196, W - PAD, t.line) +
    text("mono", role, { x: PAD, y: 234, size: 26, tracking: 4, fill: t.accent }) +
    text("mono", place, { x: W - PAD, y: 234, size: 24, tracking: 2, fill: t.meta, anchor: "end" })
  );
}

/* ======================================================== panel: snapshot */
/* The system readout and the years that produced it, as one dossier block.  */

function snapshot(t) {
  resetGlyphs();
  const rows = P.snapshot.rows;
  const years = P.trajectory.entries;

  const ROW = 56;
  const KEY_X = PAD;
  const VAL_X = PAD + 178;

  let y = 58;
  let s = "";

  // — section: system
  s += tick(PAD, y - 20, t);
  s += text("mono", "SYSTEM", { x: PAD + 18, y, size: 24, tracking: 6, fill: t.meta });
  y += 30;

  for (const row of rows) {
    s += rule(PAD, y, W - PAD, t.lineSoft);
    const base = y + 36;
    s += text("mono", row.key, { x: KEY_X, y: base, size: 24, tracking: 3, fill: t.meta });
    fit(`snapshot/${row.key}`, measure("mono", row.value, 27, 0), W - PAD - VAL_X - 40);
    s += text("mono", row.value, { x: VAL_X, y: base, size: 27, tracking: 0, fill: t.text });
    if (row.led) s += dot(W - PAD - 7, base - 9, 5, t.accent);
    y += ROW;
  }
  s += rule(PAD, y, W - PAD, t.line);

  // — section: trajectory
  y += 56;
  s += tick(PAD, y - 20, t);
  s += text("mono", "TRAJECTORY", { x: PAD + 18, y, size: 24, tracking: 6, fill: t.meta });
  y += 34;

  const AXIS = PAD + 6;
  const EVENT_X = PAD + 132;
  const yearTop = y;
  for (const e of years) {
    const base = y + 30;
    s += dot(AXIS, base - 9, 3.5, t.accent);
    s += text("mono", e.year, { x: PAD + 30, y: base, size: 27, tracking: 1, fill: t.accent });
    fit(`trajectory/${e.year}`, measure("mono", e.event, 25, 0), W - PAD - EVENT_X);
    s += text("mono", e.event, { x: EVENT_X, y: base, size: 25, tracking: 0, fill: t.soft });
    y += 52;
  }
  const spine = vrule(AXIS, yearTop + 21, y - 31, t.line);

  const H = y + 24;
  return doc(W, H, `System snapshot and trajectory for ${P.identity.name}`,
    frame(W, H, t) + spine + s
  );
}

/* ======================================================= panel: workbench */

function workbench(t) {
  resetGlyphs();
  const stages = AI.workflow.stages;
  const m = AI.measured;
  const hasMetrics = Boolean(m && m.measuredAt);

  const ROW = 70;
  const AXIS = PAD + 14;
  const LABEL_X = PAD + 46;
  const NOTE_X = PAD + 334;   // clears "Implementation", the longest stage label

  let y = 58;
  let s = "";

  s += tick(PAD, y - 20, t);
  s += text("mono", "AI WORKBENCH", { x: PAD + 18, y, size: 24, tracking: 6, fill: t.meta });
  y += 34;
  s += text("mono", "Where a model sits in the loop — and where it does not.", {
    x: PAD, y: y + 20, size: 24, tracking: 0, fill: t.meta,
  });
  y += 58;

  const top = y + 24;
  for (const st of stages) {
    const base = y + 34;
    const cy = base - 9;
    const owned = st.owner === "human";

    // hollow node = Ammar decides it; filled node = a model drafts it
    s += owned ? ring(AXIS, cy, 6, t.accent) : dot(AXIS, cy, 6, t.accentSoft);

    s += text("mono", st.label, { x: LABEL_X, y: base, size: 28, tracking: 0, fill: t.text });
    fit(`workbench/${st.id}`, measure("mono", st.note, 23, 0), W - PAD - NOTE_X - 60);
    s += text("mono", st.note, { x: NOTE_X, y: base, size: 23, tracking: 0, fill: t.meta });
    s += text("mono", owned ? "ME" : "AI", {
      x: W - PAD, y: base, size: 23, tracking: 2, fill: owned ? t.accent : t.meta, anchor: "end",
    });
    y += ROW;
  }
  const spine = vrule(AXIS, top, y - 45, t.line);

  // legend — the node shapes mean something, so say what
  y += 4;
  s += rule(PAD, y, W - PAD, t.lineSoft);
  const lb = y + 34;
  s += ring(PAD + 7, lb - 9, 6, t.accent);
  s += text("mono", "I decide", { x: PAD + 24, y: lb, size: 23, tracking: 0, fill: t.meta });
  s += dot(PAD + 208, lb - 9, 6, t.accentSoft);
  s += text("mono", "drafted, then reviewed", { x: PAD + 225, y: lb, size: 23, tracking: 0, fill: t.meta });
  y += 50;

  // — measured strip, only when npm run sync:ai has actually counted something.
  // Session counts, not spend: a subscription has no honest per-session cost,
  // so nothing here is denominated in dollars or tokens — only what was
  // literally counted from local transcripts.
  if (hasMetrics) {
    const ramp = [t.accent, t.accentSoft, t.soft, t.meta, t.line];
    const window = m.firstSession && m.lastSession
      ? `${m.firstSession.slice(5)} → ${m.lastSession.slice(5)}`
      : "";

    y += 6;
    s += rule(PAD, y, W - PAD, t.line);
    const cells = [
      ["SESSIONS", String(m.sessions)],
      ["ACTIVE DAYS", String(m.activeDays)],
      ["PROJECTS", String(m.projects)],
      ["WINDOW", window],
    ].filter((c) => c[1] && c[1] !== "null");

    const colW = INNER / cells.length;
    cells.forEach(([label, value], i) => {
      const cx = PAD + colW * i;
      if (i > 0) s += vrule(cx - 1, y + 16, y + 74, t.lineSoft);
      s += text("mono", label, { x: cx + (i ? 24 : 0), y: y + 40, size: 21, tracking: 3, fill: t.meta });
      s += text("mono", value, { x: cx + (i ? 24 : 0), y: y + 74, size: 30, tracking: 0, fill: t.text });
    });
    y += 112;

    // — model mix, drawn exactly like the GitHub language bar so the two
    // "measured elsewhere in this profile" panels read as one family.
    if (m.modelMix?.length) {
      s += rule(PAD, y, W - PAD, t.lineSoft);
      y += 34;
      s += text("mono", "MODEL MIX", { x: PAD, y, size: 21, tracking: 3, fill: t.meta });
      y += 26;

      const BAR = 14;
      let x = PAD;
      const mix = m.modelMix;
      mix.forEach((mm, i) => {
        const w = (mm.share / 100) * INNER;
        const seg = Math.max(1, Math.round((w - (i < mix.length - 1 ? 2 : 0)) * 100) / 100);
        s += `<rect x="${Math.round(x * 100) / 100}" y="${y}" width="${seg}" height="${BAR}" fill="${ramp[i] || t.lineSoft}"/>`;
        x += w;
      });
      y += BAR + 34;

      let lx = PAD;
      for (let i = 0; i < mix.length; i++) {
        const label = `${mix[i].model.replace(/^claude-/, "")} ${mix[i].share}%`;
        const w = 14 + 10 + measure("mono", label, 23, 0);
        if (lx > PAD && lx + w > W - PAD) { lx = PAD; y += 38; }
        s += `<rect x="${lx}" y="${y - 12}" width="11" height="11" fill="${ramp[i] || t.lineSoft}"/>`;
        s += text("mono", label, { x: lx + 21, y, size: 23, tracking: 0, fill: t.soft });
        lx += w + 26;
      }
      y += 30;
    }

    s += text("mono", m.scope, { x: PAD, y: y + 14, size: 21, tracking: 0, fill: t.meta, opacity: 0.85 });
    y += 26;
  }

  const H = y + 30;
  return doc(W, H, "AI workbench: where a model assists and where Ammar decides",
    frame(W, H, t) + spine + s
  );
}

/* ========================================================== panel: github */

/**
 * Language distribution by bytes across the public repositories, plus what is
 * actually there. Written by `npm run sync:github`; the panel is skipped
 * entirely if that has never run, rather than drawn with placeholder data.
 */
function github(t) {
  resetGlyphs();
  const g = GH;
  const langs = g.languages.slice(0, 6);
  const total = langs.reduce((a, l) => a + l.share, 0) || 1;

  // The accent carries the dominant language; the rest step down through the
  // neutral ramp. Six colours would be a chart; four is a palette.
  const ramp = [t.accent, t.accentSoft, t.soft, t.meta, t.line, t.lineSoft];

  let y = 58;
  let s = "";

  s += tick(PAD, y - 20, t);
  s += text("mono", "GITHUB", { x: PAD + 18, y, size: 24, tracking: 6, fill: t.meta });
  y += 42;

  // — stacked bar
  const BAR = 16;
  let x = PAD;
  langs.forEach((l, i) => {
    const w = (l.share / total) * INNER;
    // 1px gaps keep the segments legible without a stroke that would eat the
    // smallest ones entirely.
    s += `<rect x="${Math.round(x * 100) / 100}" y="${y}" width="${Math.max(1, Math.round((w - (i < langs.length - 1 ? 2 : 0)) * 100) / 100)}" height="${BAR}" fill="${ramp[i] || t.lineSoft}"/>`;
    x += w;
  });
  y += BAR + 40;

  // — legend, wrapped so a new language never pushes the row off the panel
  let lx = PAD;
  for (let i = 0; i < langs.length; i++) {
    const l = langs[i];
    const label = `${l.name} ${l.share}%`;
    const w = 14 + 10 + measure("mono", label, 24, 0);
    if (lx > PAD && lx + w > W - PAD) {
      lx = PAD;
      y += 40;
    }
    s += `<rect x="${lx}" y="${y - 12}" width="11" height="11" fill="${ramp[i] || t.lineSoft}"/>`;
    s += text("mono", label, { x: lx + 21, y, size: 24, tracking: 0, fill: t.soft });
    lx += w + 26;
  }
  y += 34;

  // — readout
  s += rule(PAD, y, W - PAD, t.line);
  const kb = g.languages.reduce((a, l) => a + l.bytes, 0) / 1024;
  const cells = [
    ["REPOSITORIES", String(g.repoCount)],
    ["SOURCE", `${Math.round(kb)} kB`],
    ["LAST PUSH", String(g.lastPush || "").slice(0, 10)],
  ];
  const colW = INNER / cells.length;
  cells.forEach(([label, value], i) => {
    const cx = PAD + colW * i;
    if (i > 0) s += vrule(cx - 1, y + 18, y + 78, t.lineSoft);
    const ox = cx + (i ? 24 : 0);
    s += text("mono", label, { x: ox, y: y + 44, size: 24, tracking: 3, fill: t.meta });
    s += text("mono", value, { x: ox, y: y + 78, size: 30, tracking: 0, fill: t.text });
  });
  y += 96;

  const H = y + 12;
  return doc(W, H, `Public GitHub activity for ${g.user}: ${g.repoCount} repositories, ${langs.map((l) => `${l.name} ${l.share}%`).join(", ")}`,
    frame(W, H, t) + s
  );
}

/* ================================================================ README */

const L = P.links;

/**
 * Stack lists render as plain text, not a row of backtick-code pills. Six
 * pills stacked edge to edge under every project read as a badge wall — the
 * exact thing this profile is supposed to not be. A quiet comma-dot list
 * carries the same information without turning into a wall of boxes.
 */
const stackLine = (items) => items.join(" · ");

/**
 * GitHub's math extension treats a `$ … $` pair as TeX, which would quietly eat
 * a currency figure. Escaping is cheaper than discovering that on a live table.
 */
const md = (s) => String(s).replace(/\$/g, "\\$");

/** Only render a link that actually resolves. A dead link costs more than a missing one. */
function linkRow(pairs) {
  return pairs.filter(([, href]) => href).map(([label, href]) => `[${label}](${href})`).join("  ·  ");
}

function picture(base, alt) {
  return [
    "<picture>",
    `  <source media="(prefers-color-scheme: dark)" srcset="assets/${base}-dark.svg">`,
    `  <img alt="${alt}" src="assets/${base}-light.svg">`,
    "</picture>",
  ].join("\n");
}

function projectBlock(p) {
  const out = [];
  out.push(`### ${p.name}`);
  out.push("");
  out.push(`${p.kind} · ${p.year} · ${p.status}`);
  out.push("");
  out.push(p.summary);
  out.push("");
  if (p.highlights?.length) {
    for (const h of p.highlights) out.push(`- ${h}`);
    out.push("");
  }
  if (p.metrics) {
    const m = p.metrics;
    out.push(`| ${m.head.join(" | ")} |`);
    out.push(`| ${m.head.map((_, i) => (i ? "---:" : "---")).join(" | ")} |`);
    for (const r of m.rows) out.push(`| ${r.map(md).join(" | ")} |`);
    out.push("");
    out.push(`<sub>${m.caption} ${m.note}</sub>`);
    out.push("");
  }
  // Stack and links share one paragraph (a soft break, not a blank line)
  // so they read as a single closing line under the card instead of two
  // more stacked blocks each claiming their own margin.
  const links = linkRow([["Live ↗", p.live], ["Source ↗", p.source]]);
  const closer = links || (p.access ? `<sub>${p.access}</sub>` : "");
  out.push(closer ? `${stackLine(p.stack)}  ` : stackLine(p.stack));
  if (closer) out.push(closer);
  out.push("");
  return out.join("\n");
}

/**
 * GitHub draws a border under every `##` heading automatically. A manual
 * `---` placed right before one stacks a second rule on top of the first —
 * that was the single biggest source of visual clutter in the previous
 * version (9 rules against 7 headings). A divider only earns its place
 * where it separates two blocks that *neither* have their own heading.
 */
function heading(o, text) {
  o.push(`## ${text}`);
  o.push("");
}

function readme() {
  const o = [];
  const id = P.identity;

  o.push(picture("hero", `${id.name} — ${id.role}, ${id.location}`));
  o.push("");
  o.push(id.statement);
  o.push("");
  o.push(linkRow([
    [L.dashboard ? "**Live Dashboard ↗**" : null, L.dashboard],
    ["GitHub", L.github], ["Portfolio", L.portfolio],
    ["LinkedIn", L.linkedin], [`${L.email}`, `mailto:${L.email}`],
  ]));
  o.push("");
  o.push("---"); // hero → snapshot: neither side owns a heading border, so this earns its keep
  o.push("");

  o.push(picture("snapshot", "System snapshot and trajectory"));
  o.push("");

  // recognition — one line, issuer named, no badge
  const rec = P.recognition;
  o.push(`**${rec.title}** · ${rec.issuer} · ${rec.period}  `);
  o.push(md(rec.facts.join(" · ")));
  o.push("");

  heading(o, "Selected work");
  for (const p of projects.filter((p) => p.tier === "selected")) o.push(projectBlock(p));

  const also = projects.filter((p) => p.tier === "also");
  if (also.length) {
    o.push("### Also public");
    o.push("");
    for (const p of also) {
      const links = linkRow([["Live ↗", p.live], ["Source ↗", p.source]]);
      o.push(`**${p.name}** — ${p.summary}  `);
      o.push(`${stackLine(p.stack)}${links ? "  ·  " + links : ""}`);
      o.push("");
    }
  }

  heading(o, "Stack");
  o.push("| | |");
  o.push("|---|---|");
  for (const g of P.stack.groups) o.push(`| **${g.label}** | ${stackLine(g.items)} |`);
  o.push("");

  heading(o, "AI workbench");
  o.push(picture("workbench", "Where AI assists in the engineering loop and where it does not"));
  o.push("");
  const measured = AI.measured?.measuredAt;
  o.push(
    measured
      ? `<sub>Counted from local Claude Code session transcripts, last measured ${String(measured).slice(0, 10)}. ${AI.measured.scope} No token counts or spend — a subscription has no honest per-session cost, so nothing here is denominated in either.</sub>`
      : "<sub>No usage figures are shown here because none have been measured yet. They appear only when `npm run sync:ai` counts them from real local session data — never estimated, never filled in by hand.</sub>"
  );
  o.push("");

  if (GH) {
    heading(o, "GitHub");
    o.push(picture("github", `Public GitHub activity: ${GH.repoCount} repositories, mostly ${GH.languages[0]?.name}`));
    o.push("");
    o.push(`<sub>Measured in bytes across public repositories on ${GH.fetchedAt.slice(0, 10)}, not self-reported. Regenerated by \`npm run sync:github\`.</sub>`);
    o.push("");
  }

  heading(o, "Currently");
  const cur = P.current;
  const currentCols = [["Now", cur.now], ["Next", cur.next], ["Exploring", cur.exploring]].filter(([, i]) => i?.length);
  for (const [label, items] of currentCols) {
    o.push(`**${label}**  `);
    o.push(items.map((i) => `${i}`).join("  \n"));
    o.push("");
  }

  heading(o, "How I work");
  for (const pr of P.philosophy.principles) {
    o.push(`**${pr.claim}**  `);
    o.push(`<sub>${pr.evidence}</sub> — ${pr.detail}`);
    o.push("");
  }

  heading(o, "Toolchain");
  o.push("| | |");
  o.push("|---|---|");
  for (const r of P.toolchain.rows) o.push(`| **${r.key}** | ${r.value} |`);
  o.push("");
  o.push("---"); // toolchain → footer: footer has no heading either, so this one earns its keep
  o.push("");

  o.push(`**${id.name}** · ${id.location} · ${id.timezone}  `);
  o.push(linkRow([
    ["Live Dashboard", L.dashboard],
    ["GitHub", L.github], ["Portfolio", L.portfolio],
    ["LinkedIn", L.linkedin], [L.email, `mailto:${L.email}`],
  ]));
  o.push("");
  o.push("<sub>Built from `data/*.json` — every figure on this page traces to a repository, a run log, or a programme record.</sub>");
  o.push("");

  return o.join("\n").replace(/\n{4,}/g, "\n\n\n");
}

/* ================================================================== main */

const out = (rel, body) => {
  const f = path.join(root, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, body);
  console.log(`  ${rel.padEnd(30)} ${(Buffer.byteLength(body) / 1024).toFixed(1)} kB`);
};

console.log("\nbuilding profile\n");
for (const key of ["dark", "light"]) {
  const t = themes[key];
  out(`assets/hero-${key}.svg`, hero(t));
  out(`assets/snapshot-${key}.svg`, snapshot(t));
  out(`assets/workbench-${key}.svg`, workbench(t));
  if (GH) out(`assets/github-${key}.svg`, github(t));
}
out("README.md", readme());
console.log(`\nminimum type size in panels: ${MIN_TYPE}px source — legible to ~${Math.round(MIN_TYPE * 0.42)}px on a phone\n`);

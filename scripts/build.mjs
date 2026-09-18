/**
 * Renders README.md from data/*.json — plain GitHub-flavoured markdown, no
 * embedded images. An earlier version drew the identity/trajectory/AI/GitHub
 * sections as custom SVG panels; that added real complexity (a font-outlining
 * engine, a glyph cache, a WCAG contrast checker) for a result that read as
 * busy rather than clean. Tables and short lines of text do the same job
 * with nothing to render, cache, or theme-check.
 *
 *   npm run build
 *
 * GitHub still draws its own bottom-border under every `## heading` — see
 * the `heading()` helper below. A manual `---` only appears where neither
 * side of it owns a heading of its own.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => JSON.parse(fs.readFileSync(path.join(root, "data", f), "utf8"));

const P = read("profile.json");
const { projects } = read("projects.json");
const AI = read("ai-usage.json");
const GH = fs.existsSync(path.join(root, "data", "github.json")) ? read("github.json") : null;

const L = P.links;

/** Stack tags as a plain dot-separated line — not a wall of backtick pills. */
const stackLine = (items) => items.join(" · ");

/**
 * GitHub's math extension treats a `$ … $` pair as TeX, which would quietly
 * eat a currency figure. Escaping is cheaper than discovering that live.
 */
const md = (s) => String(s).replace(/\$/g, "\\$");

/** Only render a link that actually resolves. A dead link costs more than a missing one. */
function linkRow(pairs) {
  return pairs.filter(([, href]) => href).map(([label, href]) => `[${label}](${href})`).join("  ·  ");
}

function table(rows) {
  const out = ["| | |", "|---|---|"];
  for (const [k, v] of rows) out.push(`| **${k}** | ${v} |`);
  return out.join("\n");
}

function heading(o, text) {
  o.push(`## ${text}`);
  o.push("");
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
  // Stack and links share one paragraph (a soft break) so they read as one
  // closing line under the card instead of two separately-margined blocks.
  const links = linkRow([["Live ↗", p.live], ["Source ↗", p.source]]);
  const closer = links || (p.access ? `<sub>${p.access}</sub>` : "");
  out.push(closer ? `${stackLine(p.stack)}  ` : stackLine(p.stack));
  if (closer) out.push(closer);
  out.push("");
  return out.join("\n");
}

function readme() {
  const o = [];
  const id = P.identity;

  o.push(`# ${id.name}`);
  o.push("");
  o.push(`**${id.role}** · ${id.location} · ${id.timezone}`);
  o.push("");
  o.push(id.statement);
  o.push("");
  o.push(linkRow([
    [L.dashboard ? "**Live Dashboard ↗**" : null, L.dashboard],
    ["GitHub", L.github], ["Portfolio", L.portfolio],
    ["LinkedIn", L.linkedin], [`${L.email}`, `mailto:${L.email}`],
  ]));
  o.push("");

  o.push(table(P.snapshot.rows.map((r) => [r.key, r.value + (r.led ? " ●" : "")])));
  o.push("");

  o.push(table(P.trajectory.entries.map((e) => [e.year, e.event])));
  o.push("");

  const rec = P.recognition;
  o.push(`**${rec.title}** · ${rec.issuer} · ${rec.period}  `);
  o.push(md(rec.facts.join(" · ")));
  o.push("");
  o.push("---"); // identity block → Selected work: neither side owns a heading border here
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
  o.push(table(P.stack.groups.map((g) => [g.label, stackLine(g.items)])));
  o.push("");

  heading(o, "AI workbench");
  o.push("Where a model sits in the loop — and where it does not.");
  o.push("");
  o.push("| Stage | | |");
  o.push("|---|---|---|");
  for (const st of AI.workflow.stages) {
    const who = st.owner === "human" ? "**Me**" : "AI";
    o.push(`| ${st.label} | ${who} | ${st.note} |`);
  }
  o.push("");

  const m = AI.measured;
  if (m?.measuredAt) {
    const window_ = m.firstSession && m.lastSession ? `${m.firstSession} → ${m.lastSession}` : "—";
    o.push(md(`Sessions **${m.sessions}** · Active days **${m.activeDays}** · Projects **${m.projects}** · ${window_}`));
    if (m.modelMix?.length) {
      o.push(m.modelMix.map((x) => `${x.model.replace(/^claude-/, "")} ${x.share}%`).join(" · "));
    }
    o.push("");
    o.push(`<sub>Counted from local Claude Code session transcripts, last measured ${String(m.measuredAt).slice(0, 10)}. ${m.scope} No token counts or spend — a subscription has no honest per-session cost, so nothing here is denominated in either.</sub>`);
  } else {
    o.push("<sub>No usage figures are shown here because none have been measured yet. They appear only when `npm run sync:ai` counts them from real local session data — never estimated, never filled in by hand.</sub>");
  }
  o.push("");

  if (GH) {
    heading(o, "GitHub");
    o.push(md(`**${GH.repoCount}** public repositories · **${Math.round(GH.languages.reduce((a, l) => a + l.bytes, 0) / 1024)} kB** of source · last push **${String(GH.lastPush || "").slice(0, 10)}**`));
    o.push("");
    o.push(GH.languages.map((l) => `${l.name} ${l.share}%`).join(" · "));
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
  o.push(table(P.toolchain.rows.map((r) => [r.key, r.value])));
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

fs.writeFileSync(path.join(root, "README.md"), readme());
console.log("README.md written — no embedded images, no SVG assets to generate.");

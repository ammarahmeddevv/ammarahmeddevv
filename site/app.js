/**
 * This page is what the README's static SVG panels cannot be: a real page
 * with a real DOM, so it can actually be interactive and actually be live.
 *
 * Two different kinds of "live" happen here, and it's worth being precise
 * about which is which:
 *
 *   1. Identity, projects, philosophy, AI-usage figures — fetched at request
 *      time from this repo's own `data/*.json` on raw.githubusercontent.com.
 *      Edit a JSON file, push, and the next page load shows it. No rebuild,
 *      no redeploy.
 *   2. The GITHUB panel — fetched directly from api.github.com in the
 *      visitor's own browser, computed the same way scripts/sync-github.mjs
 *      does it server-side. This one is live on every single page load, not
 *      just after an edit.
 *
 * Nothing here is faked while loading: every async section renders a
 * skeleton, then either the real content or a plain error line. No section
 * silently swaps in placeholder numbers.
 */

const USER = "ammarahmeddevv";
const REPO = "ammarahmeddevv";
const BRANCH = "main";
const RAW = `https://raw.githubusercontent.com/${USER}/${REPO}/${BRANCH}/data`;

const $ = (id) => document.getElementById(id);
const el = (tag, cls, html) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
};
const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* --------------------------------------------------------------- theme */

function initTheme() {
  const saved = localStorage.getItem("theme");
  const preferred = saved || (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
  applyTheme(preferred);
  $("themeBtn").addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
    applyTheme(next);
    try { localStorage.setItem("theme", next); } catch {}
  });
}
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  $("themeBtn").textContent = theme.toUpperCase();
}

/* ---------------------------------------------------------------- clock */

function startClock() {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Karachi", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  });
  const tick = () => { $("clock").textContent = `${fmt.format(new Date())} PKT`; };
  tick();
  setInterval(tick, 1000);
}

/* ----------------------------------------------------------------- data */

async function getJSON(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

async function loadProfile() {
  const [profile, projects, ai] = await Promise.all([
    getJSON(`${RAW}/profile.json`),
    getJSON(`${RAW}/projects.json`),
    getJSON(`${RAW}/ai-usage.json`),
  ]);
  renderIdentity(profile);
  renderSystem(profile.snapshot.rows);
  renderTrajectory(profile.trajectory.entries);
  renderRecognition(profile.recognition);
  renderProjects(projects.projects);
  renderStack(profile.stack.groups, "stackGrid");
  renderWorkbench(ai.workflow.stages, ai.measured);
  renderCurrently(profile.current);
  renderPhilosophy(profile.philosophy.principles);
  renderStack(profile.toolchain.rows.map((r) => ({ label: r.key, items: [r.value] })), "toolGrid", true);
  renderFooter(profile.identity, profile.links);
}

function renderIdentity(p) {
  const { identity: id, links } = p;
  $("heroRole").textContent = id.role.toUpperCase();
  $("heroPlace").textContent = `${id.locationShort.toUpperCase()} · ${id.timezone}`;
  $("statement").textContent = id.statement;
  document.title = `${id.name} — ${id.role}`;

  const linkRow = $("links");
  const entries = [
    ["GitHub", links.github],
    ["Portfolio", links.portfolio],
    ["LinkedIn", links.linkedin],
    [links.email, links.email ? `mailto:${links.email}` : null],
  ].filter(([, href]) => href);
  linkRow.innerHTML = entries.map(([label, href]) => `<a href="${esc(href)}">${esc(label)}</a>`).join("");
}

function renderSystem(rows) {
  const c = $("systemRows");
  c.innerHTML = "";
  for (const r of rows) {
    const row = el("div", "kv-row");
    row.innerHTML = `<span class="kv-key">${esc(r.key)}</span><span class="kv-val${r.led ? " led" : ""}">${esc(r.value)}</span>`;
    c.appendChild(row);
  }
}

function renderTrajectory(entries) {
  const c = $("trajectory");
  c.innerHTML = "";
  for (const e of entries) {
    const item = el("div", "traj-item");
    item.innerHTML = `<span class="traj-year">${esc(e.year)}</span><span class="traj-event">${esc(e.event)}</span>`;
    c.appendChild(item);
  }
}

function renderRecognition(rec) {
  if (!rec) return;
  $("recognitionPanel").style.display = "";
  $("recTitle").textContent = `${rec.title} · ${rec.issuer} · ${rec.period}`;
  $("recFacts").textContent = rec.facts.join(" · ");
}

function renderProjects(all) {
  const selected = all.filter((p) => p.tier === "selected");
  const also = all.filter((p) => p.tier === "also");

  const wrap = $("projects");
  wrap.innerHTML = "";
  selected.forEach((p, i) => wrap.appendChild(projectCard(p, i === 0)));

  const alsoWrap = $("alsoPublic");
  alsoWrap.innerHTML = "";
  if (!also.length) return;

  alsoWrap.appendChild(el("div", "panel-label", "ALSO PUBLIC"));
  const list = el("div", "also-list");
  for (const p of also) {
    const links = [
      p.live && `<a href="${esc(p.live)}">Live ↗</a>`,
      p.source && `<a href="${esc(p.source)}">Source ↗</a>`,
    ].filter(Boolean).join("  ·  ");

    const item = el("div", "also-item");
    item.innerHTML =
      `<b>${esc(p.name)}</b>` +
      `<span>${esc(p.summary)}</span>` +
      `<span class="chips" style="margin:0">${p.stack.map((s) => `<span class="chip">${esc(s)}</span>`).join("")}</span>` +
      (links ? `<span>${links}</span>` : "");
    list.appendChild(item);
  }
  alsoWrap.appendChild(list);
}

function projectCard(p, open) {
  const d = el("details", "project");
  if (open) d.open = true;

  const links = [
    p.live && `<a href="${esc(p.live)}">Live ↗</a>`,
    p.source && `<a href="${esc(p.source)}">Source ↗</a>`,
  ].filter(Boolean).join("");

  let body = `<p class="project-summary">${esc(p.summary)}</p>`;
  if (p.highlights?.length) {
    body += `<ul>${p.highlights.map((h) => `<li>${esc(h)}</li>`).join("")}</ul>`;
  }
  if (p.metrics) {
    const m = p.metrics;
    body += `<table class="metrics-table"><thead><tr>${m.head.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead>` +
      `<tbody>${m.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
    body += `<p class="metrics-note">${esc(m.caption)} ${esc(m.note)}</p>`;
  }
  body += `<div class="chips">${p.stack.map((s) => `<span class="chip">${esc(s)}</span>`).join("")}</div>`;
  body += links
    ? `<div class="project-links">${links}</div>`
    : p.access ? `<p class="access-note">${esc(p.access)}</p>` : "";

  d.innerHTML =
    `<summary>
      <div class="project-title">
        <h3>${esc(p.name)}</h3>
        <span class="project-meta">${esc(p.kind)} · ${esc(p.year)}</span>
      </div>
      <span class="project-status">${esc(p.status)}<svg class="chev" width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M6 3l5 5-5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
    </summary>
    <div class="project-body">${body}</div>`;
  return d;
}

function renderStack(groups, targetId, plain) {
  const c = $(targetId);
  c.innerHTML = "";
  for (const g of groups) {
    c.appendChild(el("dt", null, esc(g.label)));
    const dd = el("dd");
    dd.innerHTML = plain
      ? esc(g.items[0])
      : g.items.map((s) => `<span class="chip">${esc(s)}</span>`).join("");
    c.appendChild(dd);
  }
}

function renderWorkbench(stages, measured) {
  const c = $("flow");
  c.innerHTML = "";
  for (const st of stages) {
    const owned = st.owner === "human";
    const row = el("div", `flow-stage${owned ? "" : " owned-ai"}`);
    row.innerHTML =
      `<b>${esc(st.label)}</b><span class="flow-who ${owned ? "me" : "ai"}">${owned ? "ME" : "AI"}</span>` +
      `<span class="flow-note">${esc(st.note)}</span>`;
    c.appendChild(row);
  }

  const block = $("measuredBlock");
  block.innerHTML = "";
  if (!measured?.measuredAt) {
    block.appendChild(el("p", "scope-note",
      "No usage figures yet — they appear once <code>npm run sync:ai</code> counts them from real local Claude Code session data. Never estimated."));
    return;
  }
  const grid = el("div", "measured-grid");
  const window_ = measured.firstSession && measured.lastSession
    ? `${measured.firstSession.slice(5)} → ${measured.lastSession.slice(5)}` : "—";
  for (const [label, value] of [
    ["SESSIONS", measured.sessions], ["ACTIVE DAYS", measured.activeDays],
    ["PROJECTS", measured.projects], ["WINDOW", window_],
  ]) {
    grid.appendChild(el("div", null, `<span class="measured-label">${label}</span><span class="measured-value">${esc(value)}</span>`));
  }
  block.appendChild(grid);

  if (measured.modelMix?.length) {
    const ramp = ["var(--accent)", "var(--accent-soft)", "var(--soft)", "var(--meta)", "var(--line)"];
    const bar = el("div", "bar");
    bar.style.marginTop = "22px";
    measured.modelMix.forEach((m, i) => {
      const seg = el("div", "bar-seg");
      seg.style.width = `${m.share}%`;
      seg.style.background = ramp[i] || "var(--line)";
      seg.title = `${m.model} — ${m.share}%`;
      bar.appendChild(seg);
    });
    block.appendChild(bar);
    const legend = el("div", "bar-legend");
    legend.innerHTML = measured.modelMix.map((m, i) =>
      `<span><i style="background:${ramp[i] || "var(--line)"}"></i>${esc(m.model.replace(/^claude-/, ""))} ${m.share}%</span>`
    ).join("");
    block.appendChild(legend);
  }
  block.appendChild(el("p", "scope-note",
    `${esc(measured.scope)} No token counts or spend — a subscription has no honest per-session cost. Last measured ${esc(measured.measuredAt.slice(0, 10))}.`));
}

function renderCurrently(cur) {
  const c = $("currently");
  c.innerHTML = "";
  for (const [label, items] of [["NOW", cur.now], ["NEXT", cur.next], ["EXPLORING", cur.exploring]]) {
    if (!items?.length) continue;
    const col = el("div");
    col.appendChild(el("h4", null, label));
    const ul = el("ul", "plain-list");
    ul.innerHTML = items.map((i) => `<li>${esc(i)}</li>`).join("");
    col.appendChild(ul);
    c.appendChild(col);
  }
}

function renderPhilosophy(principles) {
  const c = $("philosophy");
  c.innerHTML = "";
  for (const p of principles) {
    const row = el("div", "principle");
    row.innerHTML =
      `<p class="principle-claim">${esc(p.claim)}</p>` +
      `<p class="principle-detail"><span class="principle-evidence">${esc(p.evidence)}</span>${esc(p.detail)}</p>`;
    c.appendChild(row);
  }
}

function renderFooter(id, links) {
  $("footerId").textContent = `${id.name} · ${id.location} · ${id.timezone}`;
  const entries = [["GitHub", links.github], ["Portfolio", links.portfolio], ["Email", links.email ? `mailto:${links.email}` : null]]
    .filter(([, href]) => href);
  $("footerLinks").innerHTML = entries.map(([l, h]) => `<a href="${esc(h)}">${esc(l)}</a>`).join("  ·  ");
}

/* ------------------------------------------------------- live GitHub API */

const EXCLUDE = new Set([REPO, "code-tracking"]);

async function loadGitHubLive() {
  const grid = $("ghGrid");
  const sub = $("ghSub");
  try {
    const repos = await getJSON(`https://api.github.com/users/${USER}/repos?per_page=100&sort=pushed`);
    const kept = repos.filter((r) => !r.fork && !r.private && !EXCLUDE.has(r.name));

    const langTotals = new Map();
    const langLists = await Promise.all(kept.map((r) => getJSON(r.languages_url).catch(() => ({}))));
    langLists.forEach((langs) => {
      for (const [name, n] of Object.entries(langs)) langTotals.set(name, (langTotals.get(name) || 0) + n);
    });

    const total = [...langTotals.values()].reduce((a, b) => a + b, 0) || 1;
    const languages = [...langTotals.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, bytes]) => ({ name, bytes, share: Math.round((bytes / total) * 1000) / 10 }))
      .filter((l) => l.share >= 1)
      .slice(0, 6);

    const lastPush = kept.map((r) => r.pushed_at).sort().pop();

    sub.textContent = "Fetched directly from the GitHub API, in your browser, just now.";

    const ramp = ["var(--accent)", "var(--accent-soft)", "var(--soft)", "var(--meta)", "var(--line)", "var(--line-soft)"];
    const bar = $("langBar");
    bar.innerHTML = "";
    languages.forEach((l, i) => {
      const seg = el("div", "bar-seg");
      seg.style.width = `${(l.share / languages.reduce((a, x) => a + x.share, 0)) * 100}%`;
      seg.style.background = ramp[i] || "var(--line)";
      seg.title = `${l.name} — ${l.share}%`;
      bar.appendChild(seg);
    });
    $("langLegend").innerHTML = languages.map((l, i) =>
      `<span><i style="background:${ramp[i] || "var(--line)"}"></i>${esc(l.name)} ${l.share}%</span>`
    ).join("");

    grid.innerHTML = "";
    for (const [label, value] of [
      ["REPOSITORIES", kept.length],
      ["SOURCE", `${Math.round(total / 1024)} kB`],
      ["LAST PUSH", lastPush ? lastPush.slice(0, 10) : "—"],
      ["FETCHED", "just now"],
    ]) {
      grid.appendChild(el("div", null, `<span class="measured-label">${label}</span><span class="measured-value">${esc(value)}</span>`));
    }
  } catch (e) {
    sub.textContent = "Could not reach the GitHub API right now (rate limit or offline).";
    sub.classList.add("fetch-error");
    grid.innerHTML = `<a href="https://github.com/${USER}?tab=repositories" style="grid-column:1/-1">See repositories directly on GitHub ↗</a>`;
  }
}

/* ------------------------------------------------------------------ go */

initTheme();
startClock();
loadProfile().catch((e) => {
  document.querySelector(".wrap").insertAdjacentHTML("afterbegin",
    `<p class="fetch-error" style="padding:40px 0">Could not load profile data (${esc(e.message)}). <a href="README.md">View the README instead ↗</a></p>`);
});
loadGitHubLive();

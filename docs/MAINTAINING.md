# Maintaining this profile

`README.md` is **generated**. Editing it by hand works until the next build
overwrites it. Edit `data/` instead.

```bash
npm run build      # data/*.json -> README.md
```

No `npm install` needed — `package.json` has nothing in it to install.
`README.md` is plain GitHub-flavoured markdown: tables and short lines of
text, no embedded images. An earlier version drew custom SVG panels for it;
that meant a font-outlining engine, a glyph cache and a contrast checker for
a result that read as busier than the plain version. It's gone, on purpose.

## Where things live

| You want to change | Edit |
|---|---|
| Name, role, statement, links | `data/profile.json` → `identity`, `links` |
| The snapshot table | `data/profile.json` → `snapshot.rows` |
| The years in the trajectory table | `data/profile.json` → `trajectory.entries` |
| Stack and toolchain tables | `data/profile.json` → `stack`, `toolchain` |
| Now / Next / Exploring | `data/profile.json` → `current` |
| How I work | `data/profile.json` → `philosophy.principles` |
| Projects, order, what's featured | `data/projects.json` |
| The AI pipeline stages | `data/ai-usage.json` → `workflow.stages` |
| README layout/structure | `scripts/build.mjs` |

## Commands

| Command | What it does |
|---|---|
| `npm run build` | Renders `README.md` from `data/*.json` |
| `npm run sync:github` | Fetches real language bytes and repo counts into `data/github.json` |
| `npm run sync:ai` | Counts local Claude Code sessions into `data/ai-usage.json` |

`sync:github` runs weekly in CI. `sync:ai` is **local only** — CI has no access
to your home directory, so run it yourself when you want the figures refreshed,
then commit the result.

## Rules this profile holds itself to

**Every number is measured.** No estimates, no "roughly", no round figures that
happen to look good. `data/ai-usage.json` ships with `measured` nulled out, and
the whole metrics block is omitted from the README rather than rendered empty.
If you ever find yourself typing a number into that object, stop — run the sync
instead, or leave it out.

**No dead links.** A `null` in `links` is omitted everywhere it would have been
rendered. When you get a LinkedIn or a custom domain, set the value and rebuild;
nothing else needs touching.

**No embedded images, no badge walls.** Tech-stack tags render as a plain
`X · Y · Z` line, never a row of backtick-code pills — a wall of six-plus
pills jammed together is a badge wall by another name. Tables carry the
structured data (snapshot, trajectory, stack, toolchain); short paragraphs
carry everything else.

**A `---` only where a heading isn't already drawing one.** GitHub renders a
bottom-border under every `## heading` automatically. A manual `---` placed
right before one stacks a second rule on the first — that was the actual
cause of a "crammed" README in an earlier version (9 dividers against 7
headings, confirmed by inspecting the live DOM), not image sizing or content
volume. `scripts/build.mjs`'s `heading()` helper is the only thing that
prints `## `; the two remaining manual `---` lines sit only where neither
side owns a heading.

## Updating the things that go stale

`current` is the section that dates fastest. An out-of-date "Now" is worse than
no "Now" at all — if a line is no longer true, cut it. Everything else
(`trajectory`, `recognition`, `philosophy`) is durable and rarely needs touching.

## The live dashboard (`site/`)

`site/index.html` + `styles.css` + `app.js` is a second, independent surface —
a real web page deployed to GitHub Pages, not a README. Unlike the README, it
can be **genuinely interactive** (theme toggle, expandable project cards,
hover states, a live clock), because it isn't proxied and stripped of scripts
the way a README's embedded content would be.

It needs **no rebuild** when `data/*.json` changes: at every page load it
fetches `profile.json`, `projects.json` and `ai-usage.json` straight from
`raw.githubusercontent.com` on this repo's `main` branch, and fetches its
GitHub-activity panel live from `api.github.com` in the visitor's own browser.
Push a data change, and the dashboard reflects it on the next load — no
`npm run build`, no redeploy.

`npm run build` never touches `site/`. Only edit the three files in `site/`
directly, and only when you want to change the dashboard's *structure* —
content changes belong in `data/`, same as the README.

Deploys via `.github/workflows/pages.yml`, which only runs when `site/**`
changes. First-time setup needed GitHub Pages enabled once with build type
"workflow" (`gh api -X POST repos/<owner>/<repo>/pages -f build_type=workflow`
or **Settings → Pages → Source: GitHub Actions**) — already done for this repo.

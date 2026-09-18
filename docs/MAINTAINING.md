# Maintaining this profile

`README.md` and everything in `assets/` are **generated**. Editing them by hand
works until the next build overwrites it. Edit `data/` instead.

```bash
npm install
npm run build      # data/ -> assets/*.svg + README.md
```

## Where things live

| You want to change | Edit |
|---|---|
| Name, role, statement, links | `data/profile.json` → `identity`, `links` |
| The SYSTEM readout | `data/profile.json` → `snapshot.rows` |
| The years in TRAJECTORY | `data/profile.json` → `trajectory.entries` |
| Stack and toolchain tables | `data/profile.json` → `stack`, `toolchain` |
| Now / Next / Exploring | `data/profile.json` → `current` |
| How I work | `data/profile.json` → `philosophy.principles` |
| Projects, order, what's featured | `data/projects.json` |
| The AI pipeline stages | `data/ai-usage.json` → `workflow.stages` |
| Colours, type sizes, spacing | `scripts/design.mjs` |
| Panel layout | `scripts/build.mjs` |

## Commands

| Command | What it does |
|---|---|
| `npm run build` | Renders the eight SVG panels and `README.md` |
| `npm run sync:github` | Fetches real language bytes and repo counts into `data/github.json` |
| `npm run sync:ai` | Counts local Claude Code sessions into `data/ai-usage.json` |
| `npm run check:contrast` | Verifies every colour pair against WCAG AA |
| `npm run check` | Contrast then build — run this before pushing |

`sync:github` runs weekly in CI. `sync:ai` is **local only** — CI has no access
to your home directory, so run it yourself when you want the figures refreshed,
then commit the result.

## Rules this profile holds itself to

**Every number is measured.** No estimates, no "roughly", no round figures that
happen to look good. `data/ai-usage.json` ships with `measured` nulled out, and
the metrics strip is omitted from the panel entirely rather than rendered empty.
If you ever find yourself typing a number into that object, stop — run the sync
instead, or leave it out.

**No dead links.** A `null` in `links` is omitted everywhere it would have been
rendered. When you get a LinkedIn or a custom domain, set the value and rebuild;
nothing else needs touching.

**Panels carry only large type.** Nothing in an SVG goes below ~24px at source
size, because a 900px panel in a phone-width column renders at about 0.4×.
Anything dense — project copy, tables, links — belongs in Markdown, where it
reflows and stays selectable. The build warns on overflow; fix the copy rather
than shrinking the type.

**One accent.** `#D9663F` on dark, `#B34D32` on paper — the same burnt red as
the portfolio. Adding a second accent colour is how this stops looking like one
system.

## Updating the things that go stale

`current` is the section that dates fastest. An out-of-date "Now" is worse than
no "Now" at all — if a line is no longer true, cut it. Everything else
(`trajectory`, `recognition`, `philosophy`) is durable and rarely needs touching.

## Fonts

`scripts/Fraunces-Light.ttf` and `scripts/GeistMono-Medium.ttf` are the same
faces the portfolio uses. They are read at build time and outlined to vector
paths, so nothing is fetched when someone views the profile — GitHub proxies
README images and would block a webfont anyway. Replacing a font file changes
the rendered type everywhere; rebuild after.

## The live dashboard (`site/`)

`site/index.html` + `styles.css` + `app.js` is a second, independent surface —
a real web page deployed to GitHub Pages, not a README image. It is
**genuinely interactive** (theme toggle, expandable project cards, hover
states) in a way nothing in the README can be, because GitHub proxies README
images through camo and strips any script.

It needs **no rebuild** when `data/*.json` changes: at every page load it
fetches `profile.json`, `projects.json` and `ai-usage.json` straight from
`raw.githubusercontent.com` on this repo's `main` branch, and fetches the
GITHUB panel's language stats live from `api.github.com` in the visitor's own
browser. Push a data change, and the dashboard reflects it on the next load —
no `npm run build`, no redeploy.

`npm run build` never touches `site/`. Only edit the three files in `site/`
directly, and only when you want to change the dashboard's *structure* —
content changes belong in `data/`, same as the README.

Deploys via `.github/workflows/pages.yml`, which only runs when `site/**`
changes. First-time setup needs GitHub Pages enabled once with build type
"workflow" (`gh api -X POST repos/<owner>/<repo>/pages -f build_type=workflow`
or **Settings → Pages → Source: GitHub Actions**) — already done for this repo.

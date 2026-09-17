/**
 * Verifies every foreground/background pair the panels actually use against
 * WCAG 2.1 AA. Run it after changing a colour in design.mjs.
 *
 *   npm run check:contrast
 *
 * Panel type is large by construction (nothing below 21px source), so 3:1 is
 * the binding threshold — but the palette is held to 4.5:1 anyway, because the
 * same colours are reused in Markdown where type is small.
 */

import { themes } from "./design.mjs";

const channel = (c) => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

function luminance(hex) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(channel);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

const PAIRS = [
  ["text", "ground", 4.5, "panel headings and values"],
  ["soft", "ground", 4.5, "trajectory events"],
  ["meta", "ground", 4.5, "labels, keys, notes"],
  ["accent", "ground", 4.5, "role line, years, status"],
  ["accentSoft", "ground", 3.0, "assisted pipeline nodes"],
  ["line", "ground", 1.3, "hairlines — separation only"],
];

let failed = 0;
for (const key of ["dark", "light"]) {
  const t = themes[key];
  console.log(`\n${key}  ground ${t.ground}`);
  for (const [fg, bg, min, use] of PAIRS) {
    const v = ratio(t[fg], t[bg]);
    const ok = v >= min;
    if (!ok) failed++;
    console.log(
      `  ${ok ? "pass" : "FAIL"}  ${fg.padEnd(11)} ${t[fg]}  ${v.toFixed(2)}:1  (min ${min})  ${use}`
    );
  }
}

console.log(failed ? `\n${failed} pair(s) below threshold\n` : "\nall pairs pass\n");
process.exit(failed ? 1 : 0);

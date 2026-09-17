/**
 * The visual system, in one file.
 *
 * Two constraints shape everything here and are worth stating once:
 *
 * 1. GitHub renders README images through a proxy, as <img>. That means no
 *    external fonts, no CSS, no scripts, no <a>. So display type is outlined
 *    to vector paths — the real Fraunces and Geist Mono from Ammar's own
 *    portfolio, not a system fallback pretending to be them.
 *
 * 2. An SVG in a README is scaled to the reader's column width. On a phone
 *    that is roughly 0.4x. Anything below MIN_TYPE at source size becomes
 *    unreadable there, so panels carry only large type and dense data stays
 *    in real Markdown, where it reflows.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import opentype from "opentype.js";

const here = path.dirname(fileURLToPath(import.meta.url));

/* ---------------------------------------------------------------- palette */

/**
 * One accent, two grounds. The dark theme is the profile's own voice; the
 * light theme is Ammar's portfolio palette exactly, so a visitor arriving
 * from the site sees the same world. Contrast ratios are measured, not
 * assumed — see `npm run check:contrast`.
 */
export const themes = {
  dark: {
    name: "dark",
    ground: "#0B0B0D",
    surface: "#121216",
    line: "#26262C",
    lineSoft: "#1A1A1F",
    text: "#EDEAE4",
    soft: "#A8A49C",
    meta: "#807B73",
    accent: "#D9663F",
    accentSoft: "#A85940",
  },
  light: {
    name: "light",
    ground: "#F5F3EE",
    surface: "#EEEBE3",
    line: "#D8D3CA",
    lineSoft: "#E4E0D8",
    text: "#171717",
    soft: "#3A3936",
    meta: "#67645E",
    accent: "#B34D32",
    accentSoft: "#B0705A",
  },
};

/** Source-size floor. Below this, a panel stops being legible on a phone. */
export const MIN_TYPE = 24;

/** Canvas width. Matches GitHub's README column, so panels render 1:1 on desktop. */
export const W = 900;

/** Editorial margin. Everything hangs off this line. */
export const PAD = 44;

/* ------------------------------------------------------------------ fonts */

const fonts = {
  display: loadFont(path.join(here, "Fraunces-Light.ttf")),
  mono: loadFont(path.join(here, "GeistMono-Medium.ttf")),
};

function loadFont(file) {
  const b = fs.readFileSync(file);
  return opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
}

/**
 * Lay out a string glyph by glyph so we can apply real letter-spacing —
 * opentype's own getPath has no tracking, and tracking is most of what makes
 * this look typeset rather than typed.
 */
function layout(font, str, size, tracking) {
  const glyphs = font.stringToGlyphs(str);
  const scale = size / font.unitsPerEm;
  const placed = [];
  let x = 0;
  for (let i = 0; i < glyphs.length; i++) {
    const g = glyphs[i];
    placed.push({ g, x });
    let advance = g.advanceWidth * scale;
    const next = glyphs[i + 1];
    if (next) advance += font.getKerningValue(g, next) * scale;
    x += advance + tracking;
  }
  return { placed, width: Math.max(0, x - (glyphs.length ? tracking : 0)) };
}

/** Width of a string without emitting anything — used to right-align and to fit-check. */
export function measure(face, str, size, tracking = 0) {
  return layout(fonts[face], str, size, tracking).width;
}

/* ----------------------------------------------------------- glyph cache */

/**
 * Each distinct glyph is outlined once into <defs> at em scale and then
 * referenced with <use>. Emitting a fresh outline per character instead cost
 * roughly three times the bytes for identical pixels — "e" appears forty times
 * in a panel and does not need forty copies of its contour.
 *
 * Coordinates inside a run are in font units, so the whole run scales with one
 * transform and each glyph reference stays about thirty bytes.
 */
const glyphs = new Map();
let seq = 0;

export function resetGlyphs() {
  glyphs.clear();
  seq = 0;
}

function glyphRef(face, glyph) {
  const key = `${face}:${glyph.index}`;
  let hit = glyphs.get(key);
  if (!hit) {
    // getPath already flips to SVG's y-down space; at em size the numbers are
    // whole font units, so zero decimals is lossless here.
    const d = glyph.getPath(0, 0, fonts[face].unitsPerEm).toPathData(0);
    hit = { id: `${face[0]}${(seq++).toString(36)}`, d };
    glyphs.set(key, hit);
  }
  return hit;
}

/** The <defs> block for everything referenced so far. Blank glyphs are skipped. */
function defs() {
  let out = "";
  for (const { id, d } of glyphs.values()) if (d) out += `<path id="${id}" d="${d}"/>`;
  return out ? `<defs>${out}</defs>` : "";
}

/**
 * A run of text. `anchor` shifts it; `y` is the baseline.
 * Returns "" for empty strings so callers can pass optional values straight in.
 */
export function text(face, str, { x = 0, y = 0, size = 28, tracking = 0, fill, anchor = "start", opacity }) {
  if (str == null || str === "") return "";
  const font = fonts[face];
  const { placed, width } = layout(font, String(str), size, tracking);
  const dx = anchor === "end" ? -width : anchor === "middle" ? -width / 2 : 0;
  const scale = size / font.unitsPerEm;

  let uses = "";
  for (const { g, x: gx } of placed) {
    const ref = glyphRef(face, g);
    if (ref.d) uses += `<use href="#${ref.id}" x="${Math.round(gx / scale)}"/>`;
  }
  if (!uses) return "";

  const o = opacity == null ? "" : ` opacity="${opacity}"`;
  const s = Math.round(scale * 1e6) / 1e6;
  return `<g transform="translate(${r(x + dx)} ${r(y)}) scale(${s})" fill="${fill}"${o}>${uses}</g>`;
}

/* ------------------------------------------------------- svg primitives */

const r = (n) => Math.round(n * 100) / 100;

export function rule(x1, y, x2, stroke, opacity = 1) {
  return `<path d="M${r(x1)} ${r(y)}H${r(x2)}" stroke="${stroke}" stroke-width="1" opacity="${opacity}"/>`;
}

export function vrule(x, y1, y2, stroke, opacity = 1) {
  return `<path d="M${r(x)} ${r(y1)}V${r(y2)}" stroke="${stroke}" stroke-width="1" opacity="${opacity}"/>`;
}

export function dot(cx, cy, rad, fill) {
  return `<circle cx="${r(cx)}" cy="${r(cy)}" r="${r(rad)}" fill="${fill}"/>`;
}

export function ring(cx, cy, rad, stroke) {
  return `<circle cx="${r(cx)}" cy="${r(cy)}" r="${r(rad)}" fill="none" stroke="${stroke}" stroke-width="1.5"/>`;
}

/**
 * The accent tick that opens every panel — a short heavy bar in the accent
 * colour at the top-left margin. It is the one repeated mark that ties the
 * three panels into a set.
 */
export function tick(x, y, t) {
  return `<rect x="${r(x)}" y="${r(y)}" width="3" height="26" fill="${t.accent}"/>`;
}

/** Panel ground plus its hairline frame. 2px radius, matching the portfolio. */
export function frame(w, h, t) {
  return (
    `<rect x="0" y="0" width="${w}" height="${h}" rx="2" fill="${t.ground}"/>` +
    `<rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="2" fill="none" stroke="${t.line}"/>`
  );
}

/**
 * Wrap an SVG document. `label` becomes the accessible name — these panels
 * carry real information, and a screen reader should get it.
 */
export function doc(w, h, label, body) {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" ` +
    `viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)}">` +
    `<title>${esc(label)}</title>${defs()}${body}</svg>\n`
  );
}

export function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Fit-check used by the build: warns loudly rather than shipping clipped type. */
export function fit(label, width, limit) {
  if (width > limit) {
    console.warn(`  ! overflow  ${label}: ${Math.round(width)}px > ${Math.round(limit)}px`);
    return false;
  }
  return true;
}

export { r };

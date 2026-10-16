// research-slides theme: pptxgenjs helpers for a clean, sparse academic look
// (white ground, Arial, navy titles, carded content; see references/style.md).
//
// usage, from a deck's build script:
//   const L = require(path.join(process.env.RESEARCH_SLIDES, "theme.js"));
//   const pres = L.newDeck("Deck title");
//   const s = L.content(pres, "Title", "Speaker (Affil) | one-line context");
//   L.card(pres, s, x, y, w, h, { accent: L.C.blue });
//   ...
//   pres.writeFile({ fileName: OUT });
//
// Every helper takes inches on a 13.333 x 7.5 slide. Nothing here decides
// content; it only fixes geometry, fonts and colour so decks look alike.

const fs = require("fs");
const path = require("path");
const pptxgen = require("pptxgenjs");

// --------------------------------------------------------------- tokens ----
const C = {
  navy: "162B43",      // titles, strong text, dark slides
  slate: "40546C",     // body text
  muted: "53677F",     // subtitles, secondary labels
  grey: "5E6B6F",      // neutral bars, captions
  rule: "D8E1EB",      // card borders, divider line
  rule2: "A7B8CC",     // stronger neutral border
  blue: "315DA8",      // primary accent
  teal: "167E82",      // second accent
  purple: "7350A5",    // third accent
  orange: "BC5318",    // warning / contrast, use sparingly
  blueBg: "EAF0FA", tealBg: "E7F4F2", purpleBg: "F0ECF8", orangeBg: "FBEFE8",
  paleOnDark: "C9D6E6", tealOnDark: "7FD1C7",
  white: "FFFFFF",
};
const F = "Arial";
const MATH = "Cambria Math";
const W = 13.333, H = 7.5;
const LM = 0.61;               // left margin of title / content
const CW = W - LM - 0.55;      // content width
const TOP = 1.32;              // first content y below the divider
const BOTTOM = 6.85;           // keep content above this (page number lives below)
const PAD = 0.25;              // text inset inside cards (left edge after the accent bar)
const STRIPE = "315DA8";       // left-edge stripe: ONE colour on every slide
const SIZE = { title: 24, sub: 14, head: 16, body: 14, small: 12, caption: 10.5,
               stat: 28, coverTitle: 36, coverLine: 20, darkTitle: 30, darkItem: 21.6 };

let PN = 0;

function newDeck(title) {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_WIDE";
  pres.title = title || "";
  pres.theme = { headFontFace: F, bodyFontFace: F };
  PN = 0;
  // speaker notes are plain text: strip the _{..}/^{..} markers rich() understands
  const add = pres.addSlide.bind(pres);
  pres.addSlide = (...a) => { const s = add(...a); const n = s.addNotes.bind(s); s.addNotes = (t) => n(plain(t)); return s; };
  return pres;
}

// -------------------------------------------------------------- basics -----
// Inline sub/superscripts in ordinary text: write "T_{h}", "p_{0}", "χ^{2}".
// rich() turns a string or a run array into runs with real subscript/superscript
// runs (Unicode subscript letters are missing from Arial; "T_h" with an underscore
// looks like code). Only the marked form is converted, so names such as
// "CD8_alpha_beta_T_cell" are left alone. The
// last piece of a run carries breakLine; paragraph options (bullet) stay on every piece,
// because pptxgenjs does not read them from the paragraph's first run only (a bullet
// on just the first piece was dropped).
const MARK = /_\{([^}]*)\}|\^\{([^}]*)\}/g;
function rich(t) {
  const runs = typeof t === "string" ? [{ text: t, options: {} }] : t;
  if (!runs.some((r) => typeof r.text === "string" && /[_^]\{/.test(r.text))) return t;
  // A "\n" inside a run that is later split makes pptxgenjs break the paragraph at the
  // wrong piece ("if p" / "0 <= 0.05" on two lines), so each
  // line becomes its own run first and line ends are explicit breakLine runs.
  const lines = [];
  for (const r of runs) {
    const parts = String(r.text).split("\n");
    parts.forEach((p, i) => {
      const o = { ...(r.options || {}) };
      if (i < parts.length - 1) o.breakLine = true;
      else if (!(r.options || {}).breakLine) delete o.breakLine;
      lines.push({ text: p, options: o });
    });
  }
  const out = [];
  for (const r of lines) {
    const o = r.options || {}, pieces = [];
    let last = 0, m;
    MARK.lastIndex = 0;
    while ((m = MARK.exec(r.text)) !== null) {
      if (m.index > last) pieces.push([r.text.slice(last, m.index), {}]);
      pieces.push(m[1] !== undefined ? [m[1], { subscript: true }] : [m[2], { superscript: true }]);
      last = MARK.lastIndex;
    }
    if (last < r.text.length || !pieces.length) pieces.push([r.text.slice(last), {}]);
    pieces.forEach(([text, extra], i) => {
      const po = { ...o, ...extra };
      if (i < pieces.length - 1) delete po.breakLine;
      out.push({ text, options: po });
    });
  }
  return out;
}
// Plain-text form of the same markers, for speaker notes: "T_{h}" -> "T_h".
function plain(t) { return t.replace(/_\{([^}]*)\}/g, "_$1").replace(/\^\{([^}]*)\}/g, "^$1"); }

function txt(s, t, x, y, w, h, o = {}) {
  s.addText(rich(t), { x, y, w, h, fontFace: o.face || F, fontSize: o.fs || SIZE.body,
    bold: !!o.bold, italic: !!o.italic, color: o.color || C.slate,
    align: o.align || "left", valign: o.valign || "top", margin: 0,
    lineSpacingMultiple: o.ls || 1.05, paraSpaceAfter: o.psa || 0, fit: "none" });
}
function rect(pres, s, x, y, w, h, fill, o = {}) {
  s.addShape(pres.shapes.RECTANGLE, { x, y, w, h, fill: { color: fill },
    line: o.line ? { color: o.line, width: o.lw || 0.75 } : { type: "none" } });
}
function line(pres, s, x1, y1, x2, y2, o = {}) {
  s.addShape(pres.shapes.LINE, { x: Math.min(x1, x2), y: Math.min(y1, y2),
    w: Math.abs(x2 - x1), h: Math.abs(y2 - y1), flipH: x2 < x1, flipV: y2 < y1,
    line: { color: o.color || C.rule, width: o.w || 1, dashType: o.dash || "solid",
      beginArrowType: o.beg || "none", endArrowType: o.end || "none" } });
}
function arrow(pres, s, x1, y1, x2, y2, o = {}) {
  line(pres, s, x1, y1, x2, y2, { color: o.color || C.grey, w: o.w || 2, end: "triangle" });
}
// A real slide-number FIELD, not typed text: typed numbers go stale as soon as
// someone reorders or deletes slides in PowerPoint.
function pageNum(s, dark) {
  s.slideNumber = { x: W - 0.72, y: H - 0.48, w: 0.5, h: 0.3, fontFace: F, fontSize: 14,
    color: dark ? C.tealOnDark : C.navy, align: "right" };
}

// --------------------------------------------------------- slide types -----
// Content slide: thin accent stripe on the left edge, 24 pt navy title,
// 14 pt muted subtitle, a hairline divider, page number bottom right.
function content(pres, title, subtitle, o = {}) {
  PN++;
  const s = pres.addSlide();
  s.background = { color: C.white };
  rect(pres, s, 0, 0, 0.07, H, STRIPE);
  txt(s, title, LM, 0.28, CW, 0.47, { fs: SIZE.title, bold: true, color: C.navy, valign: "middle" });
  if (subtitle) txt(s, subtitle, LM, 0.78, CW, 0.32, { fs: SIZE.sub, color: C.muted, valign: "middle" });
  line(pres, s, LM, 1.14, W - 0.55, 1.14, { color: C.rule, w: 1 });
  pageNum(s);
  return s;
}

// Cover: meeting name + event line on white, then one navy hero card holding
// the talk title, 1-3 short lines, and the presenter/date at the card's foot.
// o.image (optional): a figure shown on the right half of the card.
function cover(pres, o) {
  PN++;
  const s = pres.addSlide();
  s.background = { color: C.white };
  rect(pres, s, 0, 0, 0.07, H, STRIPE);
  txt(s, o.meeting || "Lab meeting", LM, 0.28, CW, 0.47,
    { fs: SIZE.title, bold: true, color: C.navy, valign: "middle" });
  if (o.event) txt(s, o.event, LM, 0.8, CW, 0.3, { fs: SIZE.sub, bold: true, color: C.muted, valign: "middle" });
  const cy = 1.5, ch = 4.75, tw = o.image ? 6.4 : CW - 1.0;
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: LM, y: cy, w: CW, h: ch, rectRadius: 0.08,
    fill: { color: C.navy }, line: { type: "none" } });
  rect(pres, s, LM + 0.5, cy + 0.62, 0.9, 0.06, C.tealOnDark);
  txt(s, o.title, LM + 0.5, cy + 0.85, tw, 1.5, { fs: o.titleFs || SIZE.coverTitle, bold: true,
    color: C.white, valign: "top", ls: 1.0 });
  let y = cy + 2.45;
  for (const l of o.lines || []) {
    txt(s, l, LM + 0.5, y, tw, 0.4, { fs: SIZE.coverLine, color: C.paleOnDark, valign: "middle" });
    y += 0.48;
  }
  if (o.byline) txt(s, o.byline, LM + 0.5, cy + ch - 0.8, tw, 0.4, { fs: 16, bold: true, color: C.tealOnDark, valign: "middle" });
  if (o.image) image(s, o.image, { x: LM + 7.3, y: cy + 0.5, w: CW - 7.8, h: ch - 1.0 }, { center: true });
  return s;
}

// Section divider (research-progress decks). Same white system as content
// slides: left stripe, big accent number, navy section name, and a tracker
// along the bottom showing every section with the current one highlighted.
//   section(pres, 2, "The framework", { sub: "...", all: ["Background", "Framework", "Results"] })
function section(pres, num, name, o = {}) {
  PN++;
  const s = pres.addSlide();
  s.background = { color: C.white };
  const acc = C.blue;
  rect(pres, s, 0, 0, 0.07, H, STRIPE);
  const n = String(num).padStart(2, "0");
  // number right-aligned in a fixed box, so the gap to the rule is the same for 01/02/03
  txt(s, n, LM, 1.85, 2.2, 1.5, { fs: 96, bold: true, color: acc, valign: "middle", align: "right" });
  rect(pres, s, LM + 2.45, 2.05, 0.03, 1.1, C.rule2);
  txt(s, name, LM + 2.8, 1.95, CW - 3.0, 0.75, { fs: 36, bold: true, color: C.navy, valign: "middle" });
  if (o.sub) txt(s, o.sub, LM + 2.8, 2.72, CW - 3.0, 0.45, { fs: 18, color: C.muted, valign: "middle" });
  const all = o.all || [];
  if (all.length) {
    const gap = 0.25, w = (CW - gap * (all.length - 1)) / all.length, y = 4.9;
    all.forEach((t, i) => {
      const cur = i + 1 === Number(num), x = LM + i * (w + gap);
      rect(pres, s, x, y, w, cur ? 0.07 : 0.03, cur ? acc : C.rule);
      txt(s, String(i + 1).padStart(2, "0") + "   " + t, x, y + 0.18, w, 0.35,
        { fs: 14, bold: cur, color: cur ? acc : C.muted, valign: "middle" });
    });
  }
  pageNum(s);
  return s;
}

// Dark take-home / closing slide with up to ~3 numbered items. Same grid as a
// content slide (stripe, title, subtitle, divider), inverted onto navy.
function takeHome(pres, title, items, o = {}) {
  PN++;
  const s = pres.addSlide();
  s.background = { color: C.navy };
  rect(pres, s, 0, 0, 0.07, H, STRIPE);
  txt(s, title, LM, 0.28, CW, 0.47, { fs: SIZE.title, bold: true, color: C.white, valign: "middle" });
  txt(s, o.sub || "Take-home", LM, 0.78, CW, 0.32, { fs: SIZE.sub, color: C.tealOnDark, valign: "middle" });
  line(pres, s, LM, 1.14, W - 0.55, 1.14, { color: "3F5A7A", w: 1 });
  let y = 1.75;
  items.forEach((it, i) => {
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: LM, y: y + 0.02, w: 0.42, h: 0.42, rectRadius: 0.06,
      fill: { color: C.teal }, line: { type: "none" } });
    txt(s, String(i + 1), LM, y + 0.02, 0.42, 0.42, { fs: 18, bold: true, color: C.white, align: "center", valign: "middle" });
    txt(s, it.head, LM + 0.7, y, CW - 0.7, 0.46, { fs: SIZE.darkItem, bold: true, color: C.white, valign: "middle" });
    if (it.sub) txt(s, it.sub, LM + 0.7, y + 0.52, CW - 0.7, 0.4, { fs: 16, color: C.paleOnDark, valign: "middle" });
    y += 1.45;
  });
  pageNum(s, true);
  return s;
}

// Hidden backup slide: same as content(), title prefixed "(Supp.)".
// Remember to pass its slide number to hide_slides.py in build.sh.
function supp(pres, title, subtitle, o = {}) {
  const s = content(pres, "(Supp.) " + title, subtitle, o);
  s.hidden = true;  // pptxgenjs 4 writes show="0"; hide_slides.py guards it after the re-save
  return s;
}

// ----------------------------------------------------------- components ----
// White rounded card, hairline border, coloured left edge.
function card(pres, s, x, y, w, h, o = {}) {
  // small corner radius so the full-height accent bar covers the card's left edge
  // cleanly (a larger radius left slivers of outline above and below the bar)
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.035,
    fill: { color: o.fill || C.white }, line: { color: o.border || C.rule, width: 0.75 } });
  if (o.accent !== null) rect(pres, s, x, y, 0.06, h, o.accent || C.blue);
}
// Card with a bold heading and an optional body; returns the y below the heading.
function headedCard(pres, s, x, y, w, h, head, body, o = {}) {
  card(pres, s, x, y, w, h, o);
  txt(s, head, x + PAD, y + 0.15, w - PAD - 0.15, 0.36, { fs: o.headFs || SIZE.head, bold: true,
    color: o.headColor || o.accent || C.navy, valign: "middle" });
  if (body) txt(s, body, x + PAD, y + 0.6, w - PAD - 0.15, h - 0.7,
    { fs: o.fs || SIZE.body, color: C.slate, psa: o.psa === undefined ? 6 : o.psa });
  return y + 0.6;
}
// A row of process boxes joined by arrows. steps = [{head, body, accent}]
function flow(pres, s, steps, x, y, w, h, o = {}) {
  const gap = o.gap || 0.42, n = steps.length;
  const bw = (w - gap * (n - 1)) / n;
  steps.forEach((st, i) => {
    const bx = x + i * (bw + gap);
    headedCard(pres, s, bx, y, bw, h, st.head, st.body,
      { accent: st.accent || C.navy, headColor: st.accent || C.navy, headFs: o.headFs || 14.4, fs: o.fs || 13 });
    if (i < n - 1) arrow(pres, s, bx + bw + 0.08, y + h / 2, bx + bw + gap - 0.08, y + h / 2);
  });
  return steps.map((_, i) => ({ x: x + i * (bw + gap), w: bw }));   // align later blocks to these columns
}
// Big number with a label underneath.
function stat(s, value, label, x, y, w, o = {}) {
  txt(s, value, x, y, w, 0.5, { fs: o.fs || SIZE.stat, bold: true, color: o.color || C.blue, valign: "bottom" });
  txt(s, label, x, y + 0.55, w, 0.6, { fs: o.labelFs || 13, color: C.slate });
}
// Horizontal bar with value label; for 2-4 bar comparisons drawn natively.
function bar(pres, s, label, value, max, x, y, wLabel, wBar, o = {}) {
  txt(s, label, x, y, wLabel, 0.34, { fs: o.fs || 15, bold: !!o.bold, color: C.navy, valign: "middle" });
  rect(pres, s, x + wLabel, y + 0.04, Math.max(0.05, wBar * value / max), 0.26, o.color || C.grey);
  txt(s, o.text || String(value), x + wLabel + wBar * value / max + 0.1, y, 1.2, 0.34,
    { fs: o.fs || 15, bold: true, color: o.color || C.grey, valign: "middle" });
}
// Small coloured pill / tag.
function chip(pres, s, t, x, y, w, o = {}) {
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h: o.h || 0.34, rectRadius: 0.17,
    fill: { color: o.fill || C.blueBg }, line: { type: "none" } });
  txt(s, t, x, y, w, o.h || 0.34, { fs: o.fs || 13, bold: true, color: o.color || C.blue, align: "center", valign: "middle" });
}
function caption(s, t, x, y, w, o = {}) {
  txt(s, t, x, y, w, o.h || 0.28, { fs: o.fs || SIZE.caption, italic: true, color: C.grey });
}

// Label + one-line rows, e.g. Limitations: bold label left, one plain line right. items = [[label, line], ...]
function rows(pres, s, items, x, y, w, o = {}) {
  const h = o.h || 0.8, gap = o.gap || 0.32, lw = o.labelW || 4.0;
  items.forEach(([label, line], i) => {
    const yy = y + i * (h + gap);
    card(pres, s, x, yy, w, h, { accent: o.accent || C.blue });
    txt(s, label, x + PAD, yy, lw - PAD - 0.1, h, { fs: o.fs || 16, bold: true, color: C.navy, valign: "middle" });
    txt(s, line, x + lw, yy, w - lw - 0.25, h, { fs: o.fs || 16, color: C.slate, valign: "middle" });
  });
  return y + items.length * (h + gap) - gap;
}

// ---------------------------------------------------------------- images ---
// Pixel size of a PNG or JPEG, read from the file header (no dependencies).
function imgDims(p) {
  const b = fs.readFileSync(p);
  if (b.readUInt32BE(0) === 0x89504e47) return [b.readUInt32BE(16), b.readUInt32BE(20)];
  let i = 2;
  while (i < b.length) {
    if (b[i] !== 0xff) { i++; continue; }
    const m = b[i + 1];
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc)
      return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)];
    i += 2 + b.readUInt16BE(i + 2);
  }
  throw new Error("cannot read image size: " + p);
}
// Fit an image inside a box keeping its aspect ratio. Default anchor is
// top-left (o.center to centre). Returns the box actually used, so the
// caller can place a caption directly underneath it.
function image(s, file, box, o = {}) {
  const [iw, ih] = imgDims(file);
  const r = iw / ih, br = box.w / box.h;
  let w, h;
  if (r > br) { w = box.w; h = w / r; } else { h = box.h; w = h * r; }
  const fb = { x: box.x, y: box.y, w, h };
  if (o.center) { fb.x = box.x + (box.w - w) / 2; fb.y = box.y + (box.h - h) / 2; }
  s.addImage({ path: file, ...fb });
  return fb;
}

// -------------------------------------------------------------- equations --
// Placeholder text consumed by omml_lib.py after the pptxgenjs build.
// Make the box a little WIDER than the expression: PowerPoint wraps an equation
// onto two lines when its frame is too narrow (LibreOffice instead stretches it to
// fill the frame, so its preview misleads either way; check with ppt_pdf.sh).
function eq(s, name, x, y, w, h, o = {}) {
  s.addText("EQMARK_" + name + (o.size ? "__" + o.size : ""),
    { x, y, w, h, fontFace: MATH, fontSize: o.fs || 14, color: C.navy,
      align: o.align || "center", valign: "middle", margin: 0 });
}

module.exports = { C, F, MATH, W, H, LM, CW, TOP, BOTTOM, SIZE, PAD,
  newDeck, txt, rich, plain, rect, line, arrow, pageNum, content, cover, section, takeHome, supp,
  card, headedCard, flow, stat, bar, chip, rows, caption, imgDims, image, eq,
  page: () => PN };

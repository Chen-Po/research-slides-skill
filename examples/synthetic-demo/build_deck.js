// Synthetic demo: every theme.js building block once, on placeholder content.
// Build: RESEARCH_SLIDES=<skill>/scripts bash build.sh
const path = require("path");
const L = require(path.join(process.env.RESEARCH_SLIDES, "theme.js"));
const { C, LM, CW, PAD } = L;
const RAW = process.env.RAW || path.join(__dirname, "_build/raw.pptx");
const pres = L.newDeck("research-slides synthetic demo");
const SECTIONS = ["Background", "Method", "Results"];

// 1 cover
L.cover(pres, { event: "Research progress · 13 October 2026",
  title: "Method X: tissue prioritization with a hierarchical model",
  lines: ["What it estimates, and when it fails"],
  byline: "A. Researcher · Example Lab" });

// 2 section divider
L.section(pres, 1, "Background", { sub: "Why ranking annotations one at a time is not enough", all: SECTIONS });

// 3 pipeline: flow on top, one number under each step (same columns)
let s = L.content(pres, "The pipeline end to end", "Each box is expanded on a later slide");
// colour encodes the stage: inputs navy, model blue, output teal
const cols = L.flow(pres, s, [
  { head: "GWAS summary stats", body: "z-scores and sample size", accent: C.navy },
  { head: "LD reference", body: "ancestry-matched panel", accent: C.navy },
  { head: "Fit the model", body: "MCMC, 4 chains", accent: C.blue },
  { head: "Read out", body: "tissue-level posteriors", accent: C.teal },
], LM, 1.5, CW, 1.2, { fs: 14 });
[["39", "traits analysed", C.navy], ["1,588", "LD blocks", C.navy], ["13 h", "per trait on 24 cores", C.blue], ["21", "tissues ranked", C.teal]]
  .forEach(([v, lab, col], i) => L.stat(s, v, lab, cols[i].x + PAD, 3.2, cols[i].w - PAD, { color: col, fs: 32, labelFs: 15 }));
L.caption(s, "All numbers: Methods, p. 12", LM, 6.3, 6);
s.addNotes("Takeaway: the whole method is four steps; the next slides open each box.");

// 4 section divider
L.section(pres, 2, "Method", { sub: "One hierarchical model instead of separate rankings", all: SECTIONS });

// 5 comparison: drawn bars on the left, the result in words on the right
s = L.content(pres, "More discoveries with annotation-informed masks", "Same data and tests; only the masks differ");
const y0 = L.headedCard(pres, s, LM, 1.5, 5.9, 3.6, "Associations found", null);
L.bar(pres, s, "Baseline masks", 595, 728, LM + PAD, y0 + 0.3, 2.6, 2.3, { color: C.grey });
L.bar(pres, s, "Baseline + model", 728, 728, LM + PAD, y0 + 0.85, 2.6, 2.3, { color: C.blue, bold: true });
L.txt(s, "+22% over baseline masks", LM + PAD, y0 + 1.75, 5.3, 0.4, { fs: 18, bold: true, color: C.blue, valign: "middle" });
L.headedCard(pres, s, LM + 6.3, 1.5, CW - 6.3, 3.6, "Signals survive adjustment",
  "Model vs baseline masks\nBefore QTL removal: 343 vs 385\nAfter QTL removal: 177 vs 64\nRetained: 52% vs 17%", { fs: 16, psa: 10 });
L.chip(pres, s, "Preprint, not yet peer reviewed", LM, 5.45, 3.3, { fill: C.orangeBg, color: "9A4313" });
s.addNotes("Takeaway: the gain is not driven by single-variant signals. Source: Fig. 3b.");

// 6 section divider
L.section(pres, 3, "Results", { sub: "Breast cancer as the worked example", all: SECTIONS });

// 7 figure + definition + how to read it
s = L.content(pres, "What the posterior inclusion probability means", "One picture, one equation");
const fb = L.image(s, path.join(__dirname, "placeholder.png"), { x: LM, y: 1.5, w: 6.6, h: 4.75 });
L.caption(s, "Simulated locus for illustration", LM, fb.y + fb.h + 0.08, fb.w);
L.headedCard(pres, s, LM + 7.0, 1.5, CW - 7.0, 2.3, "Definition", null);
L.eq(s, "pip", LM + 7.0 + PAD, 2.1, 3.6, 0.9);
L.txt(s, "product over the L single effects", LM + 7.0 + PAD, 3.1, CW - 7.0 - PAD - 0.15, 0.4, { fs: 15 });
L.headedCard(pres, s, LM + 7.0, 4.05, CW - 7.0, 2.2, "How to read the plot",
  "Blue points: PIP above 0.5\nGrey points: little evidence of a causal effect", { fs: 15 });
s.addNotes("Explain the product form before showing the figure.");

// 8 limitations as rows
s = L.content(pres, "Limitations", "What the current version cannot resolve");
L.rows(pres, s, [
  ["Incomplete annotation panel", "unassayed cell states can only be represented by proxies"],
  ["Power and separability", "weak or correlated components may be missed"],
  ["Ancestry in practice", "validation remains predominantly European"],
  ["Upstream resolution", "inherits fine-mapping and SNP-to-gene uncertainty"],
], LM, 1.55, CW);

// 9 take-home
L.takeHome(pres, "Three things to remember", [
  { head: "The unit of analysis is the genome, not the locus", sub: "Strength is borrowed across LD blocks" },
  { head: "Calibration holds in simulation", sub: "But only with a matched LD reference" },
  { head: "Use it where the GWAS is large", sub: "Power drops quickly below N ≈ 100k" },
]);

// 10 hidden backup, after the closing slide
s = L.supp(pres, "Glossary", "Terms used on the main slides");
L.rows(pres, s, [
  ["PIP", "posterior inclusion probability of a variant"],
  ["Credible set", "smallest set of variants holding ≥ 95% posterior mass"],
  ["LD block", "region treated as independent of its neighbours"],
], LM, 1.55, CW, { labelW: 2.6 });

pres.writeFile({ fileName: RAW }).then(f => console.log("wrote " + f));

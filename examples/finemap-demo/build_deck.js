// Fine-mapping demo: a methods-tutorial deck built with research-slides.
// All data are simulated by simulate.py; every number on a slide is read from
// results.json at build time, and all figures are drawn by simulate.py.
// Build: python simulate.py && RESEARCH_SLIDES=<skill>/scripts bash build.sh
const path = require("path");
const L = require(path.join(process.env.RESEARCH_SLIDES, "theme.js"));
const { C, LM, CW, PAD } = L;
const R = require(path.join(__dirname, "results.json"));
const RAW = process.env.RAW || path.join(__dirname, "_build/raw.pptx");
const FIG = f => path.join(__dirname, "figs", f);
const pct = x => Math.round(x * 1000) / 10 + "%";
const NB = " ";
const S = R.settings, E = R.example, D = R.diagnostic_example;
const pres = L.newDeck("Fine-mapping demo");

// 1 cover ------------------------------------------------------------------------
L.cover(pres, { meeting: "Methods tutorial", event: "Statistical genetics reading group · example deck",
  title: "Fine-mapping from summary statistics: a\u00a0worked example",
  lines: ["Single-effect model, credible sets and a z-score check", "All data simulated"],
  byline: "Example deck made with research-slides" });

// 2 the problem --------------------------------------------------------------------
let s = L.content(pres, "Fine-mapping usually starts from summary statistics",
  "Genotypes are hard to share; z-scores and reference LD are not");
L.flow(pres, s, [
  { head: "z-scores", body: "one per SNP, from the association study", accent: C.navy },
  { head: "LD matrix", body: "from a reference panel matched to the study", accent: C.navy },
  { head: "Fine-mapping", body: "which SNPs have nonzero effects?", accent: C.blue },
  { head: "PIPs and credible sets", body: "candidate causal variants", accent: C.teal },
], LM, 1.5, CW, 1.35, { fs: 14 });
L.headedCard(pres, s, LM, 3.35, 5.9, 1.65, "Individual-level genotypes",
  "Often unavailable for consent and privacy reasons", { fs: 16 });
L.headedCard(pres, s, LM + 6.27, 3.35, CW - 6.27, 1.65, "Summary statistics",
  "Widely shared, and enough for a first fine-mapping pass", { fs: 16, accent: C.teal });
s.addNotes("Fine-mapping narrows an association signal to a small set of candidate causal variants. " +
  "This deck walks through the simplest version, on simulated data, and two checks worth running before trusting it.");

// 3 the model ---------------------------------------------------------------------------
s = L.content(pres, "The single-effect model needs no LD matrix",
  "Assume exactly one causal SNP in the locus and a uniform prior over SNPs");
L.headedCard(pres, s, LM, 1.5, 6.8, 2.15, "Evidence for SNP j: approximate Bayes factor", null);
L.eq(s, "abf", LM + PAD, 2.05, 5.6, 1.2);
L.txt(s, `V${NB}=${NB}1/N, W = prior variance of the effect (prior sd ${S.prior_sd})`, LM + PAD, 3.2, 6.4, 0.35, { fs: 14 });
L.headedCard(pres, s, LM, 3.9, 6.8, 2.05, "Posterior inclusion probability", null);
L.eq(s, "pip", LM + PAD, 4.4, 4.2, 1.15);
L.rows(pres, s, [
  ["Credible set", "smallest SNP set whose\nPIPs sum to ≥ 0.95"],
  ["Inputs", "z-scores, N, prior sd"],
  ["Output", "one signal per locus"],
], LM + 7.2, 1.5, CW - 7.2, { labelW: 1.75, h: 1.335, gap: 0.22, fs: 15 });
s.addNotes("With one causal SNP and a uniform prior, PIP_j is the Bayes factor of SNP j normalised over the locus. " +
  "The credible set is built by adding SNPs in decreasing PIP until 95% of the posterior mass is covered. " +
  "Because only marginal z-scores enter, LD is used implicitly (through the z-scores) but no LD matrix is needed.");

// 4 simulation design -----------------------------------------------------------------
s = L.content(pres, "Simulation design", "Synthetic genotypes with local LD, a quantitative trait, marginal z-scores");
const cols = L.flow(pres, s, [
  { head: "Genotypes", body: "AR(1) latent haplotypes: neighbouring SNPs in LD", accent: C.navy },
  { head: "Trait", body: "1–2 causal SNPs + noise", accent: C.navy },
  { head: "z-scores", body: "one marginal test per SNP", accent: C.blue },
  { head: "Fine-mapping", body: "PIPs, 95% credible set", accent: C.teal },
], LM, 1.5, CW, 1.4, { fs: 14 });
[[S.snps_per_locus, "SNPs per locus"], [S.study_n.toLocaleString("en-US"), "study samples"],
 [S.loci_per_setting, "loci per setting"], [String(S.prior_sd), "prior sd of an effect"]]
  .forEach(([v, lab], i) => L.stat(s, String(v), lab, cols[i].x + PAD, 3.3, cols[i].w - PAD,
    { color: i === 3 ? C.teal : i === 2 ? C.blue : C.navy, fs: 32, labelFs: 15 }));
L.headedCard(pres, s, LM, 4.75, CW, 1.2, "Reproducible",
  `simulate.py, seed ${S.seed}; every number in this deck is read from its results.json`, { fs: 15, accent: C.teal });
s.addNotes(`Adjacent latent correlation drawn from ${S.adjacent_latent_rho.join("–")} per locus; minor allele frequency 0.05–0.5. ` +
  "Causal SNPs are placed away from the locus edges. The trait is standardized after simulation.");

// 5 worked example -------------------------------------------------------------------------
s = L.content(pres, "The lead SNP is not necessarily the causal one",
  "One simulated locus: the causal SNP is in the 95% credible set, but not on top");
let fb = L.image(s, FIG("locus.png"), { x: LM, y: 1.42, w: 6.5, h: 4.95 });
L.caption(s, "Simulated locus (simulate.py)", LM, fb.y + fb.h + 0.06, 6);
L.rows(pres, s, [
  ["Lead SNP", `|z|${NB}=${NB}${E.lead_abs_z}, PIP${NB}=${NB}${E.max_pip}`],
  ["Causal SNP", `|z|${NB}=${NB}${E.causal_abs_z}, PIP${NB}=${NB}${E.causal_pip}`],
  ["95% credible set", `${E.cs_size} SNPs; causal SNP included`],
], LM + 6.9, 1.5, CW - 6.9, { labelW: 2.2, h: 1.0, gap: 0.25, fs: 15 });
L.headedCard(pres, s, LM + 6.9, 5.25, CW - 6.9, 0.8, "Report the set, not the top SNP", null, { accent: C.teal });
s.addNotes(`In this locus SNP ${E.lead_snp} has the largest |z| (${E.lead_abs_z}) and PIP ${E.max_pip}; the causal SNP ${E.causal_snp} ` +
  `has |z| ${E.causal_abs_z} and PIP ${E.causal_pip}, yet it is inside the ${E.cs_size}-SNP credible set. ` +
  "The locus was chosen to illustrate this case; across loci the lead SNP is often causal (next slide).");

// 6 calibration vs effect size ----------------------------------------------------------------
s = L.content(pres, "Credible sets keep their coverage; their size depends on effect size",
  "200 loci per setting, one causal SNP each");
const P = R.by_pve;
const maxSize = Math.max(...P.map(p => p.median_cs_size));
const y0 = L.headedCard(pres, s, LM, 1.5, 5.9, 3.0, "Median credible-set size (SNPs)", null);
P.forEach((p, i) => L.bar(pres, s, `PVE ${p.pve_percent}%`, p.median_cs_size, maxSize, LM + PAD, y0 + 0.2 + i * 0.6, 1.6, 3.1,
  { color: i === 2 ? C.blue : C.grey, bold: i === 2, text: String(p.median_cs_size) }));
const y1 = L.headedCard(pres, s, LM + 6.27, 1.5, CW - 6.27, 3.0, "Causal SNP with PIP > 0.5", null, { accent: C.teal });
P.forEach((p, i) => L.bar(pres, s, `PVE ${p.pve_percent}%`, p.causal_pip_gt_half, 1, LM + 6.27 + PAD, y1 + 0.2 + i * 0.6, 1.6, 3.2,
  { color: i === 2 ? C.teal : C.grey, bold: i === 2, text: pct(p.causal_pip_gt_half) }));
L.headedCard(pres, s, LM, 4.8, CW, 0.75,
  `Coverage of the 95% set: ${P.map(p => pct(p.coverage) + " at PVE " + p.pve_percent + "%").join(" · ")}`, null, { accent: C.navy });
s.addNotes("PVE = variance in the trait explained by the causal SNP. Coverage = share of loci whose 95% set contains the causal SNP. " +
  "Coverage stays at the nominal level or above because the model matches the simulation; set size shrinks quickly with effect size.");

// 7 two causal SNPs -----------------------------------------------------------------------------
s = L.content(pres, "With two causal SNPs, the model still reports one signal",
  "200 loci, two causal SNPs each (PVE 0.5% each)");
const T = R.two_causal;
L.stat(s, "1", "signal reported per locus", LM + PAD, 1.6, 3.6, { fs: 36, labelFs: 15 });
L.stat(s, pct(T.cs_has_a_causal), "of loci: set holds ≥\u00a01 causal SNP", LM + 4.3, 1.6, 3.8, { fs: 36, color: C.teal, labelFs: 15 });
L.stat(s, pct(T.cs_has_both), "of loci: both merged in one set", LM + 8.4, 1.6, 3.6, { fs: 36, color: C.orange, labelFs: 15 });
L.rows(pres, s, [
  ["What goes wrong", "the second signal is missed or blended into the first set"],
  ["What to use instead", "a multi-effect model that fits several signals jointly, using the LD matrix"],
], LM, 3.1, CW, { labelW: 2.9, h: 0.95, gap: 0.3, fs: 15 });
s.addNotes("The single-effect assumption is the main limitation of this simple model. " +
  "Multi-signal fine-mapping needs the LD matrix, which is why the z-score check on the next slide matters.");

// 8 z-score consistency check --------------------------------------------------------------------
s = L.content(pres, "Check z-scores against the LD reference before using it",
  "Predict each z from the other SNPs through the LD matrix; a flipped allele stands out");
fb = L.image(s, FIG("diagnostic.png"), { x: LM, y: 1.42, w: 5.4, h: 4.95 });
L.caption(s, "Simulated locus, one allele flipped in the reference", LM, fb.y + fb.h + 0.06, 5.6);
L.rows(pres, s, [
  ["Flipped SNP", `standardized difference |t|${NB}=${NB}${D.flipped_abs_t}`],
  ["All other SNPs", `|t|${NB}≤${NB}${D.max_abs_t_other}`],
], LM + 5.9, 1.5, CW - 5.9, { labelW: 2.3, h: 0.85, gap: 0.22, fs: 15 });
L.headedCard(pres, s, LM + 5.9, 3.64, CW - 5.9, 2.31, "Flipped SNP ranked first by |t|", null, { accent: C.teal });
R.flip.forEach((f, i) => L.bar(pres, s, `reference n${NB}=${NB}${f.reference_n.toLocaleString("en-US")}`, f.flipped_ranked_first, 1,
  LM + 5.9 + PAD, 4.24 + i * 0.52, 2.6, 2.05, { color: C.teal, text: `${Math.round(f.flipped_ranked_first * f.loci)}/${f.loci}` }));
s.addNotes("For each SNP, the expected z given all the others under the LD matrix (lightly regularized) is compared with the observed z. " +
  "A SNP whose alleles are coded differently in study and reference has its LD signs reversed and stands far off the diagonal. " +
  "In these simulations the reference came from the same model as the study, so detection was easy at every panel size; real panels are less well matched.");

// 9 limitations ------------------------------------------------------------------------------------
s = L.content(pres, "Limitations", "Of this demo, not of fine-mapping in general");
L.rows(pres, s, [
  ["One causal SNP", "the model cannot separate several signals in a locus"],
  ["Synthetic genotypes", "AR(1) haplotypes, not real LD blocks or recombination hot spots"],
  ["Matched reference", "the LD reference was drawn from the same model as the study"],
  ["Fixed prior", `one prior sd (${S.prior_sd}) for every effect; no functional annotation`],
  ["Quantitative trait", "marginal linear-regression z-scores only"],
], LM, 1.5, CW, { labelW: 3.0, h: 0.78, gap: 0.22, fs: 15 });

// 10 take-home ------------------------------------------------------------------------------------
s = L.takeHome(pres, "Three things to remember", [
  { head: "Report credible sets, not lead SNPs", sub: "The causal SNP can sit inside the set without being on top" },
  { head: "Set size tracks signal strength", sub: "Coverage held across settings; resolution did not" },
  { head: "Check z-scores against LD first", sub: "A flipped allele is easy to see before it misleads a multi-signal model" },
]);
s.addNotes("Numbers behind each point: slides 5, 6 and 8.");

// 11-12 hidden backups ------------------------------------------------------------------------------
s = L.supp(pres, "Simulation settings", "As recorded in results.json");
L.rows(pres, s, [
  ["Seed", String(S.seed)],
  ["Locus", `${S.snps_per_locus} SNPs; latent correlation of neighbours ${S.adjacent_latent_rho.join("–")}`],
  ["Study", `N${NB}=${NB}${S.study_n.toLocaleString("en-US")}; trait standardized; causal SNPs away from the edges`],
  ["Fine-mapping", `approximate Bayes factors, prior sd ${S.prior_sd}, uniform prior over SNPs`],
  ["z-score check", "LD matrix + 0.1 × identity, inverted once per locus"],
], LM, 1.5, CW, { labelW: 2.6, h: 0.72, gap: 0.2, fs: 15 });

s = L.supp(pres, "Glossary", "Terms used on the main slides");
L.rows(pres, s, [
  ["PIP", "posterior inclusion probability: the chance that SNP j is the causal one"],
  ["Credible set", "smallest set of SNPs holding at least 95% of the posterior probability"],
  ["Coverage", "share of loci whose credible set contains a causal SNP"],
  ["PVE", "proportion of trait variance explained by a causal SNP"],
  ["LD", "linkage disequilibrium: correlation between nearby SNPs"],
], LM, 1.5, CW, { labelW: 2.6, h: 0.72, gap: 0.2, fs: 15 });

pres.writeFile({ fileName: RAW }).then(f => console.log("wrote " + f));

#!/usr/bin/env python3
"""Simulations and figures for the fine-mapping demo deck. Everything is synthetic.

usage: python simulate.py            -> results.json, figs/*.png  (about a minute)

Model: genotypes from a latent AR(1) process along each locus (adjacent SNPs in LD),
a quantitative trait with 1 or 2 causal SNPs, marginal z-scores, and single-effect
fine-mapping with approximate Bayes factors (one causal SNP per locus, uniform prior).
A z-score consistency check predicts each z from the others through the LD matrix.
"""
import json, os
import numpy as np
from scipy.stats import norm
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

HERE = os.path.dirname(os.path.abspath(__file__))
SEED = 20261016
J = 200            # SNPs per locus
N = 5000           # study sample size
W = 0.01           # prior variance of a standardized effect (prior sd 0.1)
N_LOCI = 200
RHO = (0.97, 0.995) # range of the latent AR(1) correlation between adjacent SNPs

rng = np.random.default_rng(SEED)


def genotypes(n, rho, thr):
    """n x J allele counts from two latent AR(1) haplotypes."""
    g = np.zeros((n, J))
    for _ in range(2):
        u = rng.standard_normal(n)
        h = np.empty((n, J))
        for j in range(J):
            if j:
                u = rho * u + np.sqrt(1 - rho ** 2) * rng.standard_normal(n)
            h[:, j] = u > thr[j]
        g += h
    return g


def standardize(g):
    s = g.std(0)
    s[s == 0] = 1
    return (g - g.mean(0)) / s


def locus(n_ref=0, causal=1, pve=0.005):
    rho = rng.uniform(*RHO)
    thr = norm.ppf(1 - rng.uniform(0.05, 0.5, J))
    X = standardize(genotypes(N, rho, thr))
    c = rng.choice(np.arange(10, J - 10), causal, replace=False)
    y = X[:, c] @ np.full(causal, np.sqrt(pve)) + rng.standard_normal(N) * np.sqrt(1 - causal * pve)
    y = (y - y.mean()) / y.std()
    r = X.T @ y / N
    z = r * np.sqrt(N - 2) / np.sqrt(1 - r ** 2)
    out = {"z": z, "causal": c, "R_in": X.T @ X / N}
    if n_ref:
        Xr = standardize(genotypes(n_ref, rho, thr))
        out["R_ref"] = Xr.T @ Xr / n_ref
    return out


def finemap(z):
    """Single-effect PIPs from approximate Bayes factors, and the 95% credible set."""
    V = 1.0 / N
    lbf = 0.5 * np.log(V / (V + W)) + 0.5 * z ** 2 * W / (V + W)
    pip = np.exp(lbf - lbf.max())
    pip /= pip.sum()
    order = np.argsort(-pip)
    k = int(np.searchsorted(np.cumsum(pip[order]), 0.95) + 1)
    return pip, set(order[:k].tolist())


def consistency(z, R, lam=0.1):
    """Standardized difference between each z and its prediction from the other z's."""
    O = np.linalg.inv(R + lam * np.eye(len(z)))
    d = np.diag(O)
    pred = -(O @ z - d * z) / d
    return (z - pred) * np.sqrt(d), pred


res = {"settings": {"seed": SEED, "snps_per_locus": J, "study_n": N, "prior_sd": float(np.sqrt(W)),
                    "loci_per_setting": N_LOCI, "adjacent_latent_rho": list(RHO)}}

# 1. worked example ------------------------------------------------------------
while True:
    ex = locus(pve=0.006)
    pip, cs = finemap(ex["z"])
    c0 = int(ex["causal"][0])
    lead = int(np.argmax(np.abs(ex["z"])))
    if c0 in cs and 3 <= len(cs) <= 8 and lead != c0:   # an instructive locus: lead SNP is not the causal one
        break
res["example"] = {"causal_snp": c0 + 1, "lead_snp": lead + 1, "lead_abs_z": round(float(abs(ex["z"][lead])), 1),
                  "causal_abs_z": round(float(abs(ex["z"][c0])), 1), "causal_pip": round(float(pip[c0]), 2),
                  "cs_size": len(cs), "max_pip": round(float(pip.max()), 2)}

# 2. calibration and resolution vs effect size ----------------------------------
res["by_pve"] = []
for pve in (0.002, 0.005, 0.01):
    cov, size, hit = [], [], []
    for _ in range(N_LOCI):
        L = locus(pve=pve)
        pip, cs = finemap(L["z"])
        c = int(L["causal"][0])
        cov.append(c in cs); size.append(len(cs)); hit.append(pip[c] > 0.5)
    res["by_pve"].append({"pve_percent": pve * 100, "coverage": round(float(np.mean(cov)), 3),
                          "median_cs_size": float(np.median(size)), "causal_pip_gt_half": round(float(np.mean(hit)), 3)})

# 3. two causal SNPs: the single-effect assumption breaks -----------------------
one, both = [], []
for _ in range(N_LOCI):
    L = locus(causal=2, pve=0.005)
    _, cs = finemap(L["z"])
    k = sum(int(c) in cs for c in L["causal"])
    one.append(k >= 1); both.append(k == 2)
res["two_causal"] = {"cs_has_a_causal": round(float(np.mean(one)), 3), "cs_has_both": round(float(np.mean(both)), 3)}

# 4. flipped allele in the reference panel ---------------------------------------
res["flip"] = []
for n_ref in (200, 1000, 5000):
    top, ranks = [], []
    for _ in range(N_LOCI):
        L = locus(n_ref=n_ref, pve=0.01)
        z, R = L["z"], L["R_ref"].copy()
        cand = [j for j in np.where(np.abs(z) > 3)[0] if j not in set(L["causal"].tolist())]
        if not cand:
            continue
        f = int(rng.choice(cand))
        R[f, :] *= -1; R[:, f] *= -1          # the flipped SNP's correlations change sign
        t, _ = consistency(z, R)
        rank = int((np.abs(t) > abs(t[f])).sum()) + 1
        top.append(rank == 1); ranks.append(rank)
    res["flip"].append({"reference_n": n_ref, "loci": len(top), "flipped_ranked_first": round(float(np.mean(top)), 3),
                        "median_rank": float(np.median(ranks))})

# figures --------------------------------------------------------------------------
plt.rcParams.update({"font.family": "Arial", "font.size": 13, "axes.spines.top": False,
                     "axes.spines.right": False, "axes.edgecolor": "#5E6B6F", "axes.labelcolor": "#162B43",
                     "xtick.color": "#40546C", "ytick.color": "#40546C"})
NAVY, BLUE, TEAL, ORANGE, GREY = "#162B43", "#315DA8", "#167E82", "#BC5318", "#A7B8CC"
os.makedirs(os.path.join(HERE, "figs"), exist_ok=True)
pos = np.arange(1, J + 1)
pip, cs = finemap(ex["z"])
csl = sorted(cs)
fig, ax = plt.subplots(2, 1, figsize=(6.6, 5.0), sharex=True, gridspec_kw={"hspace": 0.28})
ax[0].scatter(pos, np.abs(ex["z"]), s=14, color=GREY)
ax[0].scatter(pos[csl], np.abs(ex["z"][csl]), s=22, color=BLUE, label="95% credible set")
ax[0].scatter(pos[c0], abs(ex["z"][c0]), s=150, marker="^", facecolors="none", edgecolors=ORANGE, linewidths=2, zorder=3, label="causal SNP")
ax[0].set_ylabel("|z|")
ax[0].legend(frameon=False, fontsize=11, loc="lower left", bbox_to_anchor=(0, 1.0), ncol=2, borderaxespad=0.2)
ax[1].scatter(pos, pip, s=14, color=GREY)
ax[1].scatter(pos[csl], pip[csl], s=22, color=BLUE)
ax[1].scatter(pos[c0], pip[c0], s=150, marker="^", facecolors="none", edgecolors=ORANGE, linewidths=2, zorder=3)
ax[1].set_ylabel("PIP"); ax[1].set_xlabel("SNP position in locus"); ax[1].set_ylim(-0.03, 1.03)
fig.savefig(os.path.join(HERE, "figs", "locus.png"), dpi=250, bbox_inches="tight"); plt.close(fig)

# diagnostic figure: one locus with a flipped SNP, reference n = 5000
while True:
    L = locus(n_ref=5000, pve=0.01)
    z, R = L["z"], L["R_ref"].copy()
    cand = [j for j in np.where(np.abs(z) > 3)[0] if j not in set(L["causal"].tolist())]
    if cand:
        break
f = int(rng.choice(cand)); R[f, :] *= -1; R[:, f] *= -1
t, pred = consistency(z, R)
res["diagnostic_example"] = {"flipped_abs_t": round(float(abs(t[f])), 1),
                             "max_abs_t_other": round(float(np.max(np.abs(np.delete(t, f)))), 1)}
fig, ax = plt.subplots(figsize=(5.2, 5.0))
lim = [min(z.min(), pred.min()) - 1, max(z.max(), pred.max()) + 1]
ax.plot(lim, lim, ls=":", color="#5E6B6F", lw=1)
ax.scatter(pred, z, s=16, color=GREY)
ax.scatter(pred[f], z[f], s=90, color=ORANGE, zorder=3)
ax.annotate("flipped SNP", (pred[f], z[f]), xytext=(12, -4), textcoords="offset points", color=ORANGE, fontsize=12)
ax.set_xlabel("z predicted from the other SNPs"); ax.set_ylabel("observed z")
fig.savefig(os.path.join(HERE, "figs", "diagnostic.png"), dpi=250, bbox_inches="tight"); plt.close(fig)

json.dump(res, open(os.path.join(HERE, "results.json"), "w"), indent=1)
print(json.dumps(res, indent=1))

#!/usr/bin/env python3
"""Show what the user changed: compare a freshly built deck with their edited copy.

usage: python diff_decks.py built.pptx edited.pptx

For each slide of the edited deck, finds the best-matching built slide by text
overlap and prints the slide-level changes (hidden flag, word count, title,
lines added/removed). Use it before touching a deck the user has opened in
PowerPoint: their edits live only in the .pptx, so rebuilding from the JS
would silently discard them.

Also lists shapes the user moved or resized (> 0.02 in), matched by shape name.
Text is XML-unescaped and slide-number fields are skipped, so &apos; vs ' and
"<number>" vs "7" no longer show up as edits.

Note: PowerPoint adds one extra <p:sp> per native equation on re-save (the
math fallback), so shape-count changes on equation slides are not user edits.
"""
import difflib, html, re, sys, zipfile


def slides(path):
    z = zipfile.ZipFile(path)
    pres = z.read("ppt/presentation.xml").decode()
    rels = z.read("ppt/_rels/presentation.xml.rels").decode()
    tgt = {}
    for m in re.finditer(r"<Relationship\b[^>]*>", rels):
        tag = m.group(0)
        tgt[re.search(r'Id="([^"]+)"', tag).group(1)] = re.search(r'Target="([^"]+)"', tag).group(1)
    out = []
    for rid in re.findall(r'<p:sldId\b[^>]*r:id="([^"]+)"', pres):
        x = z.read("ppt/" + tgt[rid].lstrip("/").replace("ppt/", "", 1)).decode()
        hidden = bool(re.search(r'\sshow="0"', re.search(r"<p:sld\b[^>]*>", x).group(0)))
        paras = []
        for p in re.findall(r"<a:p>.*?</a:p>", x, flags=re.S):
            p = re.sub(r"<a:fld\b[^>]*type=\"slidenum\".*?</a:fld>", "", p, flags=re.S)   # page-number field
            t = html.unescape("".join(re.findall(r"<a:t(?:\s[^>]*)?>([^<]*)</a:t>", p))).strip()
            if t:
                paras.append(t)
        geo = {}
        for m in re.finditer(r"<p:(sp|pic|graphicFrame|cxnSp)>.*?</p:\1>", x, flags=re.S):
            nm = re.search(r'<p:cNvPr id="\d+" name="([^"]*)"', m.group(0))
            g = re.search(r'<a:off x="(-?\d+)" y="(-?\d+)"/>\s*<a:ext cx="(\d+)" cy="(\d+)"', m.group(0))
            if nm and g:
                geo.setdefault(nm.group(1), tuple(int(v) / 914400 for v in g.groups()))
        out.append({"hidden": hidden, "paras": paras, "words": sum(len(t.split()) for t in paras), "geo": geo})
    return out


def _norm(w):
    return re.sub(r"[^\w%<>=≈→.-]", "", w.lower()).strip(".")


def word_changes(a_paras, b_paras):
    """Word-level diff that ignores line re-wrapping, spacing and quote style."""
    a, b = " ".join(a_paras).split(), " ".join(b_paras).split()
    sm = difflib.SequenceMatcher(None, [_norm(w) for w in a], [_norm(w) for w in b], autojunk=False)
    out = []
    for op, i1, i2, j1, j2 in sm.get_opcodes():
        if op == "equal":
            continue
        if i2 > i1 and any(_norm(w) for w in a[i1:i2]):
            out.append(("-", " ".join(a[i1:i2])))
        if j2 > j1 and any(_norm(w) for w in b[j1:j2]):
            out.append(("+", " ".join(b[j1:j2])))
    return out


def sim(a, b):
    return difflib.SequenceMatcher(None, " ".join(a["paras"]), " ".join(b["paras"])).ratio()


def main():
    built, edited = slides(sys.argv[1]), slides(sys.argv[2])
    used = set()
    print(f"built {len(built)} slides  ->  edited {len(edited)} slides\n")
    for j, e in enumerate(edited, 1):
        best = max(((sim(b, e), i) for i, b in enumerate(built, 1)), default=(0, None))
        score, i = best
        if i is None or score < 0.25:
            print(f"[edited {j}] NEW slide ({e['words']} words): {e['paras'][:1]}")
            continue
        used.add(i)
        b = built[i - 1]
        head = f"[edited {j} <- built {i}] match {score:.2f}"
        if b["hidden"] != e["hidden"]:
            head += f" | hidden {b['hidden']}->{e['hidden']}"
        head += f" | words {b['words']}->{e['words']}"
        print(head)
        if b["paras"][:1] != e["paras"][:1]:
            print(f"    first line: {b['paras'][:1]} -> {e['paras'][:1]}")
        for sign, phrase in word_changes(b["paras"], e["paras"])[:10]:
            print(f"    {sign} {phrase[:110]}")
        moved = [(k, b["geo"][k], v) for k, v in e["geo"].items() if k in b["geo"] and any(abs(p - q) > 0.02 for p, q in zip(b["geo"][k], v))]
        for k, g0, g1 in moved[:8]:
            print(f"    moved/resized {k}: {tuple(round(v, 2) for v in g0)} -> {tuple(round(v, 2) for v in g1)}")
    gone = [i for i in range(1, len(built) + 1) if i not in used]
    if gone:
        print(f"\nbuilt slides with no counterpart (deleted by the user): {gone}")


if __name__ == "__main__":
    main()

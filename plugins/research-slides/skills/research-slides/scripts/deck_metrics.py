#!/usr/bin/env python3
"""Per-slide density and typography audit for a .pptx (standard library only).

usage:  python deck_metrics.py deck.pptx [--json out.json]

Prints one row per slide (hidden slides marked H) and a deck summary, and flags
slides that break the research-slides targets. Exit code 1 if any VISIBLE slide is
flagged, so build.sh can stop on it.

Thresholds were calibrated against hand-edited final decks (visible-slide
median 112-116 words, max 175) and the drafts they were cut down from (median
193 words, 81-97% of characters under 14 pt on every slide). FLAG = the draft
pattern removed by hand; WARN = small labels inside drawn diagrams, which the
finals also contain.
Treat a flag as "look at this slide again", not as a hard rule.
"""
import json, re, statistics as st, sys, zipfile
import xml.etree.ElementTree as ET

NS = {"p": "http://schemas.openxmlformats.org/presentationml/2006/main",
      "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
      "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships"}
EMU = 914400.0
MAX_WORDS = 180        # visible slide, excluding speaker notes (FLAG)
MEDIAN_WORDS = 130     # deck-level target for visible slides (WARN)
HARD_PT = 9            # any text below this is a FLAG
MIN_PT = 10.5          # text between HARD_PT and this is a WARN (diagram labels)
BODY_PT = 14           # body text floor
SMALL_SHARE = 0.5      # FLAG if more than this share of characters is below BODY_PT
TITLE_CHARS = 75       # ~one line at 24 pt Arial across the content width


def slide_parts(z):
    pres = ET.fromstring(z.read("ppt/presentation.xml"))
    rels = {r.get("Id"): r.get("Target") for r in ET.fromstring(z.read("ppt/_rels/presentation.xml.rels"))}
    out = []
    for s in pres.find("p:sldIdLst", NS):
        t = rels[s.get("{%s}id" % NS["r"])]
        out.append("ppt/" + t.lstrip("/").replace("ppt/", "", 1))
    return out


def notes_chars(z, part):
    rp = part.replace("slides/", "slides/_rels/") + ".rels"
    if rp not in z.namelist():
        return 0
    for r in ET.fromstring(z.read(rp)):
        if r.get("Type").endswith("/notesSlide"):
            nx = ET.fromstring(z.read("ppt/notesSlides/" + r.get("Target").rsplit("/", 1)[-1]))
            words = " ".join(t.text or "" for t in nx.iter("{%s}t" % NS["a"])).split()
            return sum(1 for w in words if not (w.isdigit() or w == "<number>"))  # slide-number field
    return 0


def audit(path):
    z = zipfile.ZipFile(path)
    rows = []
    for i, part in enumerate(slide_parts(z), 1):
        root = ET.fromstring(z.read(part))
        hidden = root.get("show") == "0"
        words, chars, small, tiny, title = 0, 0, 0, [], ""
        top_title = None
        for sp in root.iter("{%s}sp" % NS["p"]):
            off = sp.find(".//a:xfrm/a:off", NS)
            y = int(off.get("y")) / EMU if off is not None else 9
            text, sizes = "", []
            for r in sp.iter("{%s}r" % NS["a"]):
                t = (r.find("a:t", NS).text or "") if r.find("a:t", NS) is not None else ""
                rp = r.find("a:rPr", NS)
                sz = int(rp.get("sz")) / 100 if rp is not None and rp.get("sz") else None
                text += t
                if t.strip():
                    chars += len(t)
                    if sz is not None:
                        sizes.append(sz)
                        if sz < BODY_PT:
                            small += len(t)
                        if sz < MIN_PT and not t.startswith("EQMARK_"):
                            tiny.append(sz)
            words += len(text.split())
            if y < 0.75 and sizes and max(sizes) >= 20 and (top_title is None or y < top_title[0]):
                top_title = (y, text.strip())
        # table text lives in p:graphicFrame/a:tbl, not in p:sp; without this a slide that is one
        # big table reported ~10 words and 0% small type
        for tbl in root.iter("{%s}tbl" % NS["a"]):
            for tc in tbl.iter("{%s}tc" % NS["a"]):
                text = ""
                for r in tc.iter("{%s}r" % NS["a"]):
                    t = (r.find("a:t", NS).text or "") if r.find("a:t", NS) is not None else ""
                    rp = r.find("a:rPr", NS)
                    sz = int(rp.get("sz")) / 100 if rp is not None and rp.get("sz") else None
                    text += t
                    if t.strip():
                        chars += len(t)
                        if sz is not None:
                            if sz < BODY_PT:
                                small += len(t)
                            if sz < MIN_PT:
                                tiny.append(sz)
                words += len(text.split())
        title = top_title[1] if top_title else ""
        flags, warns = [], []
        if words > MAX_WORDS:
            flags.append(f"words {words}>{MAX_WORDS}")
        if tiny and min(tiny) < HARD_PT:
            flags.append(f"text <{HARD_PT}pt ({min(tiny):g})")
        elif tiny:
            warns.append(f"text {min(tiny):g}pt")
        if chars and small / chars > SMALL_SHARE:
            flags.append(f"{100 * small / chars:.0f}% chars <{BODY_PT}pt")
        if len(title) > TITLE_CHARS:
            flags.append(f"title {len(title)} chars")
        rows.append({"n": i, "hidden": hidden, "words": words, "notes_words": notes_chars(z, part),
                     "small_share": round(small / chars, 2) if chars else 0,
                     "title": title, "flags": flags, "warns": warns})
    return rows


def main():
    path = sys.argv[1]
    rows = audit(path)
    vis = [r for r in rows if not r["hidden"]]
    print(f"{'#':>3} {'':1} {'words':>5} {'notes':>5} {'<14pt':>5}  title / flags")
    for r in rows:
        print(f"{r['n']:>3} {'H' if r['hidden'] else ' '} {r['words']:>5} {r['notes_words']:>5} "
              f"{r['small_share']:>5.0%}  {r['title'][:60]}" + ("   <-- FLAG " + "; ".join(r["flags"]) if r["flags"] else "")
              + ("   (warn: " + "; ".join(r["warns"]) + ")" if r["warns"] else ""))
    if vis:
        w = [r["words"] for r in vis]
        print(f"\nvisible {len(vis)} / total {len(rows)} | words per visible slide: median {st.median(w):g}, "
              f"max {max(w)} | slides without notes: {sum(1 for r in vis if r['notes_words'] == 0)}")
        if st.median(w) > MEDIAN_WORDS:
            print(f"WARN deck median {st.median(w):g} words > {MEDIAN_WORDS}: cut text or move it to notes / (Supp.)")
    if "--json" in sys.argv:
        json.dump(rows, open(sys.argv[sys.argv.index("--json") + 1], "w"), indent=1, ensure_ascii=False)
    bad = [r["n"] for r in vis if r["flags"]]
    if bad:
        print(f"FLAGGED visible slides: {bad}")
        sys.exit(1)


if __name__ == "__main__":
    main()

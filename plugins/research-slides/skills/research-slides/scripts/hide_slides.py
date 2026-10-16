#!/usr/bin/env python3
"""Assert (and if needed re-apply) hidden-slide flags after the LibreOffice re-save.

usage:  python hide_slides.py in.pptx out.pptx 18 19 20 ...

Slide numbers are positions in the deck as shown in PowerPoint (1-based), resolved
through ppt/presentation.xml, not the slideN.xml file names.

The re-save does preserve show="0" (measured). This step is an idempotent GUARD:
it checks the <p:sld> ROOT ELEMENT itself (the root tag is ~450 characters of
namespace declarations, so a fixed-width prefix check gives false negatives),
adds show="0" only where missing, and exits non-zero if it cannot, so a deck
never ships with its backup slides visible.
"""
import re, sys, zipfile


def deck_order(data):
    pres = data["ppt/presentation.xml"].decode("utf-8")
    rels = data["ppt/_rels/presentation.xml.rels"].decode("utf-8")
    target = {m.group(1): m.group(2) for m in
              re.finditer(r'<Relationship[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"', rels)}
    target.update({m.group(2): m.group(1) for m in
                   re.finditer(r'<Relationship[^>]*Target="([^"]+)"[^>]*Id="([^"]+)"', rels)})
    ids = re.findall(r'<p:sldId\b[^>]*r:id="([^"]+)"', pres)
    return ["ppt/" + target[i].lstrip("/").replace("ppt/", "", 1) for i in ids]


def main():
    if len(sys.argv) < 4:
        sys.exit("usage: hide_slides.py in.pptx out.pptx <slide numbers...>")
    src, dst = sys.argv[1], sys.argv[2]
    want = sorted({int(a) for a in sys.argv[3:]})
    with zipfile.ZipFile(src) as zin:
        names = zin.namelist()
        data = {n: zin.read(n) for n in names}
    order = deck_order(data)
    bad = [n for n in want if n < 1 or n > len(order)]
    if bad:
        sys.exit(f"ERROR: deck has {len(order)} slides; cannot hide {bad}")

    done = []
    for n in want:
        part = order[n - 1]
        x = data[part].decode("utf-8")
        m = re.search(r"<p:sld\b[^>]*>", x)
        if m is None:
            sys.exit(f"ERROR: no <p:sld> root in {part}")
        root = m.group(0)
        if re.search(r'\sshow="0"', root):
            done.append(n)
            continue
        new_root = re.sub(r'\sshow="[^"]*"', "", root)
        new_root = new_root[:-1].rstrip("/") + ' show="0"' + ("/>" if root.endswith("/>") else ">")
        data[part] = (x[:m.start()] + new_root + x[m.end():]).encode("utf-8")
        done.append(n)

    with zipfile.ZipFile(dst, "w", zipfile.ZIP_DEFLATED) as zo:
        for n in names:
            zo.writestr(n, data[n])
    # verify from the written file, not from memory
    with zipfile.ZipFile(dst) as z:
        d2 = {n: z.read(n) for n in z.namelist()}
    o2 = deck_order(d2)
    missing = [n for n in want
               if not re.search(r'\sshow="0"', re.search(r"<p:sld\b[^>]*>", d2[o2[n - 1]].decode()).group(0))]
    if missing:
        sys.exit(f"ERROR: slides still visible after guard: {missing}")
    print(f"hidden: {done} -> {dst}")


if __name__ == "__main__":
    main()

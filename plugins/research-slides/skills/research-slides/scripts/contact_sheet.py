#!/usr/bin/env python3
"""Whole-deck contact sheet from render.sh output (needs Pillow).

usage: python contact_sheet.py deck.pptx OUTDIR   -> OUTDIR/contact_sheet.jpg

Slide-by-slide QA cannot see deck-level faults (a missing cover, no closing
slide, every slide with the same rhythm). Look at this sheet before calling a
deck done. Red label = hidden slide.
"""
import glob, os, re, sys, zipfile
from PIL import Image, ImageDraw


def hidden_flags(deck):
    z = zipfile.ZipFile(deck)
    pres = z.read("ppt/presentation.xml").decode()
    rels = z.read("ppt/_rels/presentation.xml.rels").decode()
    tgt = {}
    for m in re.finditer(r"<Relationship\b[^>]*>", rels):
        tag = m.group(0)
        i, t = re.search(r'Id="([^"]+)"', tag), re.search(r'Target="([^"]+)"', tag)
        tgt[i.group(1)] = t.group(1)
    out = []
    for rid in re.findall(r'<p:sldId\b[^>]*r:id="([^"]+)"', pres):
        x = z.read("ppt/" + tgt[rid].lstrip("/").replace("ppt/", "", 1)).decode()
        out.append(bool(re.search(r'\sshow="0"', re.search(r"<p:sld\b[^>]*>", x).group(0))))
    return out


def main():
    deck, out = sys.argv[1], sys.argv[2]
    files = sorted(glob.glob(os.path.join(out, "p-*.jpg")), key=lambda f: int(re.search(r"-(\d+)\.jpg$", f).group(1)))
    hid = hidden_flags(deck)
    if len(files) != len(hid):
        print(f"WARNING: {len(files)} images but {len(hid)} slides; labels may be off")
    ims = [Image.open(f) for f in files]
    tw = 480
    th = int(ims[0].height * tw / ims[0].width)
    cols = 4
    rows = (len(ims) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * (tw + 8) + 8, rows * (th + 8) + 8), (200, 200, 200))
    d = ImageDraw.Draw(sheet)
    for i, im in enumerate(ims):
        x, y = 8 + (i % cols) * (tw + 8), 8 + (i // cols) * (th + 8)
        sheet.paste(im.resize((tw, th)), (x, y))
        h = i < len(hid) and hid[i]
        d.rectangle([x, y, x + 34, y + 16], fill=(190, 30, 30) if h else (20, 20, 20))
        d.text((x + 4, y + 2), f"{i + 1}{'H' if h else ''}", fill="white")
    p = os.path.join(out, "contact_sheet.jpg")
    sheet.save(p, quality=85)
    print(f"{len(ims)} slides -> {p}")


if __name__ == "__main__":
    main()

"""Draw the example deck's placeholder figure (a simulated PIP plot).
usage: python make_placeholder.py placeholder.png"""
import random, sys
from PIL import Image, ImageDraw, ImageFont

F = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 30)
INK = (70, 80, 90)
W, H = 1200, 860
x0, x1, y0, y1 = 190, 1160, 60, 740            # plot area
im = Image.new("RGB", (W, H), "white")
d = ImageDraw.Draw(im)
d.line([(x0, y1), (x1, y1)], fill=(90, 100, 110), width=3)
d.line([(x0, y0), (x0, y1)], fill=(90, 100, 110), width=3)
for k in range(5):
    yy = y1 - (y1 - y0) * k / 4
    d.line([(x0 - 10, yy), (x0, yy)], fill=(90, 100, 110), width=3)
    t = f"{k * 0.25:.2f}"
    d.text((x0 - 18 - d.textlength(t, font=F), yy - 17), t, fill=INK, font=F)
t = "variant position"
d.text(((x0 + x1) / 2 - d.textlength(t, font=F) / 2, y1 + 38), t, fill=INK, font=F)
lab = Image.new("RGBA", (int(d.textlength("PIP", font=F)) + 4, 36), (255, 255, 255, 0))
ImageDraw.Draw(lab).text((2, 0), "PIP", fill=INK, font=F)
lab = lab.rotate(90, expand=True)
im.paste(lab, (24, (y0 + y1) // 2 - lab.size[1] // 2), lab)   # centred on the y-axis
random.seed(1)
pts = [(random.uniform(x0 + 15, x1 - 15), min(0.08, abs(random.gauss(0, 0.03)))) for _ in range(260)]
pts += [(640, 0.93), (652, 0.71), (668, 0.55)]
for x, p in pts:
    yy = y1 - (y1 - y0) * p
    r = 8 if p > 0.5 else 6
    d.ellipse([x - r, yy - r, x + r, yy + r], fill=(49, 93, 168) if p > 0.5 else (160, 170, 180))
im.save(sys.argv[1])

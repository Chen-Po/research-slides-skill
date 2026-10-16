#!/usr/bin/env python3
"""Generic OMML equation injector for pptxgenjs decks (research-slides skill).

A deck keeps its equations in its own file, e.g. build dir `equations.py`:

    import os, sys; sys.path.insert(0, os.environ["RESEARCH_SLIDES"])
    from omml_lib import *
    EQS["pip"] = lambda: omath(r("PIP"), r(" = "), frac(r("a"), r("b")))
    EQ_SIZE = {"pip": 1400}          # hundredths of a point, REQUIRED per equation
    if __name__ == "__main__":
        main(EQS, EQ_SIZE)           # python equations.py in.pptx out.pptx

theme.js `eq(s, name, ...)` writes the EQMARK_<name> placeholder this replaces.
This injector FAILS LOUDLY on an unknown equation or a missing EQ_SIZE entry;
earlier versions fell through silently (MISSING_ text in the deck / a 16 pt default).

Traps this code already handles (do not undo):
  * LibreOffice re-imports OMML via StarMath; keywords such as ge gt le lt ne in
    sum log exp next to other letters are re-tokenised and destroy the equation.
    _split_sm() isolates each keyword in its own run.
  * Every math run carries an explicit <a:rPr sz>; without it size is inherited
    unpredictably and equations render 2-3x too wide.
  * Never put literal ( ) inside one run with letters: use delim().
"""
import sys, re, zipfile

M = "http://schemas.openxmlformats.org/officeDocument/2006/math"
A14 = "http://schemas.microsoft.com/office/drawing/2010/main"
_SZ = [1600]
# ---------------------------------------------------------------- StarMath --
# LibreOffice imports OMML by converting it to StarMath, where ge / gt / le / lt
# / ne (and a few others) are COMPARISON KEYWORDS. A math text run containing one
# of them adjacent to other characters is re-tokenised on the round-trip and the
# equation is corrupted or destroyed outright — e.g. "1,gt" came back as "1,&gt;"
# and "ge(t')" lost its "ge". Isolating each keyword in its own run survives.
_SM_KEYWORDS = ("ge", "gt", "le", "lt", "ne", "eq", "in", "over", "times",
                "sum", "int", "sqrt", "func", "abs", "fact", "lim", "log",
                "ln", "exp", "sin", "cos", "tan", "left", "right", "size")

def _split_sm(t):
    """Split a math string so no run contains a StarMath keyword next to other text."""
    out, i = [], 0
    while i < len(t):
        for kw in _SM_KEYWORDS:
            if t.startswith(kw, i):
                nxt = t[i + len(kw): i + len(kw) + 1]
                prv = t[i - 1: i] if i else ""
                # only a hazard when it sits against other alphanumerics
                if not (prv.isalnum() and nxt.isalnum()):
                    out.append(t[:i]); out.append(kw); t = t[i + len(kw):]; i = 0
                    break
        else:
            i += 1
            continue
    out.append(t)
    return [p for p in out if p]

def esc(t):
    return t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

def _rpr(italic):
    """The <a:rPr> PowerPoint puts on every math run — this is what fixes sizing."""
    return f'<a:rPr sz="{_SZ[0]}" i="{1 if italic else 0}"/>'

def r(t, roman=False):
    """A math run. roman=True -> upright (operators, multi-letter names like Var, E).

    Emits one <m:r> per StarMath-safe fragment (see _split_sm)."""
    mpr = "<m:rPr><m:lit/><m:nor/></m:rPr>" if roman else ""
    return "".join(f"<m:r>{mpr}{_rpr(not roman)}"
                   f'<m:t xml:space="preserve">{esc(part)}</m:t></m:r>'
                   for part in _split_sm(t))

def ctrl(italic=False):
    """Control properties — sizes the delimiter/fraction/radical glyphs themselves."""
    return f'<m:ctrlPr><a:rPr sz="{_SZ[0]}" i="{1 if italic else 0}"/></m:ctrlPr>'

def ssub(b, s):      return f"<m:sSub>{ctrl()}<m:e>{b}</m:e><m:sub>{s}</m:sub></m:sSub>"
def ssup(b, s):      return f"<m:sSup>{ctrl()}<m:e>{b}</m:e><m:sup>{s}</m:sup></m:sSup>"
def ssubsup(b, sb, sp):
    return f"<m:sSubSup>{ctrl()}<m:e>{b}</m:e><m:sub>{sb}</m:sub><m:sup>{sp}</m:sup></m:sSubSup>"
def delim(body, o="(", c=")"):
    return (f'<m:d><m:dPr><m:begChr m:val="{o}"/><m:endChr m:val="{c}"/>'
            f"<m:grow m:val=\"1\"/>{ctrl()}</m:dPr><m:e>{body}</m:e></m:d>")
def nary(sub_, body, chrv="∑"):
    return (f'<m:nary><m:naryPr><m:chr m:val="{chrv}"/><m:limLoc m:val="undOvr"/>'
            f"<m:supHide m:val=\"1\"/>{ctrl()}</m:naryPr><m:sub>{sub_}</m:sub><m:sup/>"
            f"<m:e>{body}</m:e></m:nary>")
def naryd(sub_, sup_, body, chrv="\u2211"):
    """n-ary operator with BOTH limits shown (nary() hides the upper limit)."""
    return (f'<m:nary><m:naryPr><m:chr m:val="{chrv}"/><m:limLoc m:val="undOvr"/>'
            f"{ctrl()}</m:naryPr><m:sub>{sub_}</m:sub><m:sup>{sup_}</m:sup>"
            f"<m:e>{body}</m:e></m:nary>")
def frac(num, den):
    return (f'<m:f><m:fPr><m:type m:val="bar"/>{ctrl()}</m:fPr>'
            f"<m:num>{num}</m:num><m:den>{den}</m:den></m:f>")
def rad(body):
    return (f'<m:rad><m:radPr><m:degHide m:val="1"/>{ctrl()}</m:radPr>'
            f"<m:deg/><m:e>{body}</m:e></m:rad>")
def acc(body, chrv="̂"):
    return f'<m:acc><m:accPr><m:chr m:val="{chrv}"/>{ctrl()}</m:accPr><m:e>{body}</m:e></m:acc>'

def vs(v, s, rs=False): return ssub(r(v), r(s, rs))
def vp(v, s):           return ssup(r(v), r(s))
def omath(*p):          return "<m:oMath>" + "".join(p) + "</m:oMath>"

EQS = {}


def block(name, EQS, EQ_SIZE, size=None):
    if size is None:
        if name not in EQ_SIZE:
            raise SystemExit(f"ERROR: equation '{name}' has no EQ_SIZE entry")
        size = EQ_SIZE[name]
    _SZ[0] = size
    return (f'<a14:m xmlns:a14="{A14}"><m:oMathPara xmlns:m="{M}">'
            f"{EQS[name]()}</m:oMathPara></a14:m>")


def inject(xml, EQS, EQ_SIZE):
    """Replace each <a:r>...EQMARK_name[__size]...</a:r> with a native equation."""
    n = 0
    while True:
        m = re.search(r"EQMARK_([A-Za-z0-9]+)(?:__(\d+))?", xml)
        if not m:
            return xml, n
        name, size = m.group(1), (int(m.group(2)) if m.group(2) else None)
        if name not in EQS:
            raise SystemExit(f"ERROR: EQMARK_{name} has no entry in EQS")
        rs, re_ = xml.rfind("<a:r>", 0, m.start()), xml.find("</a:r>", m.start())
        xml = xml[:rs] + block(name, EQS, EQ_SIZE, size) + xml[re_ + len("</a:r>"):]
        n += 1


def main(EQS, EQ_SIZE):
    src, dst = sys.argv[1], sys.argv[2]
    with zipfile.ZipFile(src) as zin:
        data = {n: zin.read(n) for n in zin.namelist()}
    total = 0
    for n in list(data):
        if re.match(r"ppt/slides/slide\d+\.xml$", n):
            x = data[n].decode("utf-8")
            if "EQMARK_" in x:
                x, k = inject(x, EQS, EQ_SIZE)
                data[n] = x.encode("utf-8")
                total += k
    with zipfile.ZipFile(dst, "w", zipfile.ZIP_DEFLATED) as zo:
        for n, b in data.items():
            zo.writestr(n, b)
    print(f"injected {total} native equation(s) -> {dst}")

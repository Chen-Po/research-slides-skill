# Known traps

Each of these cost real time on an earlier deck. Most are silent: the build succeeds and
the deck is wrong.

## Equations (OMML)

1. **StarMath keywords destroy equations.** LibreOffice imports OMML via StarMath, where
   `ge gt le lt ne eq in over times sum int sqrt log ln exp sin cos lim abs left right
   size …` are keywords. Next to other letters in one run they are re-tokenised:
   `ge(t′)` lost `ge`, `1,gt` became `1,&gt;`, and one whole equation collapsed to `E`.
   `omml_lib._split_sm()` isolates them — always build runs with `r()`.
2. **Every math run needs an explicit `<a:rPr sz>`** (and every `<m:ctrlPr>`), or size is
   inherited unpredictably and equations render 2–3× too wide. `omml_lib` does this.
3. **Literal parentheses inside a run with letters** break on the round trip; use
   `delim()`.
4. **Visual checks are not enough.** A `¿` glyph that looked like a font issue was real
   data loss. Diff the `<m:t>` text before and after the LibreOffice re-save.
5. **LibreOffice stretches an injected equation to fill its frame.** Equations with
   near-equal sizes rendered up to 2.3× apart in equal-width boxes. This is a *preview*
   artifact: PowerPoint does the opposite (no stretch, wraps a too-narrow frame; #44).
   Make frames a little wider than the expression and judge equations from `ppt_pdf.sh`.
6. **An n-ary operator with both limits is tall**: give it ~0.3 in extra clearance; inside
   a shared band use one size for all equations.
7. **Injected OMML renders black.** On a navy card it is invisible — put a white card
   behind it.
8. LibreOffice previews OMML in a stretched font; QA agents call it "garbled". Tell them
   it is a preview artifact and to report only overlap, clipping and size.

## pptxgenjs

9. **Text rotation is about the unrotated centre**: `rot: 270` axis labels land off the
   axis and break mid-word in narrow boxes. Use a horizontal label instead.
10. There is no `TRIANGLE` shape — use `ISOSCELES_TRIANGLE` with `rotate`.
11. Some fonts lack Unicode super/subscripts (⁻ ⁵ ₚ). Prefer `superscript`/`subscript`
    text runs for anything beyond ² ³.
12. Titles longer than one line collide with the subtitle (≈ 70–75 characters at 24 pt).
    `deck_metrics.py` flags long titles.
13. **Typed page numbers go stale** once slides are reordered by hand. `theme.js` uses a
    slide-number field (`slide.slideNumber`).
13b. **Non-breaking spaces do not always hold in LibreOffice**: it broke "|z| > 2" after
    the "|". Keep such expressions short, or put each fact on its own line.
14. Text boxes do not grow: a box `h` set too small spills text past its card. Compute
    each slide's stack height against the content bottom (6.85 in).
15. pptxgenjs output needs the LibreOffice re-save, or PowerPoint asks to "repair" it
    (missing `slideMaster2..N` parts).

## Process

16. **`build.sh 2>&1 | tail -2` hid a crash** and every later check ran against the
    previous output. Never truncate build output; the template uses `set -euo pipefail`.
17. **Rebuilding over a hand-edited deck discards the edits.** Diff first
    (`diff_decks.py`), or edit the .pptx directly. PowerPoint adds one `<p:sp>` per
    native equation on save — not a manual edit.
18. **Text tags may carry attributes** (`<a:t xml:space="preserve">`). A regex for a bare
    `<a:t>` silently drops that text. Match `<a:t(?:\s[^>]*)?>` or parse the XML.
19. **Slide-by-slide QA misses deck-level faults** (a deck once shipped with no cover).
    Look at the contact sheet.
20. **Never re-render into a directory a QA subagent is reading** — slide numbers shift
    under it and it describes the wrong slides confidently.
21. **Do not give visual-QA agents an "expected content" list**; they echo it back when
    they cannot read the image. Give paths only; require pixel-backed claims; allow
    "illegible". Verify their claims before acting — some will be wrong.
22. Nudging one element to fix a gap repeatedly broke its neighbour. After each position
    change check both neighbours, or re-read offsets from the built XML.
23. A truncated string search gave a false "hidden flag lost" (the `<p:sld>` root tag is
    ~450 characters). Search inside the extracted root element (`hide_slides.py` does).
24. **A space in the working path kills LibreOffice silently** ("Abort trap: 6", no
    message) when the profile URL is not percent-encoded — iCloud paths contain
    "Mobile Documents". `_env.sh` provides `_fileurl()`; use it for every
    `-env:UserInstallation`.
25. `pdftoppm` zero-pads page numbers only when the PDF has ≥ 10 pages; glob instead of
    hard-coding names. LibreOffice skips hidden slides in PDF export unless
    `ExportHiddenSlides` is set (`render.sh` sets it).

## Content

26. **Prose in rounded rectangles is not a method slide.** Decks were rejected for it; in
    one, the paper's own toy-example figure had been cropped and then never used.
27. **Over-tightened claims.** A reviewer pass on one deck found ~14 places where slides
    were more categorical than the paper. Quote the paper's hedges.
28. **Numbers that look alike but are different comparisons or denominators** get mixed
    up. For every number on a slide, the notes state what it is a share/ratio of and
    where it comes from.
29. **Paper-internal inconsistencies** (main text vs Methods vs supplement; swapped
    citation numbers) go on a hidden slide; cite by author, not reference number.
30. **Forced lineage** between unrelated methods ("each paper adds one layer") invites
    an obvious objection in the room. Compare only what is genuinely shared.

## PowerPoint, text math and real-world decks

31. **Math in ordinary text**: write `T_{h}`, `p_{0}`, `χ^{2}`. `theme.txt()` (and every
    helper built on it; `L.rich()` for table cells) turns the markers into real
    subscript/superscript runs, and speaker notes get the plain form automatically. Do not
    type `T_h` (reads as code) or Unicode subscript letters (missing from Arial). Names such
    as `CD8_alpha_beta_T_cell` are untouched: only `_{...}` and `^{...}` are converted.
32. **A `\n` in a run that also has a subscript** broke the line at the subscript ("if p" /
    "0 ≤ 0.05"), and a bullet kept only on the first piece of a split run was dropped.
    `rich()` splits lines first and keeps paragraph options on every piece.
33. **Combining accents in body text** (τ̂, θ̂) render offset in LibreOffice; in prose write
    "τ_{c} (estimated)" and keep hats for OMML equations.
34. **Long vectors squeezed into a narrow equation frame** become unreadable. Draw them as a
    row of chips, or give the equation its own full-width row.
35. **Bulleted text in narrow cards** wastes width on the default hanging indent and leaves
    one-word last lines; use `bullet: { indent: 16 }`.
36. `deck_metrics.py` used to ignore table text (a table slide reported ~10 words and 0% small
    type); it now counts `a:tbl` cells. Chart text (separate chart parts) is still not counted.
37. **A whole graphical abstract on one slide is unreadable** (4 panels across 13.3 in leave
    6–9 pt labels). Render a slide variant of the figure (no title, chips or footnote) and
    export each panel as its own PNG; put step titles and captions as native text.
38. **`build.sh` versioning**: `${stem%_v[0-9]*}` stripped "_v4_20261015" from a file name, and
    every rebuild bumped to a new `_vN` even when the previous one was this pipeline's own
    output. The template now strips only a trailing `_v<digits>` and reuses its own versions.
39. **Long cover titles** (~100 characters): pass `titleFs: 28` to `cover()` and keep one
    subtitle line.
40. **PowerPoint automation**: error -9074 or an AppleEvent timeout means a dialog (usually
    "Grant access") is waiting on screen; stop retrying and ask the user. Export only into one
    granted folder, and address the opened copy by name, never as "active presentation"
    (that can be another open deck, which would then be closed without saving).
41. **PowerPoint renumbers slide files on save**: after a save, `slideN.xml` follows the
    presentation order again. Scripts that address slides or notes by file name must re-map
    from `presentation.xml` order (or by title) after every save; a stale map once wrote
    speaker notes onto the wrong slides.
42. **OMML runs with `<m:nor/>` (`r(t, roman=True)`) do not shrink in sub/superscripts or
    n-ary limits.** Use italic runs `r()` for digits in subscripts and limits; keep
    `roman=True` for operator names (BF, log, exp) at the baseline.
43. **PowerPoint wraps every shape that holds an equation in `mc:AlternateContent` with a
    stale Fallback** when it saves. After editing such a shape in XML, drop the wrapper (keep
    the Choice `p:sp`, add `xmlns:a14` to `a14:m`), or LibreOffice/Keynote/Google show the
    old text from the Fallback.
44. **PowerPoint renders OMML differently from the LibreOffice preview**: it does not stretch
    an equation to its frame, top-aligns it, and *wraps* it onto a second line when the frame
    is narrower than the expression. Squeezing frames to please the LibreOffice preview broke
    the equations in PowerPoint. Size frames for PowerPoint, keep long equations on their own
    row, and check with `ppt_pdf.sh` before delivery.

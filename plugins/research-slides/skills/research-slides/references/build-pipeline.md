# Build pipeline

## Requirements

| Tool | Notes |
|---|---|
| Node.js ≥ 18 + `pptxgenjs` 4.x | `npm install -g pptxgenjs`, or set `NODE_PATH` to where it is installed |
| Python ≥ 3.9 | standard library only; `Pillow` for the contact sheet. No python-pptx needed: OOXML is read with `zipfile` + ElementTree |
| LibreOffice | for the re-save and rendering. Found automatically on macOS (`/Applications/LibreOffice.app`, `~/Applications/...`) or as `soffice` on `PATH`; override with `SOFFICE=...` |
| poppler (`pdftoppm`, `pdfimages`, `pdftotext`) | rendering and figure extraction; override with `PDFTOPPM=...` |
| PowerPoint for Mac (optional) | `ppt_pdf.sh` renders through it: the only reliable check of native equations and of the "repair" prompt. It opens on the user's screen, so ask first |

Environment variables used by the scripts: `RESEARCH_SLIDES` (path to this skill's
`scripts/`), `NODE`, `PYTHON`, `SOFFICE`, `PDFTOPPM`. All have sensible defaults.

## Build directory

One directory per deck. Typical contents:

```
build.sh          copied from assets/build.sh.template; OUT and HIDDEN set at the top
build_deck.js     require(process.env.RESEARCH_SLIDES + "/theme.js"); writes to $RAW
equations.py      only if the deck has equations (see the omml_lib.py docstring)
figs/             cropped figures, with their source and licence noted
sources/          the paper, supplement and tables used
_build/           intermediate files (safe to delete)
```

Name deliverables `<Topic>_JournalClub_<year>.pptx` or similar, and keep earlier versions
(`_v2`) instead of overwriting a file someone has already seen.

## The five steps (`assets/build.sh.template`)

1. **pptxgenjs** writes `_build/raw.pptx`.
2. **Equations**: `python equations.py raw raw.eq` replaces `EQMARK_<name>` runs with
   native OMML. Skipped automatically when there are none.
3. **LibreOffice pptx→pptx re-save — mandatory, after every writer.** pptxgenjs
   declares `slideMaster2..N` in `[Content_Types].xml` without writing them; PowerPoint
   then demands "repair". Steps 1 and 2 both re-create the defect, so the re-save is
   last among writers. Injected equations survive it (LibreOffice rewrites them as
   `<a14:m><m:oMath …>`; grep for `oMath`, not `<m:oMath>`).
4. **Hidden-slide guard** (`hide_slides.py`): pptxgenjs `slide.hidden = true` writes
   `show="0"`; the re-save keeps it; the guard asserts it and fails otherwise.
5. **Density audit** (`deck_metrics.py`): read the flags, do not just print them.

The template never overwrites an output last saved by Microsoft PowerPoint (manual
edits): it writes the next free `_vN` instead. To revise such a deck, prefer editing it
directly (SKILL.md, "Revising a deck that was edited in PowerPoint"); rebuild from the
script only after porting the manual edits found by `diff_decks.py`.

## Writing the build script

- Write long scripts in chunks (a >2,000-line single write hit the output limit).
  Append one section per edit; do not run parallel edits on one file.
- After any section-level rewrite, list functions called but not defined (a helper
  living between two slide sections has been deleted this way twice).
- Do not anchor an Edit on a section-banner comment; anchor on the last line of the
  previous slide (`})();` after its notes).
- Put each slide in its own block with its notes: `s.addNotes("...")`. Notes carry
  the takeaway sentence, the numbers with their source (figure/table/page), and
  hedges.
- Use `theme.js` helpers; add deck-specific drawing helpers (plot frames, dots,
  matrices) in the deck script, deterministic (seeded) if they draw random points.

## Figures from papers

- Page holds one embedded raster (common for Nature/Cell figures): `pdfimages -png -f N
  -l N paper.pdf figs/figN` extracts it exactly.
- Vector or multi-image pages: `pdftoppm -r 300 -f N -l N` and crop. Detect plot
  boundaries by **axis lines** (rows/columns with a run of ≥ 240 consecutive dark
  pixels); colour- or text-density-based cropping failed on journal supplements. An
  equation's fraction bar is also a long line — restrict the search below it.
- Paint over panel letters that leak into a crop. Cut tall multi-panel figures into
  panels; do not shrink them into illegibility.
- `theme.image()` reads the pixel size from the file and fits by aspect ratio, so a
  re-crop cannot silently distort it; it anchors top-left (pass `{center: true}` to
  centre) and returns the box used, for placing the caption.
- Caption every reproduced figure with source and licence where known
  ("Kim et al., Cell Genomics 2026, Fig. 3").

## Figures from your own reports or web pages

A graphical abstract built for a page (one wide figure with a title, chip row and footnote)
is too dense for a slide. Make a slide variant in its generator (an environment flag such
as `DECK=1`): drop the title, chips, footnote and fine print, export each panel as its own
PNG (e.g. a headless browser clip at device scale 2–3), and put step titles and captions on
the slide as native text.

## Equations

Native OMML, never images, unless asked otherwise (native equations stay editable in
PowerPoint). In `equations.py`, every equation needs an `EQ_SIZE` entry (hundredths of
a point); `omml_lib.py` exits on a missing one. Keep equations in one band at the same
size. Test new equations with a round-trip check: build, re-save through LibreOffice,
and compare the `<m:t>` text before vs after (see traps 1–4).

## Version control for the deck

The build script is the source of truth only until someone edits the .pptx by hand.
After that, the .pptx is. Keep `build_deck_vN_pre-manual-edits.js.bak` before porting
edits into the script.

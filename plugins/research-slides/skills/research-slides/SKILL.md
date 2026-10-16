---
name: research-slides
description: Build, revise, or review research presentation decks (.pptx) — journal clubs on a scientific paper and research-progress talks — in a clean, sparse academic style. Covers deck architecture, a pptxgenjs theme with native PowerPoint equations, a reproducible build (pptxgenjs → OMML → LibreOffice), density and visual QA tools, and safe revision of decks that have already been edited by hand in PowerPoint. Use when asked for slides, a deck, a journal club, a lab-meeting or seminar presentation, or edits to an existing research deck.
---

# research-slides

Decks for lab meetings, journal clubs and progress reports. Where this skill and a
generic slide/pptx skill disagree on design, **this skill wins**: no 36–44 pt titles,
no decorative topic palettes, no icon on every slide, no summary band at the bottom.

The defaults below were measured, not invented: they come from comparing first-draft
decks with the versions a researcher kept after editing them by hand (details and
numbers in `references/style.md`). Treat them as defaults; the person you work with can
override any of them.

| Need | Read |
|---|---|
| Colours, fonts, geometry, slide types, evidence | `references/style.md` |
| What a journal club / progress deck contains | `references/deck-types.md` |
| Build directory, pipeline, figures, equations | `references/build-pipeline.md` |
| Known failure modes — read before building | `references/traps.md` |
| QA loop and the visual-QA subagent prompt | `references/qa.md` |

All bundled files live under `${CLAUDE_SKILL_DIR}`; scripts are in
`${CLAUDE_SKILL_DIR}/scripts`. Export `RESEARCH_SLIDES=${CLAUDE_SKILL_DIR}/scripts`
before running a build so the deck script and `build.sh` can find them.

## Workflow

1. **Pin down the deck.** Type (journal club or research progress), date and audience,
   source files, language, length. Ask only what you cannot infer. Default length:
   10–17 visible slides plus hidden `(Supp.)` backups.
2. **Read the sources and verify every number** against the paper, supplement or
   tables before it goes on a slide. Record internal inconsistencies of the paper on a
   hidden slide; never quote a disputed number unhedged.
3. **Write the slide plan first** — one line per slide: title, the one message, the
   visual that carries it. For a new deck, show the plan before writing code.
4. **Build** in a dedicated directory from `assets/build.sh.template` and
   `scripts/theme.js` (`build-pipeline.md`). Never write straight to the final path
   from node; never truncate build output with `tail`.
5. **QA** (`qa.md`): `deck_metrics.py`, `render.sh`, look at the contact sheet
   yourself, then a fresh-eyes subagent pass. At least one fix-and-verify cycle.
6. **Deliver** the path, visible/hidden slide counts, the hidden list, and what was not
   verified. LibreOffice rendering is a proxy; for decks with equations, offer a
   PowerPoint render (`ppt_pdf.sh`) before delivery.

## Revising a deck that was edited in PowerPoint

People finish decks by hand. Once a .pptx has been saved by PowerPoint, **that file is
the source of truth and the build script is stale.** Detect it with
`unzip -p deck.pptx docProps/app.xml | grep Application`.

- **Default — edit that file directly**, into a new version (`Deck_v2.pptx`, never over
  the original): unpack the .pptx, change the slide XML, repack. Anthropic's `pptx`
  skill provides `unpack.py` / `pack.py` for this; install it separately (it is not
  bundled here). Hand-made fonts, positions and tweaks survive. Do **not** run the
  LibreOffice re-save on such files; it exists only to clean pptxgenjs output.
- **New slides inside an edited deck**: build them with `theme.js` in a small separate
  deck, then copy them in or hand them over to paste. Say which you did.
- **Large restructuring only — rebuild from the script**: run
  `scripts/diff_decks.py built.pptx edited.pptx`, port every manual edit into the
  script, then rebuild. `build.sh` never overwrites a PowerPoint-saved file; it writes
  the next `_vN` automatically.

Treat manual edits as decisions: do not undo them; report any you could not carry over.

## Content defaults (measured from hand-edited finals)

- **Less text.** Hand edits cut a draft from a median 193 to 112 words per visible
  slide. Aim for ≤ 120, never above ~180. Detail goes to speaker notes (finals kept a
  median 155–196 words of notes per slide) or to a hidden `(Supp.)` slide.
- **Bigger, uniform type.** Body 14–16 pt, secondary 12–13 pt, captions ≥ 10.5 pt.
  Small labels inside a drawn diagram are fine; prose in small type is not.
- **Plain, descriptive titles**, one line at 24 pt (≤ ~70 characters). A short factual
  claim is fine ("Cell-type annotations are highly correlated"); rhetorical titles are
  not ("What the method cannot resolve" became "Limitations").
- **No bottom takeaway band.** The takeaway sentence goes in the speaker notes.
- **Subtitle only when it carries information** (setting, data, key numbers), in
  sentence case.
- **Limitations as short rows** (`theme.rows()`): bold label + one line, 4–6 rows.
- **Draw the mechanism.** A method slide that is "a list of labelled boxes" has failed.
  Pipelines show data flowing; if the paper has a toy example or overview figure that
  explains the method, use it.
- **`(Supp.)` slides are hidden** and placed after the closing slide.
- **Each deck argues its own paper.** Compare with other methods only when the
  estimand, model class or inference machinery is actually shared.
- **Calibrate claims to the paper.** Keep its hedges; do not import outside numbers as
  the paper's; keep association vs causation and marginal vs conditional distinct.

## Visual style in one paragraph

White background; a 0.07 in blue stripe on the left edge of every slide; title 24 pt
Arial bold navy `162B43` at (0.61, 0.28); subtitle 14 pt `53677F`; hairline divider at
y = 1.14; content from y ≈ 1.32 to 6.85; slide-number field bottom right. White cards
with a `D8E1EB` hairline and a coloured left edge; accents blue `315DA8`, teal
`167E82`, purple `7350A5`, pale tints for fills, orange `BC5318` only for warnings.
Cover = meeting line on white + one navy hero card; section dividers (progress decks)
are white with a large accent number and a section tracker; closing = navy take-home
slide on the same grid. `scripts/theme.js` implements all of it.

## Scripts

Python scripts need only the standard library (`contact_sheet.py` needs Pillow).

- `theme.js` — pptxgenjs helpers: `cover content section takeHome supp card headedCard
  flow stat bar chip rows caption image eq rich` and colour tokens `C`. Write math in
  text as `T_{h}` / `χ^{2}`: helpers render real sub/superscripts and speaker notes get
  the plain form.
- `omml_lib.py` — native, editable PowerPoint equations; a deck's `equations.py`
  defines `EQS` and a required `EQ_SIZE` per equation. Fails loudly on unknown or
  unsized equations.
- `hide_slides.py` — guarantees `(Supp.)` slides are hidden after the re-save.
- `deck_metrics.py` — per-slide words, notes and small-type share; flags draft-like
  density.
- `render.sh` + `contact_sheet.py` — PDF (hidden slides included) → JPEGs → one
  labelled contact sheet.
- `ppt_pdf.sh` — the same through PowerPoint for Mac (ask first): the real render of
  native equations, which the LibreOffice preview misrepresents.
- `diff_decks.py` — what changed between a built deck and a hand-edited copy: words,
  deleted slides, and shapes moved or resized.

`assets/build.sh.template` is the 5-step build. Worked examples (a synthetic demo and
a methods tutorial on fine-mapping, fully simulated) are in the repository's `examples/` folder.

# QA

Assume the first render has problems. Do not declare a deck done before one full
fix-and-verify cycle.

## 1. Numbers (`deck_metrics.py`, runs as build step 5)

```
python3 -I "$RESEARCH_SLIDES/deck_metrics.py" deck.pptx
```

A FLAG means the slide looks like the drafts that were cut down by hand: > 180 words,
text under 9 pt, or more than half its characters under 14 pt; also titles over 75
characters. WARN = 9–10.5 pt text (acceptable for labels inside a drawn diagram, not for
prose) or a deck median above 130 words. On calibration, hand-edited finals were flagged
on 2/15 and 4/12 visible slides and the drafts on every slide — so a few flags on
diagram-heavy slides are normal; a flag on a text slide is not.

Also check from the table: every visible slide has notes; hidden slides are the ones
intended.

## 2. Content

```
unzip -p deck.pptx 'ppt/slides/*.xml' | grep -oE '<a:t[^>]*>[^<]*' | sed 's/<a:t[^>]*>//' | grep -iE 'EQMARK|MISSING|lorem|xxx|TODO'
```

Then read every number on the main slides against the notes' stated source.

## 3. Render and look at the whole deck

```
bash "$RESEARCH_SLIDES/render.sh" deck.pptx qa/<deck>_round<N> 110
```

Open `contact_sheet.jpg` yourself first and check the deck-level things only that view
shows: a distinct cover, a closing slide, hidden slides where intended, rhythm (not 15
identical layouts), colour used consistently.

## 3b. PowerPoint render (decks with equations, or when someone reports layout drift)

With permission (PowerPoint opens on the screen for a few seconds; macOS only):
```
bash "$RESEARCH_SLIDES/ppt_pdf.sh" deck.pptx qa/ppt_round<N>
```
This is the only reliable check of native equations (traps.md #44). The first export into
`PPT_QA_DIR` shows a "Grant access" dialog that must be clicked once; error -9074 or a timeout
means such a dialog is waiting.

## 4. Fresh-eyes visual pass (subagent)

Use a new render directory per round. Give the agent file paths only — no description
of what each slide should contain (traps.md #21). Prompt:

```
Visually inspect these slide images. Assume there are problems; find them.
Report per slide, with the location in the image (approximate pixel coordinates):
- overlapping elements; text running through shapes, lines or other text
- text cut off at a box or slide edge; a wrapped title colliding with the subtitle
- text that looks smaller than ~13 pt at presentation size, other than diagram labels
- crowded areas (< ~0.3 in between blocks) next to large empty areas
- slide-edge margin under ~0.5 in (the thin coloured stripe at the far left is intended)
- low contrast (light text on light fill, dark equations on dark fill)
- misaligned columns or cards that should line up
- leftover placeholder text (EQMARK_, MISSING_, lorem)
Equations may render in a stretched font in this preview: report only overlap,
clipping or size, not the font.
If something is illegible at this resolution, say "illegible" — do not guess.
Images: <paths>
```

## 5. Fix, re-render the affected slides into a new directory, re-check both neighbours of
anything you moved, and repeat until a pass finds nothing new.

## 6. Hand-off note

Path, visible/hidden counts and which slides are hidden, and anything not verified.
LibreOffice renders Arial and OMML slightly differently from PowerPoint, and only
PowerPoint shows a "repair" prompt — ask the person to open the file and report, or ask
before automating PowerPoint yourself.

# Visual style

`scripts/theme.js` encodes everything on this page. Change the tokens there if you want a
different palette; keep the rules.

## Where the defaults come from

The style and density defaults were derived by comparing first-draft decks with the
versions a researcher kept after editing them by hand in PowerPoint (two journal clubs
and a workshop summary, 2026). Measured on visible slides:

| Measure | Draft A | Final A | Draft B | Final B |
|---|---|---|---|---|
| words / slide, median (max) | 193 (251) | 112 (172) | 113 (146) | 116 (175) |
| characters set below 14 pt | 86% | 29% | 6% | 17% |
| speaker-notes words / slide, median | 228 | 196 | 200 | 155 |
| title size | 32 pt | 32 pt | 32 pt | **24 pt** |
| font, ground | Calibri, grey | Calibri, grey | Calibri, grey | **Arial, white** |

Other hand edits, consistently: summary bands at the bottom of slides removed;
subtitles that restated the title removed; a 241-word limitations table rewritten as 4
label + one-line rows (39 words); secondary results moved to hidden backup slides rather
than deleted; rhetorical titles replaced by plain ones. Final B's white, Arial, 24 pt
look is the visual default here.

## Tokens

| Role | Value |
|---|---|
| Title / strong text / dark slides | navy `162B43` |
| Body text | slate `40546C` |
| Subtitle, secondary labels | muted `53677F` |
| Neutral bars, captions | grey `5E6B6F` |
| Card border, divider | `D8E1EB` (stronger: `A7B8CC`) |
| Accent 1 | blue `315DA8` (tint `EAF0FA`) |
| Accent 2 | teal `167E82` (`E7F4F2`) |
| Accent 3 | purple `7350A5` (`F0ECF8`) |
| Warning / contrast, sparingly | orange `BC5318` (`FBEFE8`) |
| Text on navy | white, `C9D6E6`, teal `7FD1C7` |

Font Arial throughout; Cambria Math for equations. Slide 13.333 × 7.5 in (16:9).

Rules from visual QA rounds: subtitles in sentence case; one text inset (0.25 in) inside
every card; when blocks sit under a row of cards, align them to the cards' columns
(`flow()` returns them); never leave a single word alone on a card's last line —
shorten the text instead of shrinking it.

Use accent colour to encode one thing consistently across a deck (e.g. one colour per
pipeline stage, or per data source). Do not decorate.

## Geometry

| Element | Spec |
|---|---|
| Left stripe | x 0, w 0.07, full height, blue `315DA8` on **every** slide (mixed stripe colours read as a clash) |
| Title | x 0.61, y 0.28, h 0.47, 24 pt bold navy, one line (≤ ~70 chars) |
| Subtitle | y 0.78, 14 pt muted, one line |
| Divider | y 1.14, x 0.61 → 12.78, 1 pt `D8E1EB` |
| Content area | y 1.32 → 6.85 |
| Slide number | a slide-number *field*, bottom right, 14 pt; none on the cover |
| Card | white, small corner radius, 0.75 pt `D8E1EB` border, full-height 0.06 in coloured left edge |
| Card heading | 14.4–16 pt bold |
| Body | 14–16 pt slate; secondary lines 12–13 pt |
| Big numbers | 28–32 pt bold accent, label 13–15 pt underneath |
| Arrows | 2 pt grey with a triangle head between process cards |

## Slide types

- **Cover**: meeting or series name as the 24 pt title, event/date line under it, then
  one navy hero card with the talk title (36 pt white), 1–3 short lines and the
  presenter at the card's foot. A cover must look different from a content slide.
- **Content**: title + optional subtitle + divider; 2–3 visual blocks.
- **Section divider** (progress decks): white, same stripe, 96 pt accent number, a thin
  vertical rule, section name 36 pt navy with an 18 pt line under it, and a tracker
  along the bottom listing all sections with the current one highlighted.
- **Take-home / closing**: the content grid inverted onto navy — same stripe and title
  position, "Take-home" as the subtitle, three numbered items.
- **(Supp.) backup**: content layout, title prefixed "(Supp.) ", hidden, placed after the
  closing slide.
- **Limitations**: `theme.rows()` — one card per limitation, bold label + one line.

## Do not reintroduce by default

- A summary/takeaway band at the bottom of slides (put it in the notes)
- Subtitles that restate the title
- "Caveats" / "Relevance to us" side boxes on every slide
- Dense tables of prose — use short rows
- 32–44 pt titles, grey grounds, a different stripe colour per slide

#!/bin/bash
# Build the fine-mapping demo deck (run simulate.py first; copied from assets/build.sh.template).
#   1) pptxgenjs build                 -> raw pptx
#   2) inject native equations (OMML)  -> skip if the deck has none
#   3) LibreOffice pptx->pptx re-save  -> canonical OOXML. MANDATORY and LAST of the
#      writers: pptxgenjs declares slideMaster2..N without writing them and
#      PowerPoint then asks to "repair"; steps 1 and 2 both re-create the defect.
#   4) hidden-slide guard              -> fails loudly if a (Supp.) slide is visible
#   5) density audit                   -> report only; read it, do not ignore it
# Use this to build a NEW deck or to rebuild one whose source of truth is still the
# JS. To revise a deck that was edited in PowerPoint, edit that file directly
# (SKILL.md, "Revising a deck that was edited in PowerPoint").
# Never pipe this script through `tail`: a crash in step 1 would leave the OLD
# output in place and every later check would pass against a stale file.
set -euo pipefail
cd "$(dirname "$0")"

OUT="${OUT:-$(pwd)/finemap-demo.pptx}"           # final deliverable
JS=build_deck.js                                # writes to $RAW, never to $OUT
EQ=equations.py                                 # leave as-is if unused
HIDDEN="11 12"                                  # e.g. "13 14 15 16" (1-based deck positions)

# path to the skill's scripts/ (set by the agent: RESEARCH_SLIDES=${CLAUDE_SKILL_DIR}/scripts)
SKILL="${RESEARCH_SLIDES:-$HOME/.claude/skills/research-slides/scripts}"; export RESEARCH_SLIDES="$SKILL"
source "$SKILL/_env.sh"
_need node "$NODE" NODE; _need python3 "$PYTHON" PYTHON; _need LibreOffice "$SOFFICE" SOFFICE
PY="$PYTHON"
WORK="$(pwd)/_build"; RAW="$WORK/raw.pptx"
mkdir -p "$WORK"

# Never overwrite a file someone has saved in PowerPoint: their edits exist only
# there. If $OUT was last saved by PowerPoint, write the next free version instead
# (Deck.pptx -> Deck_v2.pptx, _v3, ...) and compare with diff_decks.py afterwards.
# A file last written by this pipeline (LibreOffice) is our own output and is replaced.
saved_by_ppt() { [ -f "$1" ] && unzip -p "$1" docProps/app.xml 2>/dev/null | grep -q "Microsoft"; }
if saved_by_ppt "$OUT"; then
  # strip only a trailing _v<digits> ("${stem%_v[0-9]*}" would also eat "_v4_20261015")
  EDITED="$OUT"; stem="$(echo "${OUT%.pptx}" | sed -E 's/_v[0-9]+$//')"; n=2
  # reuse a version this pipeline wrote itself; skip versions saved in PowerPoint
  while [ -e "${stem}_v${n}.pptx" ] && saved_by_ppt "${stem}_v${n}.pptx"; do n=$((n+1)); done
  OUT="${stem}_v${n}.pptx"
  echo "NOTE: $(basename "$EDITED") was saved in PowerPoint; writing $(basename "$OUT") instead."
  echo "      Port the manual edits first if this rebuild should keep them: diff_decks.py <built> \"$EDITED\""
fi

echo "[1/5] pptxgenjs"; RAW="$RAW" "$NODE" "$JS"
if [ -f "$EQ" ] && grep -q EQMARK_ <(unzip -p "$RAW" 'ppt/slides/*.xml'); then
  echo "[2/5] equations"; $PY "$EQ" "$RAW" "$RAW.eq" && mv -f "$RAW.eq" "$RAW"
else echo "[2/5] equations: none"; fi
echo "[3/5] LibreOffice re-save"
rm -rf "$WORK/resave" && mkdir -p "$WORK/resave"
"$SOFFICE" --headless -env:UserInstallation="$(_fileurl "$WORK/lo")" --convert-to pptx --outdir "$WORK/resave" "$RAW" >/dev/null 2>&1
[ -f "$WORK/resave/raw.pptx" ] || { echo "LibreOffice re-save failed"; exit 1; }
if [ -n "$HIDDEN" ]; then echo "[4/5] hidden guard"; $PY -I "$SKILL/hide_slides.py" "$WORK/resave/raw.pptx" "$OUT" $HIDDEN
else echo "[4/5] no hidden slides"; cp -f "$WORK/resave/raw.pptx" "$OUT"; fi
echo "[5/5] density audit"; $PY -I "$SKILL/deck_metrics.py" "$OUT" || true
echo "DONE -> $OUT"

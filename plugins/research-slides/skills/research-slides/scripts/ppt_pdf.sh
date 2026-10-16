#!/bin/bash
# Export a deck to PDF with Microsoft PowerPoint (macOS) and rasterise it, for the QA that
# LibreOffice cannot do: native OMML equations (PowerPoint does not stretch an equation to
# its frame, top-aligns it, and WRAPS it when the frame is narrower than the expression;
# the LibreOffice preview hides all three), fonts and autofit.
#   bash ppt_pdf.sh <deck.pptx> <out_dir> [dpi]      -> <out_dir>/ppt.pdf and <out_dir>/p-NN.jpg
# Ask the user first: PowerPoint opens on their screen for a few seconds.
# The deck is copied into one fixed folder, PPT_QA_DIR. PowerPoint's sandbox only writes into
# folders the user has granted: the first export there shows a "Grant access" dialog that
# must be clicked once; any other folder triggers it again. An AppleEvent timeout (-1712) or
# error -9074 usually means such a dialog is waiting on screen.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"; source "$HERE/_env.sh"
_need pdftoppm "$PDFTOPPM" PDFTOPPM
DECK="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"; OUT="$2"; DPI="${3:-110}"
DIR="${PPT_QA_DIR:-$HOME/Downloads/research-slides-ppt-qa}"; mkdir -p "$DIR"
COPY="$DIR/_ppt_qa_$(basename "$DECK")"; PDF="${COPY%.pptx}.pdf"
mkdir -p "$OUT"; cp -f "$DECK" "$COPY"; rm -f "$PDF"
trap 'rm -f "$COPY"' EXIT
# Address the QA copy BY NAME, never "active presentation": if the copy opens slowly while
# another deck is open, "active presentation" is that other deck, and it would be exported
# and closed without saving. The "_ppt_qa_" prefix is unique to these copies.
osascript <<OSA
with timeout of 240 seconds
tell application "Microsoft PowerPoint"
  open POSIX file "$COPY"
  set target to missing value
  set t0 to current date
  repeat while target is missing value
    repeat with q in presentations
      if (name of q) starts with "_ppt_qa_" then set target to contents of q
    end repeat
    if target is missing value then
      if ((current date) - t0) > 90 then error "QA copy did not open within 90 s (a dialog may be waiting)"
      delay 1
    end if
  end repeat
  save target in POSIX file "$PDF" as save as PDF
  close target saving no
end tell
end timeout
OSA
mv -f "$PDF" "$OUT/ppt.pdf"
rm -f "$OUT"/p-*.jpg; "$PDFTOPPM" -r "$DPI" -jpeg "$OUT/ppt.pdf" "$OUT/p"
echo "$(ls "$OUT"/p-*.jpg | wc -l | tr -d ' ') pages -> $OUT (PowerPoint render; hidden slides are not exported)"

#!/bin/bash
# Render a deck for visual QA: PDF (hidden slides included) -> one JPEG per slide
# -> a whole-deck contact sheet with slide numbers (red = hidden).
#
# usage: render.sh deck.pptx OUTDIR [dpi]
#   OUTDIR must be a fresh or dedicated directory; it is wiped first. Never
#   re-render into a directory a QA subagent is still reading.
set -euo pipefail
DECK="$1"; OUT="$2"; DPI="${3:-110}"
HERE="$(cd "$(dirname "$0")" && pwd)"
source "$HERE/_env.sh"
_need LibreOffice "$SOFFICE" SOFFICE; _need pdftoppm "$PDFTOPPM" PDFTOPPM; _need python3 "$PYTHON" PYTHON
case "$OUT" in /|"$HOME"|"$HOME/"|.|./) echo "refusing OUTDIR=$OUT"; exit 1;; esac
rm -rf "$OUT"; mkdir -p "$OUT/lo"
OUT="$(cd "$OUT" && pwd)"
B="$(basename "${DECK%.*}")"
# ExportHiddenSlides: LibreOffice skips hidden slides in PDF export by default
"$SOFFICE" --headless -env:UserInstallation="$(_fileurl "$OUT/lo")" \
  --convert-to 'pdf:impress_pdf_Export:{"ExportHiddenSlides":{"type":"boolean","value":"true"}}' \
  --outdir "$OUT" "$DECK" >/dev/null 2>&1
rm -rf "$OUT/lo"
[ -f "$OUT/$B.pdf" ] || { echo "render failed: no PDF"; exit 1; }
"$PDFTOPPM" -jpeg -r "$DPI" "$OUT/$B.pdf" "$OUT/p"
"$PYTHON" -I "$HERE/contact_sheet.py" "$DECK" "$OUT"

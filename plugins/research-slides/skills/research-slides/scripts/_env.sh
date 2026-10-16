# Locate the external tools the research-slides scripts need. Sourced by
# render.sh and by build.sh. Every value can be overridden from the environment.
_first() { for c in "$@"; do [ -n "$c" ] && [ -x "$c" ] && { echo "$c"; return; }; done; }
: "${SOFFICE:=$(_first "$(command -v soffice 2>/dev/null)" "$(command -v libreoffice 2>/dev/null)" \
  /Applications/LibreOffice.app/Contents/MacOS/soffice "$HOME/Applications/LibreOffice.app/Contents/MacOS/soffice")}"
: "${PDFTOPPM:=$(command -v pdftoppm 2>/dev/null)}"
: "${NODE:=$(command -v node 2>/dev/null)}"
: "${PYTHON:=$(command -v python3 2>/dev/null)}"
if [ -z "${NODE_PATH:-}" ] && [ -n "$NODE" ] && command -v npm >/dev/null 2>&1; then
  NODE_PATH="$(npm root -g 2>/dev/null)"
fi
export SOFFICE PDFTOPPM NODE PYTHON NODE_PATH
# LibreOffice needs its profile as a valid file URL. Percent-encode the path: an
# unencoded space (e.g. iCloud's "Mobile Documents") makes soffice abort silently.
_fileurl() { echo "file://$("$PYTHON" -c 'import sys,urllib.parse;print(urllib.parse.quote(sys.argv[1]))' "$1")"; }
_need() { [ -n "$2" ] || { echo "research-slides: cannot find $1 (set $3=/path/to/it)" >&2; exit 1; }; }

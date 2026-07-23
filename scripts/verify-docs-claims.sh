#!/usr/bin/env bash
#
# verify-docs-claims.sh
# -----------------------------------------------------------------------------
# Read-only verification that the documentation in README.md and faq/*.md is not
# drifting away from the codebase it describes. It checks two things:
#
#   1. Every relative path a doc cites -- markdown links "](./...)" and inline
#      code paths like `server/src/...` -- points at a file or directory that
#      actually exists. A broken reference prints MISSING and fails the run.
#
#   2. The headline counters the docs promise are internally consistent:
#        * flow directories under server/src/engine/flows/ == 46
#        * "Live" verdicts in docs/business-flows/FLOW-BY-FLOW-STATUS.md == 14
#        * PRODUCT-STATE.md's "User intents live today" count agrees with (2)
#      Any drift prints a clear message and fails the run.
#
# What this does NOT do: it does not run the test suite. A green run means the
# cited paths exist and the counters line up -- not that tests pass. Run the
# tests yourself for that (see README "Run Tests").
#
# Dependencies: bash, grep, awk/sed, find, test. No node, npm, or git required.
# The script is idempotent and makes no changes to the repository.
#
# Exit code: 0 = every claim verified; 1 = at least one broken path or counter
# drift.
# -----------------------------------------------------------------------------

set -u

# --- locate repo root (parent of this script's directory) --------------------
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

FAIL=0

# Canonical expectations. When the codebase legitimately grows past these,
# bump them here AND in the docs, and record it in docs/DOC-REFRESH-CHECKLIST.md.
EXPECT_FLOWS=46
EXPECT_LIVE=14

STATUS_DOC="docs/business-flows/FLOW-BY-FLOW-STATUS.md"
PSTATE_DOC="docs/business-flows/PRODUCT-STATE.md"

# --- docs whose path claims we verify ----------------------------------------
DOC_FILES=("README.md")
for f in faq/*.md; do
  [ -e "$f" ] && DOC_FILES+=("$f")
done

echo "XIIGen -- documentation claims verification"
echo "Repo root: $REPO_ROOT"
echo "Scanned docs: ${#DOC_FILES[@]} files (README.md + faq/*.md)"
echo

# Normalise a path for dedupe / existence: strip leading "./" groups and "/./".
normalise() { printf '%s' "$1" | sed -e 's|^\(\./\)*||' -e 's|/\./|/|g'; }

# True when the first path segment of $1 is a real top-level repo entry. This
# separates genuine path claims (server/..., docs/..., .agents/...) from prose
# fragments such as `engine/flows` whose leading segment has no repo entry.
is_top_level() { [ -e "${1%%/*}" ]; }

CLAIMS=()                 # accumulated "path<TAB>sourcefile" strings
add_claim() {             # $1 = path (repo-root relative), $2 = source doc
  local p
  p="$(normalise "$1")"
  [ -z "$p" ] && return
  CLAIMS+=("$p	$2")
}

# Disable pathname expansion so unquoted token splitting below cannot glob.
set -f

for F in "${DOC_FILES[@]}"; do
  D="$(dirname "$F")"

  # (A) Markdown links: "](target)" -- resolve relative to the doc's directory.
  while IFS= read -r link; do
    t="${link#](}"
    t="${t%)}"
    case "$t" in
      http://*|https://*|mailto:*|"#"*|"") continue ;;
    esac
    t="${t%%#*}"                       # drop any #fragment
    [ -z "$t" ] && continue
    if [ "$D" = "." ]; then
      add_claim "$t" "$F"
    else
      add_claim "$D/$t" "$F"
    fi
  done < <(grep -oE '\]\([^)]+\)' "$F" 2>/dev/null)

  # (B) Inline-code paths: `token` that looks like a repo path.
  while IFS= read -r span; do
    span="${span#\`}"
    span="${span%\`}"
    for tok in $span; do
      case "$tok" in
        */*) : ;;                      # must contain a slash
        *)   continue ;;
      esac
      case "$tok" in
        /*) continue ;;                # URL route like /blog -- not a repo path
      esac
      if is_top_level "$tok"; then
        add_claim "$tok" "$F"
      fi
    done
  done < <(grep -oE '`[^`]+`' "$F" 2>/dev/null)
done

set +f

# --- check each unique claim -------------------------------------------------
CHECKED=0
MISSING=0
SEEN=()
seen() {
  local x
  for x in ${SEEN[@]+"${SEEN[@]}"}; do
    [ "$x" = "$1" ] && return 0
  done
  return 1
}

echo "[1/2] Path references"
for entry in ${CLAIMS[@]+"${CLAIMS[@]}"}; do
  p="${entry%%	*}"
  src="${entry#*	}"
  if seen "$p"; then continue; fi
  SEEN+=("$p")
  CHECKED=$((CHECKED + 1))
  if [ ! -e "$p" ]; then
    echo "  MISSING: $p   (referenced in $src)"
    MISSING=$((MISSING + 1))
    FAIL=1
  fi
done
echo "  Unique paths checked: $CHECKED"
echo "  Missing: $MISSING"
echo

# --- counters ----------------------------------------------------------------
echo "[2/2] Counters"

FLOWS="$(find server/src/engine/flows -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l | tr -d '[:space:]')"
if [ "$FLOWS" = "$EXPECT_FLOWS" ]; then
  echo "  Flow directories under server/src/engine/flows/: $FLOWS (expected $EXPECT_FLOWS) OK"
else
  echo "  Flow directories under server/src/engine/flows/: $FLOWS (expected $EXPECT_FLOWS) FAIL"
  FAIL=1
fi

if [ -e "$STATUS_DOC" ]; then
  LIVE="$(grep -c '\*\*Verdict:\*\* \*\*Live' "$STATUS_DOC" | tr -d '[:space:]')"
else
  LIVE=""
fi
if [ "$LIVE" = "$EXPECT_LIVE" ]; then
  echo "  \"Live\" verdicts in FLOW-BY-FLOW-STATUS.md: $LIVE (expected $EXPECT_LIVE) OK"
else
  echo "  \"Live\" verdicts in FLOW-BY-FLOW-STATUS.md: ${LIVE:-not found} (expected $EXPECT_LIVE) FAIL"
  FAIL=1
fi

PS_LIVE="$(grep -E '\| *User intents live today *\|' "$PSTATE_DOC" 2>/dev/null | grep -oE '[0-9]+' | head -1)"
if [ -z "$PS_LIVE" ]; then
  echo "  PRODUCT-STATE.md live count: not found ('User intents live today' row) FAIL"
  FAIL=1
elif [ "$PS_LIVE" = "$LIVE" ]; then
  echo "  PRODUCT-STATE.md live count: $PS_LIVE (matches FLOW-BY-FLOW-STATUS.md) OK"
else
  echo "  PRODUCT-STATE.md live count: $PS_LIVE (FLOW-BY-FLOW-STATUS.md says ${LIVE:-not found}) FAIL"
  FAIL=1
fi
echo

# --- verdict -----------------------------------------------------------------
if [ "$FAIL" -eq 0 ]; then
  echo "Result: PASS -- $CHECKED path references resolve; counters ${FLOWS}/${LIVE} consistent."
  echo "Note: this verifies paths and counters only. It does not run tests."
  exit 0
fi

echo "Result: FAIL -- fix the MISSING paths and/or counter drift reported above."
exit 1

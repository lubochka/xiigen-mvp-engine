#!/usr/bin/env bash
# scripts/ux-quality-score.sh v2 (RUN-137)
# Produces a single-number UX quality score by counting USER-VISIBLE offences.
# Filters out JSDoc /** */ blocks, // line comments, and JSX {/* */} comments
# so comment references don't inflate the score.
#
# Lower is better; target = 0.
# Used to compute per-round improvement delta (stop when delta < 1%).

set -u
PAGES=client/src/pages

# Filter to USER-VISIBLE lines only:
#   - strip lines starting with `*` or `/**` (JSDoc block lines)
#   - strip lines starting with `//` (line comments)
#   - strip lines with `{/*` (JSX comment start)
#   - strip lines with `*/` AT END (block comment close)
filter_visible() {
  grep -vE '^\s*\*|^\s*/\*|^\s*//|\{/\*|\*/\s*$'
}

count_visible() {
  local pattern="$1"
  grep -rhE "$pattern" $PAGES --include='*.tsx' 2>/dev/null | filter_visible | wc -l | tr -d ' '
}

A_BFA=$(count_visible '\bBFA\b')
A_DNA=$(count_visible '\bDNA-[1-9]\b')
A_ARB=$(count_visible '\barbiter\b')
A_FRE=$(count_visible 'FREEDOM config|MACHINE code')
A_DPR=$(count_visible 'DataProcessResult')
A_EIN=$(count_visible 'ENGINE_INTERNAL' | grep -v 'classification="ENGINE_INTERNAL"' || true)
# For ENGINE_INTERNAL we want to exclude the `classification="ENGINE_INTERNAL"` prop usage
# (which is a code identifier, rendered as "Platform-only" human pill after RUN-122).
# Use a two-stage count:
A_EIN_TOTAL=$(count_visible 'ENGINE_INTERNAL')
A_EIN_PROP=$(grep -rhE 'classification="ENGINE_INTERNAL"' $PAGES --include='*.tsx' 2>/dev/null | wc -l | tr -d ' ')
A_EIN=$(( A_EIN_TOTAL - A_EIN_PROP ))
# Safety: can't be negative
[ "$A_EIN" -lt 0 ] && A_EIN=0

A_SCO=$(count_visible '\bscope_isolation\b')
A_TNM=$(count_visible '\bT[0-9]{3}\b')
A_CFN=$(count_visible '\bCF-[0-9]{3}\b')
S_HERO=$(count_visible 'text-(2xl|3xl) font-bold text-(blue|green|amber|red|emerald|purple|slate|rose|orange)-[0-9]+\s+mt-1')
S_EMOJI=$(count_visible 'aria-hidden="true">\s*[\u2661\u2665\u{1F4AC}\u21bb\u{1F4A1}\u26a0\u{1F512}\u270f]')
S_SIDE=$(count_visible 'border-(left|right): [2-9]px')
L_TL=$(count_visible '\btext-left\b|\btext-right\b')
L_AUTO=$(count_visible '\bml-auto\b|\bmr-auto\b')

# Coverage deficit from matrix
if [ -f docs/screen-examination/ROUND-2-COVERAGE-MATRIX.json ]; then
  C_NOTYET=$(grep -cE 'NOT_YET_EXAMINED' docs/screen-examination/ROUND-2-COVERAGE-MATRIX.json)
else
  C_NOTYET=0
fi

# Weights
SCORE=$(( A_BFA*3 + A_DNA*3 + A_ARB*3 + A_FRE*3 + A_DPR*3 + A_EIN*3 + A_SCO*3 + A_TNM*2 + A_CFN*2 + S_HERO*2 + S_EMOJI*3 + S_SIDE*2 + L_TL*1 + L_AUTO*1 + C_NOTYET*1 ))

printf 'acronym_BFA=%d\nacronym_DNA=%d\nacronym_arbiter=%d\nacronym_FREEDOM_MACHINE=%d\nacronym_DataProcessResult=%d\nacronym_ENGINE_INTERNAL_visible=%d (total %d minus %d classification-prop usages)\nacronym_scope_isolation=%d\nacronym_T_number=%d\nacronym_CF_number=%d\nslop_hero_metric=%d\nslop_emoji_icon=%d\nslop_sidestripe=%d\nlang_physical_text=%d\nlang_ml_mr_auto=%d\ncoverage_not_yet_examined=%d\nSCORE=%d\n' \
  "$A_BFA" "$A_DNA" "$A_ARB" "$A_FRE" "$A_DPR" "$A_EIN" "$A_EIN_TOTAL" "$A_EIN_PROP" "$A_SCO" "$A_TNM" "$A_CFN" "$S_HERO" "$S_EMOJI" "$S_SIDE" "$L_TL" "$L_AUTO" "$C_NOTYET" "$SCORE"

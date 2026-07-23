#!/bin/bash
# File: .github/scripts/flow-23-template-check.sh
# CF-447: Verify T360 is at position 0 in all FLOW-23 DAG templates (70–75)

set -e
ES_HOST="${ES_HOST:-http://localhost:9200}"
FAIL=false

echo "CF-447 Check: T360 STEP 1 in FLOW-23 templates 70–75"
echo "========================================================"

for TMPL in 70 71 72 73 74 75; do
  RESPONSE=$(curl -sf "${ES_HOST}/xiigen-flow-registry/_doc/template-${TMPL}" 2>/dev/null)
  if [ $? -ne 0 ]; then
    echo "FAIL: Template ${TMPL} not found in xiigen-flow-registry"
    FAIL=true
    continue
  fi

  STEP1=$(echo "${RESPONSE}" | jq -r '._source.nodes | sort_by(.position) | .[0].taskTypeId // "MISSING"')

  if [ "${STEP1}" = "T360" ]; then
    echo "PASS: Template ${TMPL} — T360 at position 0"
  else
    echo "FAIL: Template ${TMPL} — position 0 = ${STEP1} (expected T360)"
    FAIL=true
  fi
done

echo "========================================================"
if [ "${FAIL}" = "true" ]; then
  echo "CF-447 BUILD FAILURE: One or more templates missing T360 at position 0"
  exit 1
fi

echo "CF-447 SATISFIED: All 6 templates have T360 at position 0"
exit 0

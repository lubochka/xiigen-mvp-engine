#!/bin/bash
# seed-design-reasoning.sh
# Seeds all DESIGN_REASONING triples from fixtures/design-reasoning/ to xiigen-rag-patterns.
#
# Run after Elasticsearch is up: curl localhost:9200 returns 200
#
# Gate requirement: >= 8 DESIGN_REASONING documents (Check 13 of infrastructure gate)
#
# Usage:
#   ./scripts/seed-design-reasoning.sh
#   ES=localhost:9200 ./scripts/seed-design-reasoning.sh   # override host

set -e

ES="${ES:-localhost:9200}"
INDEX="xiigen-rag-patterns"
FIXTURES_DIR="$(cd "$(dirname "$0")/../fixtures/design-reasoning" && pwd)"

echo "=== Seeding DESIGN_REASONING triples to ${INDEX} ==="
echo "    ES:       ${ES}"
echo "    Fixtures: ${FIXTURES_DIR}"
echo ""

# ── Check ES is up ────────────────────────────────────────────────────────────
if ! curl -sf -o /dev/null "${ES}"; then
  echo "❌ Elasticsearch not reachable at ${ES}"
  echo "   Start ES first: docker compose up -d elasticsearch"
  exit 1
fi
echo "✓ Elasticsearch reachable"

# ── Ensure index mapping for keyword fields ───────────────────────────────────
curl -sf -o /dev/null -X PUT "${ES}/${INDEX}" \
  -H "Content-Type: application/json" \
  -d '{
    "mappings": {
      "properties": {
        "patternType": { "type": "keyword" },
        "decisionId":  { "type": "keyword" },
        "planId":      { "type": "keyword" },
        "type":        { "type": "keyword" }
      }
    }
  }' 2>/dev/null || true   # 400 = already exists, that's fine
echo "✓ Index ready"
echo ""

TOTAL=0
FAILED=0
SEEDED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

# ── Process each fixture file ─────────────────────────────────────────────────
for FILE in "${FIXTURES_DIR}"/*.json; do
  BASENAME="$(basename "${FILE}")"
  echo "--- ${BASENAME} ---"

  python3 - "${FILE}" "${ES}" "${INDEX}" "${SEEDED_AT}" <<'PYEOF'
import json, subprocess, sys

file_path, es, index, seeded_at = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]

with open(file_path) as f:
    data = json.load(f)

plan_id   = data.get('planId', data.get('projectId', 'unknown'))
decisions = data.get('decisions', [data])   # single doc or array

failed = 0
for decision in decisions:
    doc_id = decision.get('decisionId', plan_id)

    doc = {
        **decision,
        'patternType': 'DESIGN_REASONING',
        'planId':      plan_id,
        'seededAt':    seeded_at,
        'tags': [
            'design-reasoning',
            decision.get('type', '').lower().replace('_', '-'),
            'pre-flow-01',
        ],
        'keywords': ' '.join(filter(None, [
            decision.get('capability', ''),
            str(decision.get('resolution', ''))[:120],
            decision.get('principleApplied', '')[:80],
        ])),
    }

    result = subprocess.run(
        ['curl', '-sf', '-X', 'PUT',
         f'http://{es}/{index}/_doc/{doc_id}',
         '-H', 'Content-Type: application/json',
         '-d', json.dumps(doc)],
        capture_output=True, text=True,
    )

    try:
        outcome = json.loads(result.stdout).get('result', 'ERROR')
    except Exception:
        outcome = 'PARSE_ERROR'

    status = '✓' if outcome in ('created', 'updated') else '✗'
    print(f'  {status} {doc_id}: {outcome}')

    if outcome not in ('created', 'updated'):
        failed += 1

sys.exit(failed)
PYEOF

  EXIT_CODE=$?
  FILE_DECISIONS=$(python3 -c "
import json
d = json.load(open('${FILE}'))
print(len(d.get('decisions', [d])))
")
  TOTAL=$((TOTAL + FILE_DECISIONS))
  if [ "${EXIT_CODE}" != "0" ]; then
    FAILED=$((FAILED + EXIT_CODE))
  fi
  echo ""
done

# ── Verify final count ────────────────────────────────────────────────────────
echo "=== Verifying indexed count ==="

COUNT=$(curl -sf "${ES}/${INDEX}/_count" \
  -H "Content-Type: application/json" \
  -d '{"query":{"term":{"patternType":"DESIGN_REASONING"}}}' \
  | python3 -c "import json,sys; print(json.load(sys.stdin).get('count', 0))")

echo "DESIGN_REASONING documents in RAG: ${COUNT}"
echo "Gate requires: >= 8"
echo ""

if [ "${COUNT}" -ge "8" ] && [ "${FAILED}" = "0" ]; then
  echo "✅ CHECK 13 PASS — DESIGN_REASONING seeding complete"
  echo "   Seeded: ${TOTAL} documents  |  Indexed: ${COUNT}  |  Failures: ${FAILED}"
else
  echo "❌ FAIL — Seeded: ${TOTAL}  |  Indexed: ${COUNT}  |  Failures: ${FAILED}"
  [ "${COUNT}" -lt "8" ] && echo "   Need >= 8 documents; have ${COUNT}"
  [ "${FAILED}" != "0" ] && echo "   ${FAILED} document(s) failed to index"
  exit 1
fi

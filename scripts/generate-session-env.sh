#!/usr/bin/env bash
# generate-session-env.sh — Generate a session-unique .env.e2e-session file.
# Run from repo root before any E2E test run.
# secrets/api-keys.txt is OPTIONAL — absent = mock mode (AI tests use MockAiProvider).

set -euo pipefail

SESSION_ID=$(uuidgen | tr '[:upper:]' '[:lower:]' 2>/dev/null || python3 -c "import uuid; print(str(uuid.uuid4()))")
SESSION_SHORT=$(echo "$SESSION_ID" | cut -c1-8)

# Defaults — all empty (mock mode)
ANTHROPIC_API_KEY=""
GEMINI_API_KEY=""
PINECONE_API_KEY=""
PINECONE_INDEX=""
PINECONE_ENVIRONMENT=""

# Load real keys if file exists (never required)
if [ -f secrets/api-keys.txt ]; then
  # shellcheck disable=SC1091
  set -o allexport
  # source line-by-line to skip comments
  while IFS='=' read -r key value; do
    [[ "$key" =~ ^#.*$ || -z "$key" ]] && continue
    export "$key=$value"
  done < secrets/api-keys.txt
  set +o allexport
  echo "INFO: secrets/api-keys.txt loaded — cloud provider tests enabled"
else
  echo "INFO: No secrets/api-keys.txt — running in mock mode (AI tests use MockAiProvider)"
fi

cat > .env.e2e-session << EOF
# XIIGen E2E session — generated $(date -u +"%Y-%m-%dT%H:%M:%SZ")
# Session: $SESSION_ID
SESSION_ID=$SESSION_ID
SESSION_SHORT=$SESSION_SHORT
ES_INDEX_PREFIX=test-$SESSION_SHORT
REDIS_KEY_PREFIX=test:$SESSION_SHORT:
PG_SCHEMA=test_$SESSION_SHORT
QDRANT_COLLECTION_PREFIX=test_$SESSION_SHORT
ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY
GEMINI_API_KEY=$GEMINI_API_KEY
PINECONE_API_KEY=$PINECONE_API_KEY
PINECONE_INDEX=$PINECONE_INDEX
PINECONE_ENVIRONMENT=$PINECONE_ENVIRONMENT
AI_MAX_OUTPUT_TOKENS=200
AI_TEST_MODEL_ANTHROPIC=claude-haiku-4-5-20251001
AI_TEST_MODEL_GEMINI=gemini-2.0-flash
EOF

echo "Session env generated: $SESSION_ID"
echo "  ES index prefix:   test-$SESSION_SHORT"
echo "  PG schema:         test_$SESSION_SHORT"
echo "  Qdrant prefix:     test_$SESSION_SHORT"

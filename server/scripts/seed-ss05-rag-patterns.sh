#!/bin/bash
# SS-05: Seed FLOW_DESIGN RAG patterns for spec audit protocol.
# Seeds: spec-to-fabric-audit, machine-constant-at-spec-time, prerequisite-resolution-protocol
#
# Usage:
#   bash server/scripts/seed-ss05-rag-patterns.sh
#   ES_URL=my-es-host:9200 bash server/scripts/seed-ss05-rag-patterns.sh

set -euo pipefail
ES_URL="${ES_URL:-localhost:9200}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=== SS-05 RAG Pattern Seed ==="
echo "ES: ${ES_URL}"

node "${SCRIPT_DIR}/seed-ss05-rag-patterns.js" "http://${ES_URL}"

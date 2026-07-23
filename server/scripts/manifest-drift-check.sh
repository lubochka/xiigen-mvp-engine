#!/bin/bash
# XIIGen Manifest Drift Detection
# Compares xiigen-capability-manifest against live codebase.
# Reports: entries in manifest but missing from code, entries in code but missing from manifest.
# Run before planning sessions or after adding new fabric interfaces.

set -euo pipefail
ES_URL="${ES_URL:-localhost:9200}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

echo "=== Manifest Drift Check ==="
echo "ES: ${ES_URL}"

node "${SCRIPT_DIR}/manifest-drift-check.js" "${PROJECT_ROOT}" "http://${ES_URL}"

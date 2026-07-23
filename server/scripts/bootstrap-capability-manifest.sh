#!/bin/bash
# XIIGen Bootstrap Capability Manifest Scanner
# Reads the live codebase and populates xiigen-capability-manifest
# and xiigen-fabric-registry from source of truth files.
# Safe to re-run: uses upsert (doc_as_upsert) so existing entries update.
#
# NOTE: Uses node.js bootstrap runner for cross-platform grep compatibility.

set -euo pipefail
ES_URL="${ES_URL:-localhost:9200}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

echo "=== XIIGen Bootstrap Manifest Scan ==="
echo "ES: ${ES_URL}"
echo "Project root: ${PROJECT_ROOT}"

node "${SCRIPT_DIR}/bootstrap-capability-manifest.js" "${PROJECT_ROOT}" "${ES_URL}"

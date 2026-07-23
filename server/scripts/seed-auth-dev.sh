#!/bin/bash
# FLOW-01 Phase A5 (V-07): Seed dev auth users.
# Seeds 6 users (3 roles × 2 tenants) + 2 platform-admin elevations.
# Idempotent — reruns overwrite. See seed-auth-dev.js for full matrix.
#
# Usage:
#   bash server/scripts/seed-auth-dev.sh
#   ES_URL=my-es-host:9200 bash server/scripts/seed-auth-dev.sh
#   DRY_RUN=1 bash server/scripts/seed-auth-dev.sh

set -euo pipefail
ES_URL="${ES_URL:-localhost:9200}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=== FLOW-01 Phase A5 — Dev Auth Seed ==="
echo "ES: ${ES_URL}"

EXTRA_ARGS=()
if [[ "${DRY_RUN:-0}" == "1" ]]; then
  EXTRA_ARGS+=("--dry-run")
fi

node "${SCRIPT_DIR}/seed-auth-dev.js" "http://${ES_URL}" "${EXTRA_ARGS[@]}"

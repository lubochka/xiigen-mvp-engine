#!/bin/bash
# XIIGen Spec Audit CLI
# Run spec audit against a file or stdin.
#
# Usage:
#   bash server/scripts/run-spec-audit.sh <spec-file>
#   echo "Auth Service calls User Service" | bash server/scripts/run-spec-audit.sh
#
# Exit code: 0 = CLEAN, 1 = BLOCKING_GAPS or error, 2 = GAPS_FOUND (warnings only)

set -euo pipefail
ES_URL="${ES_URL:-localhost:9200}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

export ES_URL

node "${SCRIPT_DIR}/run-spec-audit.js" "${1:-}"

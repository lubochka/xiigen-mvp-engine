#!/usr/bin/env bash
# run-e2e.sh — One-command E2E orchestrator for XIIGen.
# Run from repo root.
#
# Usage:
#   bash scripts/run-e2e.sh              # full run (all providers available)
#   bash scripts/run-e2e.sh --mock-only  # InMemory + MockAi only (no Docker needed)

set -euo pipefail

MOCK_ONLY=false
for arg in "$@"; do
  [[ "$arg" == "--mock-only" ]] && MOCK_ONLY=true
done

echo "================================================"
echo "  XIIGen E2E Test Runner"
echo "================================================"

# 1. Security pre-flight
echo "[1/5] Running security pre-flight check..."
node scripts/verify-integration-env.js

# 2. Generate session env
echo "[2/5] Generating session env..."
bash scripts/generate-session-env.sh

# 3. Start Docker stack (skip if --mock-only)
if [ "$MOCK_ONLY" = false ]; then
  echo "[3/5] Starting Docker e2e stack..."
  docker compose -f docker-compose.test.yml --profile e2e up -d --wait 2>/dev/null || {
    echo "WARN: Docker stack failed to start — falling back to InMemory providers"
    echo "      Use --mock-only to suppress this warning"
  }
else
  echo "[3/5] Skipping Docker stack (--mock-only mode)"
fi

# 4. Run E2E tests
echo "[4/5] Running E2E tests..."
cd server
npx jest --config jest.e2e.config.js --runInBand 2>&1
EXIT_CODE=$?
cd ..

# 5. Cleanup session data
echo "[5/5] Cleaning up session data..."
cd server
npx jest --config jest.e2e.config.js --testPathPatterns="cleanup" --runInBand 2>/dev/null || true
cd ..

SESSION_ID=$(grep SESSION_ID .env.e2e-session 2>/dev/null | cut -d= -f2 || echo "unknown")
echo ""
echo "================================================"
echo "  E2E complete. Session: $SESSION_ID"
echo "  Exit code: $EXIT_CODE"
echo "================================================"
exit $EXIT_CODE

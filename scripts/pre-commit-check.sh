#!/bin/bash
# scripts/pre-commit-check.sh
# Run this before every commit. All 8 checks must pass.
# Usage: ./scripts/pre-commit-check.sh && git add -A && git commit -m "..."

set -uo pipefail
FAIL=0

fail() { echo "❌ $1"; FAIL=$((FAIL+1)); }
pass() { echo "✅ $1"; }

echo "=== PRE-COMMIT GATE ==="

# ── CHECK 1: Server lint ─────────────────────────────────────────────────────
echo "--- 1/8: Server lint (0 errors, 0 warnings)"
cd server
LINT=$(npm run lint 2>&1)
ERRS=$(echo "$LINT" | grep -cE "^\s+[0-9]+:[0-9]+\s+error" || true)
WARN=$(echo "$LINT" | grep -cE "^\s+[0-9]+:[0-9]+\s+warning" || true)
if [ "$ERRS" -eq 0 ] && [ "$WARN" -eq 0 ]; then
  pass "Server lint: 0 errors, 0 warnings"
else
  fail "Server lint: $ERRS errors, $WARN warnings"
  echo "$LINT" | grep -E "error|warning" | head -20
fi
cd ..

# ── CHECK 2: Server TypeScript ───────────────────────────────────────────────
echo "--- 2/8: Server tsc (0 errors)"
TSC=$(cd server && npx tsc --noEmit 2>&1 | grep -v TS5101 | grep -c "error" || true)
[ "$TSC" -eq 0 ] && pass "Server tsc: 0 errors" || \
  { fail "Server tsc: $TSC errors"
    cd server && npx tsc --noEmit 2>&1 | grep -v TS5101 | grep "error" | head -10; cd ..; }

# ── CHECK 3: Server tests ────────────────────────────────────────────────────
echo "--- 3/8: Server tests (0 failures, 0 skipped)"
JEST_JSON="server/.jest-precommit-result.json"
JEST_LOG="server/.jest-precommit-output.log"
rm -f "$JEST_JSON" "$JEST_LOG"
(cd server && npx jest --passWithNoTests --json --outputFile .jest-precommit-result.json > .jest-precommit-output.log 2>&1)
JEST_EXIT=$?
if [ -f "$JEST_JSON" ]; then
  TFAIL=$(node -e "const fs=require('fs'); const d=JSON.parse(fs.readFileSync(process.argv[1],'utf8')); console.log(d.numFailedTests || 0);" "$JEST_JSON")
  TPASS=$(node -e "const fs=require('fs'); const d=JSON.parse(fs.readFileSync(process.argv[1],'utf8')); console.log(d.numPassedTests || 0);" "$JEST_JSON")
  TSKIP=$(node -e "const fs=require('fs'); const d=JSON.parse(fs.readFileSync(process.argv[1],'utf8')); console.log(d.numPendingTests || 0);" "$JEST_JSON")
  TTOTAL=$(node -e "const fs=require('fs'); const d=JSON.parse(fs.readFileSync(process.argv[1],'utf8')); console.log(d.numTotalTests || 0);" "$JEST_JSON")
else
  TFAIL=1
  TPASS=0
  TSKIP=0
  TTOTAL=0
fi
if [ "$JEST_EXIT" -eq 0 ] && [ "$TFAIL" -eq 0 ] && [ "$TSKIP" -eq 0 ]; then
  pass "Server tests: 0 skipped, $TPASS passed, $TTOTAL total"
else
  fail "Server tests: $TFAIL failures, $TSKIP skipped"
  tail -40 "$JEST_LOG" 2>/dev/null || true
fi
rm -f "$JEST_JSON" "$JEST_LOG"

# ── CHECK 4: Client TypeScript ───────────────────────────────────────────────
echo "--- 4/8: Client tsc (0 errors)"
CTSC=$(cd client && npx tsc --noEmit 2>&1 | grep -v TS5101 | grep -c "error" || true)
[ "$CTSC" -eq 0 ] && pass "Client tsc: 0 errors" || fail "Client tsc: $CTSC errors"

# ── CHECK 5: No malformed eslint-disable (em/en-dash) ────────────────────────
echo "--- 5/8: No malformed eslint-disable comments (em/en-dash)"
MDASH=$(grep -rn "eslint-disable.*[—–]" server/src --include="*.ts" \
        --exclude="*.spec.ts" --exclude="*.test.ts" 2>/dev/null | wc -l || true)
if [ "$MDASH" -eq 0 ]; then
  pass "No malformed eslint-disable comments"
else
  fail "$MDASH malformed eslint-disable comment(s)"
  grep -rn "eslint-disable.*[—–]" server/src --include="*.ts" \
    --exclude="*.spec.ts" | head -5
fi

# ── CHECK 6: No new file-level eslint-disable banners ────────────────────────
echo "--- 6/8: No new file-level eslint-disable banners in staged files"
STAGED=$(git diff --cached --name-only 2>/dev/null | grep "server/src" | \
         grep "\.ts$" | grep -v "\.spec\." | grep -v "\.test\." || true)
NEW_BANNERS=0
for f in $STAGED; do
  if head -3 "$f" 2>/dev/null | grep -q "^/\* eslint-disable"; then
    NEW_BANNERS=$((NEW_BANNERS+1))
    echo "  BANNED BANNER: $f"
  fi
done
[ "$NEW_BANNERS" -eq 0 ] && pass "No new file-level eslint-disable banners" || \
  fail "$NEW_BANNERS staged file(s) have file-level eslint-disable banners (OP-2 violation)"

# ── CHECK 7: No 'as any' or ': any' introduced in staged production files ────
echo "--- 7/8: No 'as any' or ': any' introduced in staged production files"
ANY_LINES=""
NEW_ANY=0
for f in $STAGED; do
  FILE_ANY=$(git diff --cached -- "$f" 2>/dev/null | grep "^+" | grep -v "^+++" | \
             grep -E "\bas any\b|: any[,;)> ]" || true)
  if [ -n "$FILE_ANY" ]; then
    ANY_LINES="${ANY_LINES}${FILE_ANY}
"
    FILE_ANY_COUNT=$(echo "$FILE_ANY" | wc -l)
    NEW_ANY=$((NEW_ANY+FILE_ANY_COUNT))
  fi
done
if [ "$NEW_ANY" -eq 0 ]; then
  pass "No new 'as any' or ': any' in staged production files"
else
  fail "$NEW_ANY new 'as any'/'': any' occurrence(s) introduced (OP-2 violation)"
  echo "$ANY_LINES" | head -10
fi



# ── CHECK 8: Client build (Vite — catches what tsc alone misses) ─────────────
# Client build catches what TypeScript alone can miss.
echo "--- 8/8: Client build (0 Vite errors)"
CBUILD=$( (cd client && npm run build 2>&1) || true )
CBUILD_ERRS=$(echo "$CBUILD" | grep -cE "^error TS|^Error:" || true)
if [ "$CBUILD_ERRS" -eq 0 ]; then
  pass "Client build: success"
else
  fail "Client build: $CBUILD_ERRS error(s) — run: cd client && npm run build"
  echo "$CBUILD" | grep -E "^error TS|^Error:" | head -10
fi

# ── RESULT ───────────────────────────────────────────────────────────────────
echo ""
echo "=== PRE-COMMIT GATE RESULT ==="
if [ "$FAIL" -eq 0 ]; then
  echo "✅ ALL 8 CHECKS PASSED — safe to commit and push"
  exit 0
else
  echo "❌ $FAIL CHECK(S) FAILED — fix above, re-run, then commit"
  exit 1
fi

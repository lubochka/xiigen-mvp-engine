---
name: phase-preflight
sk_number: SK-457
version: "1.1.0"
priority: MANDATORY
load_order: -1
category: code-execution
author: luba
updated: "2026-04-23"
contexts: ["claude-code"]
description: >
  At the start of every Claude Code session, before writing a single line of code,
  run every verification command in the session file's STEP 0 assumption registry.
  v1.1 adds default check #5: portability prerequisites — scans existing services
  for ClsService before new code is added. Closes G-35b.
---

# Phase Preflight Skill (SK-457) v1.1

## WHEN TO INVOKE

At the start of every Claude Code execution session, before any code is written.

---

## THE PREFLIGHT PROTOCOL

### Step 1: Run every assumption verification command

For each row in the session file's STEP 0 assumption registry, run the verification
command and check against expected output. BLOCKING failure with no fallback = STOP.

### Step 2: Triage failures

```
Has fallback → apply fallback; note EXCEPTION in ISSUE INVENTORY; continue
No fallback (BLOCKING) → STOP; escalate with exact failure output
```

### Step 3: Record results

```markdown
## PREFLIGHT RESULTS

| Assumption | Result | Action |
|-----------|--------|--------|
| A1: method signature exists | ✅ PASS | No action |
| A2: service registered in DI | ❌ FAIL | BLOCKING — stopped |
```

---

## DEFAULT PREFLIGHT CHECKS (when no session registry exists)

```bash
echo "=== DEFAULT PREFLIGHT ==="

# 1. Test baseline
cd server && npx jest 2>&1 | tail -5
# Expected: failures === 0

# 2. Compilation
cd server && npx tsc --noEmit 2>&1 | head -10
# Expected: 0 errors

# 3. Target files exist (for sessions modifying existing files)
for FILE in $(grep "server/src" SESSION-GROUP-*.md 2>/dev/null | grep -oE "server/src[^ ']+" | sort -u); do
  [ ! -f "$FILE" ] && echo "MISSING FILE: $FILE"
done

# 4. Prior group completeness
echo "Manual check: verify prerequisite group completion"

# 5. PORTABILITY PREREQUISITES (new v1.1 — run for GENERATION sessions)
echo "=== PORTABILITY PREREQUISITES ==="

# 5a. Canonical CLS stubs exist (required before writing service tests)
CLS_STUB=$(ls server/src/test-utils/stubs/cls-mock.stub.ts 2>/dev/null | wc -l)
echo "5a. CLS stub: $CLS_STUB"
if [ "$CLS_STUB" -eq 0 ]; then
  echo "⚠️  PREREQ: cls-mock.stub.ts absent — create before writing service tests"
  echo "   See XIIGEN-FLOW-IMPLEMENTATION-PLAN §INFRA-3 for canonical stub content"
fi

# 5b. If resuming an existing flow — scan for ClsService violations
FLOW_SLUG="${FLOW_SLUG:-}"
if [ -n "$FLOW_SLUG" ]; then
  CLS=$(grep -rc "import.*ClsService\|from 'nestjs-cls'" \
    server/src/engine/flows/$FLOW_SLUG/ --include="*.service.ts" 2>/dev/null \
    | awk -F: '{sum+=$2} END {print sum+0}')
  echo "5b. ClsService in $FLOW_SLUG: $CLS"
  if [ "$CLS" -gt 0 ]; then
    echo "⚠️  PORTABILITY ISSUE: $CLS ClsService import(s) found in existing services"
    echo "   Fix before adding new services. See SK-419 v1.1.0 P-1 fix row."
    echo "   BLOCKING for new service creation in this flow."
  fi

  # 5c. FREEDOM key scoping
  UNSCOPED=$(grep -rE "freedom\.get\(|fromConfig\(" \
    server/src/engine/flows/$FLOW_SLUG/ --include="*.service.ts" 2>/dev/null \
    | grep -vc "flow[0-9][0-9]*_" || echo 0)
  echo "5c. Unscoped FREEDOM keys: $UNSCOPED"
  if [ "$UNSCOPED" -gt 0 ]; then
    echo "⚠️  $UNSCOPED FREEDOM key(s) without flow-scoped prefix"
    echo "   Rename to flow{NN}_key_name. See SK-418 v1.1.0 P-3."
  fi
fi

echo "=== DEFAULT PREFLIGHT COMPLETE ==="
```

---

## THREE PREFLIGHT PATTERNS BY FIX TYPE

### Pattern 1: Handler injection fix

Check method signature exists and service is registered in DI module.

```bash
grep -n "methodName(" server/src/path/to/service.ts
grep -n "exports:" server/src/module/module.ts | grep "ServiceName"
grep -n "ServiceName\|ModuleName" server/src/engine/engine.module.ts
```

### Pattern 2: TypeScript field access

Check field name (camelCase vs snake_case) before writing access code.

```bash
grep -n "readonly fieldName\|fieldName:" server/src/path/to/schema.ts
```

### Pattern 3: Module registration

Check provider not already registered and token is exported.

```bash
grep -n "ProviderName\|PROVIDER_TOKEN" server/src/fabrics/module.ts
```

### Pattern 4: Portability resumption — NEW v1.1

Before adding any new service to an existing flow, verify the existing services
are portability-clean. A ClsService violation in an existing service means the
new service's portability checks will also fail (P-1 counts are cumulative).

```bash
FLOW_SLUG="flow-{NN}-{name}"

# Portability scan — must all be 0/clean before creating new services
grep -rl "import.*ClsService\|from 'nestjs-cls'" \
  server/src/engine/flows/$FLOW_SLUG/ --include="*.service.ts"
# Expected: no output (empty)

grep -rL "@connectionType" \
  server/src/engine/flows/$FLOW_SLUG/ --include="*.service.ts"
# Expected: no output (all annotated)

grep -rn "^interface IDb\|^interface IQueue\|^interface IFreedom" \
  server/src/engine/flows/$FLOW_SLUG/ --include="*.ts"
# Expected: no output
```

P-1 violations found → BLOCKING. Fix existing ClsService services before creating
any new service. P-2/P-4 violations found → NON-BLOCKING but record in ISSUE INVENTORY.

---

## ESCALATION FORMAT

```
PREFLIGHT BLOCKED: Cannot proceed with [session name]

Blocking assumption: [A-N or check number]
Expected: [what was expected]
Actual: [what was found]
Resolution: [what must be true before session can proceed]
```

---

## INTEGRATION

```
phase-preflight (SK-457 v1.1)
  → runs at session START, before any code written
  → default check #5: portability prerequisites
  → Pattern 4: portability resumption scan for existing flows
  → dna-compliance-guard v1.1.0: same P-1..P-5 checks at phase close
  → ISSUE INVENTORY: portability findings recorded as BLOCKING or NON-BLOCKING
```

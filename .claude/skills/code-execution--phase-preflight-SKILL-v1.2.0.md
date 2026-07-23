---
name: phase-preflight
sk_number: SK-457
version: "1.2.0"
priority: MANDATORY
load_order: -1
category: code-execution
author: luba
updated: "2026-04-24"
contexts: ["claude-code"]
description: >
  At the start of every Claude Code session, before writing a single line of code,
  run every verification command in the session file's STEP 0 assumption registry.
  v1.1 adds default check #5: portability prerequisites (ClsService scan, FREEDOM
  key scoping). v1.2 adds default check #6: auth infrastructure presence — detects
  whether AUTH-ROLES-GROUPS-PLAN-v3.0 Phases 1-4 are deployed and emits AUTH_DEFERRED
  warning when absent. Closes AUTH-ARBITER-SKILLS-REMEDIATION-PLAN-v3.0 Phase 5.
---

# Phase Preflight Skill (SK-457) v1.2

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

# 5. PORTABILITY PREREQUISITES (v1.1 — run for GENERATION sessions)
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
    echo "⚠️  PORTABILITY ISSUE: $CLS ClsService import(s) in existing services"
    echo "   Fix before adding new services. See SK-419 v1.2.0 P-1 fix row."
    echo "   BLOCKING for new service creation in this flow."
  fi

  # 5c. FREEDOM key scoping
  UNSCOPED=$(grep -rE "freedom\.get\(|fromConfig\(" \
    server/src/engine/flows/$FLOW_SLUG/ --include="*.service.ts" 2>/dev/null \
    | grep -vc "flow[0-9][0-9]*_" || echo 0)
  echo "5c. Unscoped FREEDOM keys: $UNSCOPED"
  if [ "$UNSCOPED" -gt 0 ]; then
    echo "⚠️  $UNSCOPED FREEDOM key(s) without flow-scoped prefix"
    echo "   Rename to flow{NN}_key_name. See SK-418 v1.2.0 P-3."
  fi
fi

# 6. AUTH INFRASTRUCTURE CHECK (new v1.2 — run for GENERATION sessions)
echo "=== AUTH INFRASTRUCTURE CHECK ==="

AUTH_MODULE=$(ls server/src/auth/auth.module.ts 2>/dev/null | wc -l)
SCOPE_WIRE=$(ls server/src/auth/scope-enrichment.interceptor.ts 2>/dev/null | wc -l)
APP_GUARD=$(grep -c "JwtAuthGuard\|APP_GUARD" server/src/app.module.ts 2>/dev/null || echo 0)
ROLE_STRINGS=$(ls server/src/kernel/role-strings.ts 2>/dev/null | wc -l)

echo "6a. auth.module.ts:                    $([ $AUTH_MODULE -eq 1 ] && echo 'PRESENT ✅' || echo 'ABSENT ⚠️')"
echo "6b. scope-enrichment.interceptor.ts:   $([ $SCOPE_WIRE -eq 1 ] && echo 'PRESENT ✅' || echo 'ABSENT ⚠️')"
echo "6c. JwtAuthGuard registered APP_GUARD: $([ $APP_GUARD -gt 0 ] && echo 'PRESENT ✅' || echo 'ABSENT ⚠️')"
echo "6d. role-strings.ts:                   $([ $ROLE_STRINGS -eq 1 ] && echo 'PRESENT ✅' || echo 'ABSENT ⚠️')"

AUTH_INFRA_SCORE=$((AUTH_MODULE + SCOPE_WIRE + APP_GUARD + ROLE_STRINGS))

if [ "$AUTH_INFRA_SCORE" -eq 4 ]; then
  echo "✅ AUTH INFRASTRUCTURE: PRESENT — controllers may be fully guarded"
elif [ "$AUTH_INFRA_SCORE" -eq 0 ]; then
  echo "⚠️  AUTH_DEFERRED: No auth infrastructure detected"
  echo "   AUTH-ROLES-GROUPS-PLAN-v3.0 Phases 1-4 not yet deployed."
  echo "   Generated controllers will be unguarded until auth ships."
  echo "   Record authStatus=AUTH_DEFERRED in STATE.json at phase close."
  echo "   NON-BLOCKING — session may proceed; controllers get @Roles in Phase H."
else
  echo "⚠️  AUTH PARTIAL ($AUTH_INFRA_SCORE/4 components present):"
  [ "$AUTH_MODULE" -eq 0 ]  && echo "   MISSING: server/src/auth/auth.module.ts"
  [ "$SCOPE_WIRE" -eq 0 ]   && echo "   MISSING: server/src/auth/scope-enrichment.interceptor.ts"
  [ "$APP_GUARD" -eq 0 ]    && echo "   MISSING: JwtAuthGuard as APP_GUARD in app.module.ts"
  [ "$ROLE_STRINGS" -eq 0 ] && echo "   MISSING: server/src/kernel/role-strings.ts"
  echo "   Partial auth infra — controllers can be decorated but may not enforce correctly."
  echo "   Treat as AUTH_DEFERRED until all 4 components present."
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

### Pattern 4: Portability resumption — v1.1

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

### Pattern 5: Auth resumption — NEW v1.2

Before adding any new controller to an existing flow, verify the auth state of
existing controllers. If auth infrastructure is absent, record AUTH_DEFERRED and
proceed. If auth infrastructure is present but existing controllers are unguarded,
fix before adding new unguarded controllers — partial auth is worse than none
(it creates a false impression of protection).

```bash
FLOW_SLUG="flow-{NN}-{name}"

# Auth infrastructure check (same as default check #6):
AUTH_MODULE=$(ls server/src/auth/auth.module.ts 2>/dev/null | wc -l)
echo "Auth infra: $([ $AUTH_MODULE -eq 1 ] && echo 'PRESENT' || echo 'ABSENT — AUTH_DEFERRED')"

if [ "$AUTH_MODULE" -eq 1 ]; then
  # Auth infra present — scan existing controllers for compliance
  CONTROLLERS=$(find server/src/engine/flows/$FLOW_SLUG -name "*.controller.ts" \
    2>/dev/null | wc -l)
  GUARDED=$(grep -rl "@UseGuards" \
    server/src/engine/flows/$FLOW_SLUG --include="*.controller.ts" 2>/dev/null \
    | wc -l)
  echo "Existing controllers: $CONTROLLERS | Guarded: $GUARDED"

  if [ "$CONTROLLERS" -gt 0 ] && [ "$GUARDED" -lt "$CONTROLLERS" ]; then
    echo "⚠️  AUTH GAP: $((CONTROLLERS - GUARDED)) controller(s) without @UseGuards"
    echo "   Fix existing controllers before adding new ones."
    echo "   Use dna-compliance-guard v1.2.0 A-1..A-2 commands to identify specific files."
    echo "   NON-BLOCKING — may proceed, but record authGaps[] in STATE.json."
    grep -rL "@UseGuards" \
      server/src/engine/flows/$FLOW_SLUG --include="*.controller.ts" 2>/dev/null \
      | sed 's/^/   UNGUARDED: /'
  else
    echo "✅ All existing controllers guarded (or no controllers yet)"
  fi
fi
```

Auth infra absent → NON-BLOCKING, record AUTH_DEFERRED.
Auth infra present + unguarded controllers found → NON-BLOCKING, record in authGaps[].
Auth infra present + all guarded → PASS.

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
phase-preflight (SK-457 v1.2)
  → runs at session START, before any code written
  → default check #5: portability prerequisites (ClsService, FREEDOM keys)
  → default check #6: auth infrastructure (auth.module.ts, interceptor, APP_GUARD, role-strings)
  → Pattern 4: portability resumption scan for existing flows
  → Pattern 5: auth resumption scan for existing controllers (NEW v1.2)
  → dna-compliance-guard v1.2.0: same P-1..P-5 + A-1..A-3 + D-HIST-001 at phase close
  → flow-implementation-guide v1.3.0: V10 auth gate reads authStatus set here
  → ISSUE INVENTORY: portability + auth findings recorded as BLOCKING or NON-BLOCKING
  → STATE.json: authStatus=AUTH_DEFERRED emitted when check #6 finds no auth infra
```

## Changelog

- **v1.0.0** — initial skill. 3-step preflight protocol, Patterns 1-3, escalation format.
- **v1.1.0** — default check #5: portability prerequisites (5a CLS stub, 5b ClsService
  scan, 5c FREEDOM key scoping). Pattern 4: portability resumption. Closes G-35b.
- **v1.2.0** — default check #6: auth infrastructure (auth.module.ts,
  ScopeEnrichmentInterceptor, JwtAuthGuard as APP_GUARD, role-strings.ts). Three-outcome
  verdict: PRESENT / AUTH_DEFERRED / PARTIAL (with component list). Pattern 5: auth
  resumption scan (unguarded controller detection before new controllers added). Both
  are NON-BLOCKING — session proceeds with AUTH_DEFERRED label in STATE.json.
  Closes AUTH-ARBITER-SKILLS-REMEDIATION-PLAN-v3.0 Phase 5.

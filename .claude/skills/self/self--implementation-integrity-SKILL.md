---
name: implementation-integrity
sk_number: SK-507
version: "1.0.0"
priority: HIGH
load_order: 99
category: self
layer: engine-self-awareness
author: luba
updated: "2026-03-26"
contexts: ["claude-code"]
description: >
  After a capability extension session completes, verifies that: the gap was
  actually closed (capability manifest updated), all flows that were blocked by
  the gap now have a clear path forward, and no new gaps were introduced by
  the implementation. The Golden Rule applied to self-extension.
triggers:
  - "verify the gap is closed"
  - "capability extension complete"
  - "did we close the gap"
  - "self-extension verification"
  - "after building a fabric interface"
  - "after implementing infrastructure"
---

# Implementation Integrity Skill (SK-507)

## THE GOLDEN RULE FOR SELF-EXTENSION

Fix the instance AND add the structural guard that prevents regression.

A capability session that adds IMessagingService but does not:
- Update the capability manifest to ACTIVE
- Add messaging_via_fabric_not_direct named check
- Update prerequisite-chain-SKILL.md (SK-458) to reflect the new prerequisite

...has fixed the instance without adding the guard.

---

## CHECK 1 — CAPABILITY MANIFEST UPDATED

```bash
# Verify the gap entry flipped from MISSING to ACTIVE
curl -sf "localhost:9200/xiigen-capability-manifest/_doc/IMessagingService" \
  | jq '{status: ._source.status, activeProvider: ._source.activeProvider}'
# Expected: status = "ACTIVE", activeProvider = non-null

# If still MISSING: the session failed to update the manifest
```

---

## CHECK 2 — BLOCKED FLOWS NOW UNBLOCKED

```bash
# Find flows that listed this capability as a prerequisite
curl -sf "localhost:9200/xiigen-flow-lifecycle/_search" \
  -d '{"query":{"term":{"blockedBy.keyword":"IMessagingService"}}}' \
  | jq '.hits.hits[]._source | {flowId, status, blockedBy}'

# For each returned flow: verify blockedBy no longer contains this capability
# If blockedBy still contains it: update the flow lifecycle record
```

---

## CHECK 3 — NAMED CHECK INSTALLED

```bash
# Verify the structural guard was added
curl -sf "localhost:9200/xiigen-capability-manifest/_doc/messaging_via_fabric_not_direct" \
  | jq '{status: ._source.status}'
# Expected: status = "ACTIVE"

# Verify it appears in the plan-review-SKILL.md FC catalog
grep -c "messaging_via_fabric_not_direct" .claude/skills/planning/planning--plan-review-SKILL.md
# Expected: >= 1

# If 0: the named check was defined but not added to the gate — add it now
```

---

## CHECK 4 — NO NEW GAPS INTRODUCED

Re-run SK-505 (capability-state-reader) after the extension session.

```bash
# Count gaps before vs after
GAPS_BEFORE=$(jq '.gapCount' /tmp/capability-snapshot-before.json)
GAPS_AFTER=$(curl -sf "localhost:9200/xiigen-capability-manifest/_count" \
  -d '{"query":{"term":{"status.keyword":"MISSING"}}}' | jq '.count')

echo "Before: $GAPS_BEFORE gaps | After: $GAPS_AFTER gaps"
# Expected: GAPS_AFTER <= GAPS_BEFORE (closed gap, didn't add new ones)
# If GAPS_AFTER > GAPS_BEFORE: new gaps were introduced — investigate before proceeding
```

---

---

## CHECK 5 — ANTI-STUB (universal, from core)

A done-path must contain a real implementation, not a placeholder. The "report ≠
implementation reality" rule: a JSON row, a PowerShell run, a passing static
contract check, or a written report is NOT proof that the behavior exists.

```bash
# No stub/placeholder markers on a path claimed "done"
rg -n "TODO|FIXME|PLACEHOLDER|not_ready|NotImplemented|throw new Error\('not implemented'\)|@todo" \
  server/src client/src
# Expected on a done-path: 0 matches (or each match explicitly scoped as a
# non-done backlog item)

# A method on a done-path must do real work, not return a hardcoded no-op
# (e.g. `return DataProcessResult.ok([])` with no logic) — read the body.
```

For a learned/adaptive claim, numeric metrics are required (held-out eval run),
not an UNKNOWN/static/validation-only field. UNKNOWN cpu/ram/accuracy on a
done-path = FAIL. (R5: common-model metrics belong to `llm_mvp_core`; mvp proves
the consuming/integration behavior with real numbers.)

---

## CHECK 6 — REAL PROJECT BOUNDARY (universal, from core)

Tests and code must reference the REAL project, not a copied/inlined source.

- A new Jest spec sits beside the real provider it tests and imports it via the
  real workspace package path — not a relative `../../src` reach-around into
  another package, and not a re-declared local copy of the interface.
- The TS analog of a `<ProjectReference>` is the monorepo workspace package
  (`@xiigen/...` / `packages/*`), not a relative import across package roots.
- UI behavior is covered by a Playwright e2e against the real React route, not a
  mock that the test itself defines.

```bash
rg -n "from ['\"]\.\./\.\./\.\./" server/src client/src   # cross-package reach-arounds to inspect
```

---

## CHECK 7 — DOC-SYNC IN THE SAME SLICE (universal, from core)

Code that changes behavior, a contract, or runner output must update its docs in
the SAME slice. For mvp: README / `docs/` + OpenAPI/Swagger for NestJS
controllers whose shape changed. "Docs later" is a fail; known doc drift blocks
a done claim.

---

## CHECK 8 — STRUCTURAL GUARD ADDED, NOT JUST THE INSTANCE (universal, from core)

Fix the instance AND add the structural guard that prevents regression: a named
check, a Jest test that fails if the bug returns, or a lint/CI rule. An
instance-only fix is incomplete.

---

## OUTPUT

```markdown
## IMPLEMENTATION INTEGRITY REPORT — [capability]
## Session: [session ID]
## Date: [date]

| Check | Expected | Actual | Status |
|-------|----------|--------|--------|
| Manifest updated | ACTIVE | [actual] | ✅/❌ |
| Blocked flows unblocked | 0 flows blocked | [count] | ✅/❌ |
| Named check installed | FC entry present | [found/missing] | ✅/❌ |
| No new gaps | gaps ≤ before | [before]/[after] | ✅/❌ |
| Anti-stub (Check 5) | 0 stub markers on done-path | [count] | ✅/❌ |
| Real project boundary (Check 6) | real imports, no copies | [ok/violation] | ✅/❌ |
| Doc-sync (Check 7) | docs updated this slice | [yes/no] | ✅/❌ |
| Structural guard (Check 8) | guard added | [yes/no] | ✅/❌ |

## VERDICT: INTEGRITY_CONFIRMED | INCOMPLETE
## If INCOMPLETE: [what remains to be done]
```

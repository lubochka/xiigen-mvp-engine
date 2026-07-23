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

## VERDICT: INTEGRITY_CONFIRMED | INCOMPLETE
## If INCOMPLETE: [what remains to be done]
```

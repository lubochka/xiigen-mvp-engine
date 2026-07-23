# PATCH: planning--plan-review-SKILL.md — Add FC-13 through FC-21
## Version bump: 2.0.0 → 2.1.0
## Insert location: After FC-12 (line 187), before FC-22 (line 188)
## Also update: title line, version frontmatter, review protocol step list

---

## HOW TO APPLY

### Pre-flight
```bash
# Verify current version
grep "^version:" planning--plan-review-SKILL.md
# Expected: "2.0.0"

# Find insertion point
grep -n "FC-12\|FC-22" planning--plan-review-SKILL.md
# FC-12 ends around line 187 with "Gate passes when:"
# FC-22 starts at line 188
```

### Change 1 — Update frontmatter version
Old: `version: "2.0.0"`
New: `version: "2.1.0"`

### Change 2 — Update title line
Old: `# Plan Review Skill — FC-1..FC-12, FC-22..FC-31 + 3-Gate Approval (v2.0.0)`
New: `# Plan Review Skill — FC-1..FC-31 + 3-Gate Approval (v2.1.0)`

### Change 3 — Update failure classes header
Old: `## The Failure Classes (FC-1..FC-12, FC-22..FC-31 — v2.0.0)`
New: `## The Failure Classes (FC-1..FC-31 — v2.1.0)`

### Change 4 — Insert FC-13..FC-21 after FC-12's "Gate passes when:" line

Paste the following block between the FC-12 "Gate passes when" line and the
`### FC-22` heading:

---

```markdown
### FC-13: Client Architecture Completeness

Every flow that produces UI state must have `clientArchitecture` in topology.json.
Missing client architecture means Phase D client tests have no spec to test against.

**Detection:**
```bash
# For any flow with client components, check topology.json
find contracts/topologies -name "*.topology.json" | xargs grep -l "screen\|component\|client" | while read f; do
  FLOW=$(basename $f .topology.json)
  COUNT=$(jq '[.nodes[] | select(.clientArchitecture != null)] | length' "$f" 2>/dev/null || echo 0)
  if [ "$COUNT" -eq 0 ]; then
    echo "FC-13 FAIL: $FLOW has client nodes without clientArchitecture"
  fi
done
# For nodes with clientArchitecture, check required sub-fields
jq '[.nodes[] | select(.clientArchitecture != null) | {
  id: .id,
  hasAppReopen: (.clientArchitecture.appReopenBehavior != null),
  hasOfflineQueue: (.clientArchitecture.offlineQueue != null),
  hasDraftState: (.clientArchitecture.draftState != null)
}]' contracts/topologies/FLOW-XX.topology.json
```

**Gate passes when:** Every UI-producing node has `clientArchitecture` with
`appReopenBehavior`, `offlineQueue`, and `draftState` declared (null is acceptable;
absent is not).

---

### FC-14: Test Category Coverage Declaration

Every UI-producing flow must declare expected test deltas per C1-C5 category in
STATE.json before Phase D begins. The numbers come from test-strategy-design (SK-476)
derivation, not from the CLIENT-ARCHITECTURE-ADDENDUM reference values.

**Detection:**
```bash
# Check STATE.json has client_test_breakdown (not hardcoded validation — read STATE)
jq '{
  delta: .client_test_delta,
  breakdown: .client_test_breakdown,
  sum: (.client_test_breakdown | to_entries | map(.value) | add)
}' FLOW-XX-STATE.json

# Verify: sum of breakdown == client_test_delta
SUM=$(jq '(.client_test_breakdown | to_entries | map(.value) | add)' FLOW-XX-STATE.json)
DELTA=$(jq '.client_test_delta' FLOW-XX-STATE.json)
[ "$SUM" -eq "$DELTA" ] && echo "FC-14 PASS" || echo "FC-14 FAIL: breakdown sum $SUM != delta $DELTA"
```

**Gate passes when:** `client_test_delta` is present and non-zero for UI flows;
`client_test_breakdown` sums to `client_test_delta`; each C1-C5 category is
declared (0 is acceptable if that category doesn't apply).

---

### FC-15: Figma Coverage for UI Flows

Every flow that generates client components must reference Figma frame IDs or
explicitly declare `figmaNote: "server-only"`.

**Detection:**
```bash
# Check topology.json for figma references
jq '.figmaFrameIds // .figmaNote // "MISSING"' \
  contracts/topologies/FLOW-XX.topology.json
# Acceptable: array of frame IDs, or "server-only"
# Violation: "MISSING" for any flow with client components
```

**Gate passes when:** `figmaFrameIds[]` is populated for UI flows, or
`figmaNote: "server-only"` is declared for server-only flows.

---

### FC-16: Acceptance Criteria Derivable from Requirements

Every task type must have `qualityGates[]` with at least one human-verifiable
criterion that references a requirement or Figma screen.

**Detection:**
```bash
# Check qualityGates in EngineContract
curl -sf "localhost:9200/xiigen-engine-contracts/_doc/T47" \
  | jq '._source.qualityGates[] | {criterion, verifyCommand, sourcedFrom}'

# Each entry must have:
# - criterion: behavioral description (not "tests pass")
# - verifyCommand: executable bash/curl command
# - sourcedFrom: requirement ID or Figma frame ID
```

**Gate passes when:** Every task type has ≥1 qualityGate with `verifyCommand`
returning exit 0 on a running system, and `sourcedFrom` tracing to a requirement
or design artifact.

---

### FC-17: Sanity Cycle Exit Criteria Specified

Phase C iteration sessions must have explicit convergence criteria. "Iterate until
it passes" is not a criterion.

**Detection:**
```bash
# scoreThreshold must be present (not defaulting to undefined)
jq '.scoreThreshold' FLOW-XX-STATE.json
# Expected: 0.85 (or Luba-specified value)

# taskTypeCycleBudgets must be pre-populated (BUG-4)
jq '.taskTypeCycleBudgets | to_entries | map(select(.value == 0 or .value == null)) | length' \
  FLOW-XX-STATE.json
# Expected: 0 (no empty budgets)

# Check session files don't say "iterate until passes"
grep -rn "iterate until\|keep trying\|run again until" SESSION-*.md
# Expected: 0 hits
```

**Gate passes when:** `scoreThreshold` is defined; `taskTypeCycleBudgets` is
fully populated with non-zero values; no session file contains open-ended
iteration instructions.

---

### FC-18: CI/CD Compatibility Declared

Test automation steps must be executable in CI, not only locally.

**Detection:**
```bash
# Check Phase D gate uses pnpm/npx command (not "run tests manually")
grep -n "pnpm test\|npx jest\|npm test\|npm run test" SESSION-*.md | grep -i "phase d\|gate"
# Expected: at least 1 hit with a runnable command

# Check no step says "manually"
grep -in "manually\|by hand\|run it yourself" SESSION-*.md
# Expected: 0 hits in test execution steps
```

**Gate passes when:** Every test step has a scriptable command. No step requires
manual intervention to execute.

---

### FC-19: Multi-Stack Test Coverage Declared

For any capability with `stackCoupling` entries, test coverage must be declared
per stack. NestJS passing does not imply WordPress passing.

**Detection:**
```bash
# Find all IMPL_VARIES_WITH_PROVIDER entries in contracts
curl -sf "localhost:9200/xiigen-engine-contracts/_search" \
  -d '{"query":{"exists":{"field":"stackCoupling"}}}' \
  | jq '.hits.hits[]._source | {id: .taskTypeId, stacks: .stackCoupling | keys}'

# For each stack in stackCoupling, check qualityGates has stack-specific test
curl -sf "localhost:9200/xiigen-engine-contracts/_doc/T48" \
  | jq '._source.qualityGates[] | select(.stacks != null) | {criterion, stacks}'
```

**Gate passes when:** Every task type with `stackCoupling` has at least one
qualityGate that specifies `stacks[]` to indicate which stacks it validates.

---

### FC-20: Shadow Run Placeholder in Phase B

Every flow's Phase B session file must create a shadow run placeholder record.
Silent omission is the current failure mode — this check makes it visible.

**Detection:**
```bash
# Check Phase B session file contains shadow run creation
grep -n "xiigen-shadow-runs\|shadowRunPlaceholder\|PENDING_LOCAL_MODEL" SESSION-B.md
# Expected: at least 1 hit

# Verify STATE.json has shadowRunPlaceholder section
jq '.shadowRunPlaceholder' FLOW-XX-STATE.json
# Expected: object with status "PENDING_LOCAL_MODEL" and resolvedAt "FLOW-39D"
```

**Gate passes when:** Phase B session file contains the shadow run placeholder
creation command, and STATE.json has `shadowRunPlaceholder.status: "PENDING_LOCAL_MODEL"`.

---

### FC-21: curriculumTierMap Populated Before Phase A

STATE.json must contain `curriculumTierMap` keyed by task type ID before Phase A
begins. This is the enforcement gate for A-2 (CurriculumTierResolver) — the map
must exist before any DPO triple is captured.

**Detection:**
```bash
# Verify curriculumTierMap exists and covers all task types
TASK_TYPES=$(jq '.taskTypes | keys | length' FLOW-XX-STATE.json)
TIER_MAP=$(jq '.curriculumTierMap | length' FLOW-XX-STATE.json)
[ "$TASK_TYPES" -eq "$TIER_MAP" ] \
  && echo "FC-21 PASS: all $TASK_TYPES task types have tier assignments" \
  || echo "FC-21 FAIL: $TASK_TYPES task types but only $TIER_MAP tier entries"

# Verify all values are in valid range [1,5]
jq '.curriculumTierMap | to_entries | map(select(.value < 1 or .value > 5)) | length' \
  FLOW-XX-STATE.json
# Expected: 0

# Valid tier table:
# ROUTING: 1 | DATA_PIPELINE: 2 | VALIDATION: 2 | TRANSACTION: 3
# ORCHESTRATION: 4 | CONVERGENCE: 4 | BROADCAST: 3 | FAN_IN: 3
# REGISTRATION: 3 | ANALYTICS: 2 | PROMOTION: 3 | SCHEDULED: 5
```

**Gate passes when:** `curriculumTierMap` has one entry per task type, all values
are in range [1,5], and no entry is null or 0.
```

---

### Change 5 — Update Review Protocol step list

Old step 10 line:
`**Step 10** — Overview-Detail Match (FC-11) + Principles Compliance (FC-12)`

New (replace with expanded steps):
```
**Step 10** — Overview-Detail Match (FC-11) + Principles Compliance (FC-12)
**Step 11** — Client Architecture (FC-13) + Test Category Coverage (FC-14)
**Step 12** — Figma Coverage (FC-15) + Acceptance Criteria (FC-16)
**Step 13** — Sanity Cycle Criteria (FC-17) + CI/CD Compatibility (FC-18)
**Step 14** — Multi-Stack Coverage (FC-19) + Shadow Run (FC-20) + CurriculumTier (FC-21)
```

---

## POST-FLIGHT VERIFICATION

```bash
# Confirm FC-13..21 are present
for i in 13 14 15 16 17 18 19 20 21; do
  grep -c "FC-${i}:" planning--plan-review-SKILL.md | grep -q "^[1-9]" \
    && echo "✅ FC-${i} present" \
    || echo "❌ FC-${i} MISSING"
done

# Confirm version bump
grep "^version:" planning--plan-review-SKILL.md
# Expected: "2.1.0"

# Confirm title update
grep "^# Plan Review Skill" planning--plan-review-SKILL.md
# Expected: FC-1..FC-31

# Confirm no gap between FC-12 and FC-22 (FC-13 should precede FC-22)
grep -n "^### FC-1[0-9]\|^### FC-2[0-9]" planning--plan-review-SKILL.md | head -15
```

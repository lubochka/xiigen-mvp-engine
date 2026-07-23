# FLOW-02: BUSINESS ONBOARDING INTELLIGENCE — REFERENCE PLAN v5
## Naming conventions integrated (SK-430 + FLOW-00.1 prerequisite)
## All other content unchanged from v4 (28/28 SK-418 ✅)
## Updated: 2026-03-22 (v5)
## Prerequisites: FLOW-01 ACTIVE + FLOW-35 + FLOW-36 + FLOW-00 complete
##               + FLOW-00.1 complete (npm run lint:naming exits 0) ← NEW v5

---

## WHAT CHANGED FROM v4

| What v4 had | What v5 adds |
|-------------|-------------|
| Prerequisite: FLOW-01 ACTIVE | Prerequisite: + FLOW-00.1 complete (lint:naming exits 0) |
| STATE.json: flow_id only | STATE.json: flow_name added |
| SESSION-0: FC-1 through FC-15 | SESSION-0: FC-16, FC-17, FC-18 added |
| Phase D gate: no naming check | Phase D gate: npm run lint:naming exits 0 |
| Phase E gate: no naming regression | Phase E gate: npm run lint:naming exits 0 |
| No service file naming rule | Service files: {verb}-{domain-noun}.service.ts |
| Jira: SK-427 default | Jira: SK-430 Rule 5 — 5 sections |

All content from v4 (all 7 passes written in full, V16–V28, background signals,
delta gate model, convergence/broadcast archetypes) is unchanged.

---

## STATE.json (v5 — flow_name added)

```json
{
  "flow_id": "FLOW-02",
  "flow_name": "Business Onboarding Intelligence",
  "parallel_wave": null,
  "wave": 1,
  "current_phase": "session-0",
  "completed_phases": [],
  "test_baseline": null,
  "client_test_delta": 10
}
```

---

## SESSION-0 ADDITIONS (FC-16, FC-17, FC-18)

### FC-16: Service file naming compliance

Expected service file names for FLOW-02:

| Task Type | ID | Service File Name |
|-----------|----|------------------|
| ParallelProfileEnricher | T50 | `parallel-profile-enricher.service.ts` |
| MatchingConvergenceGate | T51 | `matching-convergence-gate.service.ts` |
| OnboardingCompletionBroadcaster | T52 | `onboarding-completion-broadcaster.service.ts` |

**Flow directory:** `engine/flows/business-onboarding-intelligence/`

```bash
# Verify after Phase D:
find server/src/engine/flows/business-onboarding-intelligence -name "*.service.ts"
# Expected: 3 files matching the names above

# Anti-pattern check:
find server/src/engine/flows/business-onboarding-intelligence -name "t5*.ts" 2>/dev/null
# Expected: no output
```

**FC-16 PASS condition:** All 3 service files present with correct domain names.

### FC-17: STATE.json includes flow_name

```python
import json
with open('STATE.json') as f:
    s = json.load(f)
assert s.get('flow_name') == 'Business Onboarding Intelligence', \
    f"FC-17 FAIL — got: {s.get('flow_name', 'MISSING')}"
print(f"✅ FC-17 PASS — {s['flow_name']}")
```

### FC-18: Jira comment template verified

Check that SESSION-4-PHASE-D.md (implementation phase) instructs SK-429
to produce comments with all 5 SK-430 Rule 5 sections.

---

## SERVICE FILE NAMING (v5 addition)

| Task Type | ID | Service File | Class Name |
|-----------|----|-------------|------------|
| ParallelProfileEnricher | T50 | `parallel-profile-enricher.service.ts` | `ParallelProfileEnricher` |
| MatchingConvergenceGate | T51 | `matching-convergence-gate.service.ts` | `MatchingConvergenceGate` |
| OnboardingCompletionBroadcaster | T52 | `onboarding-completion-broadcaster.service.ts` | `OnboardingCompletionBroadcaster` |

**Note on T50 class name:** The task type is already a clear domain name —
use it directly. Do not expand to "Parallel Profile Enrichment Orchestrator".

**EngineContract factory additions (Phase A):**
```typescript
taskTypeId: 'T50',
flowId: 'FLOW-02',
flowName: 'Business Onboarding Intelligence',
```
Apply to T50, T51, T52.

---

## PHASE D GATE ADDITIONS (v5)

```bash
# After service files generated:
npm run lint:naming
# Expected: exit 0

find server/src/engine/flows/business-onboarding-intelligence -name "*.service.ts" | sort
# Expected: parallel-profile-enricher, matching-convergence-gate,
#           onboarding-completion-broadcaster
```

---

## PHASE E GATE ADDITIONS (v5)

```bash
# Delta gate model unchanged from v4
# Add naming regression check:
npm run lint:naming
# Expected: exit 0
```

---

## JIRA COMMENT EXAMPLE (v5 — SK-430 Rule 5 format)

```
## What was built — Phase D [Flow: FLOW-02 — Business Onboarding Intelligence]

### Business purpose
FLOW-02 adds AI-powered profile enrichment that runs in parallel after a user
registers. ParallelProfileEnricher (T50) fans out up to N profile-scoring
workers simultaneously, each enriching a different dimension (industry,
company size, role). MatchingConvergenceGate (T51) waits for all workers
before closing the onboarding funnel. OnboardingCompletionBroadcaster (T52)
emits the final OnboardingCompleted event that unlocks the tenant's
full platform access.

### Flow context
- **Flow:** FLOW-02 — Business Onboarding Intelligence
- **Task types:** T50 ParallelProfileEnricher, T51 MatchingConvergenceGate,
  T52 OnboardingCompletionBroadcaster
- **Will be used by:** FLOW-03 (Event Creation & Promotion) — reads
  OnboardingCompleted before allowing event publishing. Dashboard analytics
  service reads T52's broadcast payload for segment-level metrics.

### Technical delivery
- 3 service files created
- 8 factory interfaces registered (F182–F189)
- [N] tests added (unit: [N], e2e: [N])
- Key factories: F182 IProfileEnrichmentQueue (QUEUE FABRIC),
  F183 IConvergenceStateStore (DATABASE FABRIC),
  F184 IOnboardingBroadcastChannel (QUEUE FABRIC)

### Architecture fit
T50 uses optimistic fan-out (DNA-2 BuildSearchFilter for worker selection).
T51 enforces CONVERGENCE archetype: waits for all N workers via
ConvergenceStateStore before emitting. T52 uses BROADCAST archetype
with GDPR cascade (SK-421 test category). DNA-8 outbox enforced
on every event transition. Downstream: FLOW-03 Wave 2 gate reads
T52 OnboardingCompleted status via the flow-lifecycle index.
```

---

## ALL OTHER CONTENT — UNCHANGED FROM v4

The following sections are identical to FLOW-02-REFERENCE-PLAN-v4.md:
- Wave assignment (Wave 1, sequential)
- Artifact numbers (T50/T51/T52, F182–F189, CF-4–CF-9, Family 19)
- New archetypes: CONVERGENCE (T51), BROADCAST (T52)
- All 7 passes written in full
- V1–V28 SK-418 checklist results (28/28)
- Client architecture: requiresDraftState: false, backgroundSteps (T51 realtime-push)
- Delta gate model: entry + 10 (client), entry + 30 (server)
- Phase A through Phase E content (except gate additions above)

Reference v4 for all content not listed in this v5 amendment section.

# FLOW-01: USER REGISTRATION & ONBOARDING — REFERENCE PLAN v8
## Naming conventions integrated (SK-430 + FLOW-00.1 prerequisite)
## All other content unchanged from v7 (28/28 SK-418 ✅)
## Updated: 2026-03-22 (v8)
## Prerequisites: All infrastructure flows complete + FLOW-35 + FLOW-36 + FLOW-00 complete
##               + FLOW-00.1 complete (npm run lint:naming exits 0) ← NEW v8

---

## WHAT CHANGED FROM v7

| What v7 had | What v8 adds |
|-------------|-------------|
| Prerequisite: FLOW-00 complete | Prerequisite: FLOW-00.1 complete (lint:naming exits 0) |
| STATE.json: flow_id only | STATE.json: flow_name added |
| SESSION-0 checks: FC-1 through FC-15 | SESSION-0 checks: FC-16, FC-17, FC-18 added |
| Phase D gate: no naming check | Phase D gate: npm run lint:naming exits 0 |
| Phase E gate: no naming regression | Phase E gate: npm run lint:naming exits 0 (regression) |
| No service file naming rule | Service files: {verb}-{domain-noun}.service.ts pattern |
| Jira comments: SK-427 default format | Jira comments: SK-430 Rule 5 — 5 sections required |

All event contracts, artifact numbers (T47/T48/T49, F174–F181, CF-1–CF-8),
passes 1–7, test matrix, visibility gates V1–V28, and client architecture
are identical to v7. Do NOT re-derive or re-verify those sections.

---

## PREREQUISITE GATE (v8 addition — check before Phase A)

```bash
# Confirm FLOW-00.1 is complete before starting Phase A
npm run lint:naming
# Expected: exit 0 ("✅ naming-lint PASSED")
# If exit 1: FLOW-00.1 is not complete. Finish FLOW-00.1 first.

# Confirm EngineContract schema has flowId + flowName (Phase A of FLOW-00.1)
grep -c "flowId" server/src/engine-contracts/contract-schema.ts
# Expected: ≥ 2 (interface field + class property)
```

**If either check fails: STOP. Do not begin FLOW-01.**

---

## STATE.json (v8 — flow_name added)

```json
{
  "flow_id": "FLOW-01",
  "flow_name": "User Registration & Onboarding",
  "parallel_wave": null,
  "wave": 0,
  "current_phase": "session-0",
  "completed_phases": [],
  "test_baseline": null,
  "client_test_delta": 0
}
```

---

## SESSION-0 ADDITIONS (FC-16, FC-17, FC-18)

Append to the existing FC-1 through FC-15 checklist in SESSION-0:

### FC-16: Service file naming compliance (SK-430 Rule 1 applied to generated files)

```bash
# After Phase D generates service files, verify naming:
ls server/src/engine/flows/user-registration-onboarding/*.service.ts 2>/dev/null
# OR verify the proposed names in the plan match the pattern:
# {verb}-{domain-noun}.service.ts

# Expected names for FLOW-01:
# user-registration-initiator.service.ts    ← T47 SSOAndEmailAuth
# email-verification-wait.service.ts         ← T48 EmailVerificationWaitState
# onboarding-delivery.service.ts             ← T49 OnboardingDelivery

# Check for anti-patterns:
ls server/src/engine/flows/user-registration-onboarding/ 2>/dev/null | grep -E "^t[0-9]+|^flow0[0-9]"
# Expected: no output
```

**FC-16 PASS condition:** All service files use `{verb}-{domain-noun}.service.ts`.
No file begins with `t47`, `t48`, `t49`, `flow01`, or any flow-number prefix.

### FC-17: STATE.json includes flow_name

```python
import json
with open('STATE.json') as f:
    s = json.load(f)
assert s.get('flow_name') == 'User Registration & Onboarding', \
    f"FC-17 FAIL — flow_name: {s.get('flow_name', 'MISSING')}"
print(f"✅ FC-17 PASS — flow_name: {s['flow_name']}")
```

### FC-18: Jira comment template includes 5 sections

Verify that the SESSION files instruct SK-429 (PhaseGitReport) to produce
Jira comments with all 5 SK-430 Rule 5 sections. Check SESSION-4-PHASE-D.md
(the implementation phase session file) contains:
```
- Business purpose section
- Flow context section (with taskTypeName and "Will be used by")
- Technical delivery section
- Architecture fit section
```

**FC-18 PASS condition:** All 5 sections documented in the session file template.

---

## SERVICE FILE NAMING (v8 addition — Phase D)

When Claude Code generates implementation files for FLOW-01 task types,
the filenames MUST follow `{verb}-{domain-noun}.service.ts`:

| Task Type | ID | Service File Name | Directory |
|-----------|----|------------------|-----------|
| SSOAndEmailAuth | T47 | `user-registration-initiator.service.ts` | `engine/flows/user-registration-onboarding/` |
| EmailVerificationWaitState | T48 | `email-verification-wait.service.ts` | `engine/flows/user-registration-onboarding/` |
| OnboardingDelivery | T49 | `onboarding-delivery.service.ts` | `engine/flows/user-registration-onboarding/` |

**Flow directory name:** `engine/flows/user-registration-onboarding/`
(derived from flowName "User Registration & Onboarding" → lowercase-hyphenated)

**Class names** inside the files match the task type `name` field:
```typescript
// user-registration-initiator.service.ts
@Injectable()
export class UserRegistrationInitiator extends MicroserviceBase { ... }

// email-verification-wait.service.ts
@Injectable()
export class EmailVerificationWait extends MicroserviceBase { ... }

// onboarding-delivery.service.ts
@Injectable()
export class OnboardingDelivery extends MicroserviceBase { ... }
```

**EngineContract factory** (in Phase A, when T47/T48/T49 contracts are created):
```typescript
// In Phase A: add flowId + flowName to each contract
taskTypeId: 'T47',
flowId: 'FLOW-01',
flowName: 'User Registration & Onboarding',
```

---

## PHASE D GATE ADDITIONS (v8)

Append to the existing Phase D gate checklist:

```bash
# Naming gate (SK-430) — runs after service files are generated
npm run lint:naming
# Expected: exit 0

# Verify service files follow domain-name pattern
find server/src/engine/flows/user-registration-onboarding -name "*.service.ts" | sort
# Expected:
#   .../user-registration-initiator.service.ts
#   .../email-verification-wait.service.ts
#   .../onboarding-delivery.service.ts

# Verify no task-type-ID prefixed files exist
find server/src/engine/flows/user-registration-onboarding -name "t4*.ts" 2>/dev/null
# Expected: no output
```

---

## PHASE E GATE ADDITIONS (v8)

Append to the existing Phase E gate checklist:

```bash
# Naming regression check — ensures Phase D work still holds
npm run lint:naming
# Expected: exit 0 (regression — must not have introduced new violations)
```

---

## JIRA COMMENT EXAMPLE (v8 — SK-430 Rule 5 format)

All SK-429 Jira comments for FLOW-01 phases must follow this structure:

```
## What was built — Phase D [Flow: FLOW-01 — User Registration & Onboarding]

### Business purpose
Implemented the three task types that handle user account creation for the
platform. UserRegistrationInitiator (T47) accepts the initial signup via SSO
or email+password and emits UserRegistrationInitiated into the tenant queue.
EmailVerificationWait (T48) holds the flow open for up to 24 hours while the
verification link is active. OnboardingDelivery (T49) triggers workspace
setup once the email is confirmed.

### Flow context
- **Flow:** FLOW-01 — User Registration & Onboarding
- **Task types:** T47 UserRegistrationInitiator, T48 EmailVerificationWait,
  T49 OnboardingDelivery
- **Will be used by:** FLOW-02 (Business Onboarding Intelligence) — reads
  UserRegistrationCompleted to start profile enrichment. FLOW-00 (Bundle
  Activation) pre-provisions the tenant workspace before this flow runs.

### Technical delivery
- 3 service files created
- 8 factory interfaces registered (F174–F181)
- [N] tests added (unit: [N], e2e: [N])
- Key factories: F174 IUserRepository (DATABASE FABRIC),
  F175 IEmailVerificationQueue (QUEUE FABRIC),
  F176 IOnboardingTemplateStore (RAG FABRIC)

### Architecture fit
All three services extend MicroserviceBase (DNA-4). Events persisted via
outbox before queue emit (DNA-8). Tenant isolation via AsyncLocalStorage
scope (DNA-5). Lives in FLOW ENGINE fabric layer. Downstream: FLOW-02
MatchingConvergenceGate waits for OnboardingDeliveryCompleted before closing
the onboarding funnel.
```

---

## SK-418 CHECKLIST (unchanged — 28/28 from v7)

No changes to V1–V28. All 28 items verified in v7 remain valid.

---

## ALL OTHER CONTENT — UNCHANGED FROM v7

The following sections are identical to FLOW-01-REFERENCE-PLAN-v7.md:
- Wave assignment (Wave 0, sequential)
- Artifact numbers (T47/T48/T49, F174–F181, CF-1–CF-8, Family 1)
- Passes 1–7 (event contracts, client state map, retry/compensation,
  observability, E2E test matrix, genesis prompts)
- V1–V28 SK-418 checklist results
- Client architecture (requiresDraftState, offlineQueue, backgroundSteps)
- Phase A through Phase E content (except gate additions above)

Reference v7 for all content not listed in this v8 amendment section.

# GUIDE-B09 — How to Produce `UI-REFLECTION-STATE.json`
## Library guidance file — FLOW-PREP-LIBRARY-MASTER-PLAN v6.1-FINAL
## Produced: Round 19 | Phase 4 (Guidance File Authoring)
## Date: 2026-04-20

---

## FINAL GOAL (re-read before authoring any UI-REFLECTION-STATE.json):
> "Taking the produced library as a result of this plan run — same size as list B —
> and applying on new flow specs, we will get proper list B for this flow."

---

## WHAT THIS FILE IS

`UI-REFLECTION-STATE.json` is the **per-service UI presence audit** for a flow. For each
service in `server/src/engine/flows/{slug}/`, it records:
- Whether a React component exists that reflects this service's data
- Which UI state indicators are present (initiate / in_progress / result / error)
- What the verdict is (FULL_UI / PARTIAL_UI / NO_UI / INTERNAL_ONLY)
- What is missing from the UI for PARTIAL_UI cases

This file answers the question: "For each server-side process in this flow, does the
client UI actually show the user what's happening?" It is the machine-readable basis for
the companion human-readable `UI-REFLECTION-STATE.md` (B-10, GUIDE-B10).

**Schema:** `flow-ui-automation.v1` (from ZIP-01 — AUTHORING-GUIDE v1.15)
**ZIP-15 enrichment (C9):** A `role_visibility` field per process records which confirmed
role strings (from ZIP-15 §2) trigger this service's UI state.

---

## LIST A SOURCES FOR THIS GUIDANCE FILE

| ZIP | Role | Specific files |
|-----|------|----------------|
| ZIP-14 | PRIMARY | `ux-guidelines.csv` (verdict criteria per screen type); `app-interface.csv` (UI state indicator definitions: initiate/in_progress/result/error) |
| ZIP-15 | REFERENCE | §1 role registry; §2 confirmed role strings → `role_visibility` field per process (C9) |

---

## OUTPUT FILE SPECIFICATION

**Target path:** `docs/sessions/FLOW-XX/UI-REFLECTION-STATE.json`
**File size range:** 60–200 lines depending on process count (1 process = ~15-25 lines)
**When authored:** After Phase B (service implementations) is complete; services must exist on disk

---

## FIVE VERDICT VALUES — COMPLETE DEFINITIONS

From ZIP-14 `ux-guidelines.csv`:

| Verdict | Definition | When to use |
|---------|-----------|------------|
| `FULL_UI` | All four state indicators present (initiate, in_progress, result, error) | React component exists, all 4 state indicators confirmed |
| `PARTIAL_UI` | React component exists but ≥1 state indicator missing | Component found, some states not wired (e.g., no error state) |
| `NO_UI` | No React component found for this service | Service exists, no corresponding client component |
| `INTERNAL_ONLY` | Service is engine-internal — no UI expected by design | Background processing, event consumers, arbiters |
| `EVENT_ONLY_NO_OBSERVER` | Service emits events only; no observer UI expected | Pure event emitter, no sync API |

**Verdict selection rule:**
```
1. Is this service INTERNAL by archetype (arbiter, backfill, seed, normalizer)?
   YES → INTERNAL_ONLY (set applicable: false)
2. Does react_components_found = []?
   YES → NO_UI (applicable: true but no components)
3. Does react_components_found have ≥1 entry AND all 4 state indicators found?
   YES → FULL_UI
4. Does react_components_found have ≥1 entry AND ≥1 state indicator missing?
   YES → PARTIAL_UI (populate missing[] with the absent indicator names)
5. Service emits only events, no endpoints, no component?
   YES → EVENT_ONLY_NO_OBSERVER
```

---

## STATE INDICATOR DEFINITIONS (from ZIP-14 app-interface.csv)

| Indicator | What it represents | Evidence pattern to look for |
|-----------|-------------------|------------------------------|
| `initiate` | User can trigger the process | Form submit button, onClick handler, `onSubmit` function |
| `in_progress` | System shows processing state | Loading spinner, `status === 'SUBMITTING'`, `isLoading` state render |
| `result` | Process output is displayed | Result panel, `data-testid` with result, verdict chip |
| `error` | Error state is shown to user | Error panel, `error && <div`, `data-testid='*-error'` |
| `next_step` | Follow-on action affordance | Next button, action list, proposed-steps render (optional — not required for FULL_UI) |

**FULL_UI requires: initiate + in_progress + result + error all found = true**
`next_step` is a bonus indicator — does not affect FULL_UI verdict but should be recorded when present.

---

## STEP-BY-STEP AUTHORING INSTRUCTIONS FOR CLAUDE CODE

### Pre-condition: enumerate all services

```bash
# Find all service files for this flow
find server/src/engine/flows/{slug}/ -name "*.service.ts" 2>/dev/null | sort
# Count them
find server/src/engine/flows/{slug}/ -name "*.service.ts" 2>/dev/null | wc -l
# Get task type IDs from contracts
grep -E "^export.*T[0-9]{3}" server/src/engine-contracts/{slug}-contracts.ts 2>/dev/null | head -20
```

If the service directory doesn't exist yet, do not produce this file. UI-REFLECTION-STATE.json
requires at minimum Phase B services to be on disk.

---

### Step 1: Write the file header and summary skeleton

```json
{
  "$schema": "flow-ui-automation.v1",
  "flowId": "FLOW-XX",
  "slug": "{slug}",
  "generated_at": "{YYYY-MM-DD}",
  "branch": "{current-branch}",
  "summary": {
    "total_processes": {N},
    "verdict_counts": {
      "FULL_UI": 0,
      "PARTIAL_UI": 0,
      "NO_UI": 0,
      "INTERNAL_ONLY": 0,
      "EVENT_ONLY_NO_OBSERVER": 0
    }
  },
  "processes": []
}
```

Write the summary skeleton first with all counts at 0. Fill in actual counts after
all process entries are complete.

---

### Step 2: For each service file, build one process entry

Run these commands per service:

```bash
# Get service class name and task type from the file
head -30 server/src/engine/flows/{slug}/{service-name}.service.ts

# Find React components that reference this service's endpoints or data
grep -r "{endpoint-path}\|{service-class-name}\|T{NNN}" client/src/pages/ --include="*.tsx" -l 2>/dev/null
grep -r "{service-class-name}\|T{NNN}" client/src/hooks/ --include="*.ts" -l 2>/dev/null

# Find client test files
find client/__tests__/flows/{slug}/ -name "*.test.tsx" 2>/dev/null
find client/e2e/ -name "*{slug}*.spec.ts" 2>/dev/null

# Find REST endpoints declared in this service
grep -E "@(Get|Post|Put|Delete|Patch)\(" server/src/engine/flows/{slug}/{service-name}.service.ts 2>/dev/null
# Or in a controller file
grep -E "@(Get|Post|Put|Delete|Patch)\(" server/src/engine/flows/{slug}/{service-name}.controller.ts 2>/dev/null

# Find route hits in App.tsx
grep -n "Route\|path=" client/src/App.tsx 2>/dev/null | grep -i "{slug}\|{route-hint}"

# Check for state indicators in the React component (if found)
grep -n "onSubmit\|onClick\|handleSubmit" client/src/pages/{slug}/{Component}Page.tsx 2>/dev/null
grep -n "isLoading\|SUBMITTING\|status.*===\|spinner" client/src/pages/{slug}/{Component}Page.tsx 2>/dev/null
grep -n "data-testid\|result\|verdict\|success" client/src/pages/{slug}/{Component}Page.tsx 2>/dev/null
grep -n "error.*&&\|data-testid.*error\|catch" client/src/pages/{slug}/{Component}Page.tsx 2>/dev/null
```

Build the process entry from the results:

```json
{
  "processId": "T{NNN}-{ServiceClassName}",
  "kind": "service",
  "service_class": "{ServiceClassName}",
  "service_file": "server/src/engine/flows/{slug}/{service-name}.service.ts:1",
  "taskTypeId": "T{NNN}",
  "archetype": "{routing | intake | validation | decision | transaction | orchestration | scheduled}",
  "public_methods": [
    "{methodName1}",
    "{methodName2}"
  ],
  "events_emitted": [
    "{EventName1}"
  ],
  "events_consumed": [
    "{EventName2}"
  ],
  "endpoints": [
    "POST /api/{slug}/{endpoint}",
    "GET /api/{slug}/{endpoint}"
  ],
  "ui_reflection": {
    "applicable": true,
    "react_components_found": [
      "client/src/pages/{slug}/{Component}Page.tsx"
    ],
    "hooks_found": [
      "client/src/hooks/use{ServiceName}.ts"
    ],
    "client_tests_found": [
      "client/__tests__/flows/{slug}/{test-file}.test.tsx"
    ],
    "e2e_tests_found": [
      "client/e2e/{slug}.spec.ts"
    ],
    "endpoint_route_hits": [
      "/{route-path}"
    ],
    "state_indicators": {
      "initiate": {
        "found": true,
        "evidence": "client/src/pages/{slug}/{Component}Page.tsx:{line} — {what was found}"
      },
      "in_progress": {
        "found": true,
        "evidence": "client/src/pages/{slug}/{Component}Page.tsx:{line} — {what was found}"
      },
      "result": {
        "found": true,
        "evidence": "client/src/pages/{slug}/{Component}Page.tsx:{line} — {what was found}"
      },
      "error": {
        "found": true,
        "evidence": "client/src/pages/{slug}/{Component}Page.tsx:{line} — {what was found}"
      }
    },
    "verdict": "FULL_UI",
    "missing": [],
    "role_visibility": {
      "primary_roles": ["{role-string-from-ZIP-15-§2}"],
      "restricted_from": []
    }
  }
}
```

---

### Step 3: Internal-only service entry pattern

For services with no user-facing UI (arbiters, seeders, normalizers, backfill services):

```json
{
  "processId": "T{NNN}-{ServiceClassName}",
  "kind": "service",
  "service_class": "{ServiceClassName}",
  "service_file": "server/src/engine/flows/{slug}/{service-name}.service.ts:1",
  "taskTypeId": "T{NNN}",
  "archetype": "{arbiter | seed | normalizer | backfill}",
  "public_methods": ["{methodName}"],
  "events_emitted": [],
  "events_consumed": ["{EventName}"],
  "endpoints": [],
  "ui_reflection": {
    "applicable": false,
    "react_components_found": [],
    "hooks_found": [],
    "client_tests_found": [],
    "e2e_tests_found": [],
    "endpoint_route_hits": [],
    "state_indicators": {
      "initiate": { "found": false, "evidence": null, "note": "internal {archetype} — no UI" },
      "in_progress": { "found": false, "evidence": null },
      "result": { "found": false, "evidence": null },
      "error": { "found": false, "evidence": null }
    },
    "verdict": "INTERNAL_ONLY",
    "missing": [],
    "role_visibility": {
      "primary_roles": ["platform-admin"],
      "restricted_from": ["tenant-user", "anonymous"]
    }
  }
}
```

---

### Step 4: PARTIAL_UI entry pattern

For services where a React component exists but state indicators are incomplete:

```json
"ui_reflection": {
  "applicable": true,
  "react_components_found": ["client/src/pages/{slug}/{Component}Page.tsx"],
  "hooks_found": [],
  "client_tests_found": [],
  "e2e_tests_found": [],
  "endpoint_route_hits": [],
  "state_indicators": {
    "initiate": { "found": false, "evidence": null },
    "in_progress": { "found": false, "evidence": null },
    "result": { "found": true, "evidence": "client/src/pages/{slug}/{Component}Page.tsx:{line} — result panel present" },
    "error": { "found": false, "evidence": null }
  },
  "verdict": "PARTIAL_UI",
  "missing": ["initiate", "in_progress", "error"],
  "role_visibility": {
    "primary_roles": ["tenant-user", "tenant-admin"],
    "restricted_from": []
  }
}
```

**Rule for `missing[]`:** List every state indicator where `found: false` AND `applicable: true`.
For INTERNAL_ONLY services, `missing: []` even though all indicators are false (because applicable=false).

---

### Step 5: Update the summary counts

After all process entries are complete:

```bash
# Count each verdict type
python3 -c "
import json
d = json.load(open('docs/sessions/FLOW-XX/UI-REFLECTION-STATE.json'))
counts = {}
for p in d['processes']:
    v = p['ui_reflection']['verdict']
    counts[v] = counts.get(v, 0) + 1
print(counts)
"
```

Update the `summary.verdict_counts` object with actual counts. Update `summary.total_processes`.

---

### Step 6: Add role_visibility per process (ZIP-15 §2 enrichment — C9)

The `role_visibility` field uses **confirmed role strings** from ZIP-15 §2. These are the
exact strings used in the RAG retrieval pipeline's ACL filters.

Confirmed ZIP-15 §2 role strings (use exactly these values):
```
"anonymous"
"public-marketplace-visitor"
"tenant-user"
"tenant-admin"
"referral-user"
"freelancer"
"business-partner"
"event-organiser"
"platform-admin"
"platform-support"
```

**Mapping guide:**
| Service archetype | primary_roles | restricted_from |
|------------------|---------------|----------------|
| ROUTING / ORCHESTRATION with public API | `["tenant-user", "tenant-admin"]` | `[]` |
| Admin-only service | `["platform-admin", "platform-support"]` | `["tenant-user", "anonymous"]` |
| Marketplace service | `["tenant-user", "public-marketplace-visitor"]` | `[]` |
| Pure engine internal | `["platform-admin"]` | `["tenant-user", "anonymous"]` |
| Public-facing (e.g., FLOW-21 form submission) | `["anonymous", "tenant-user"]` | `[]` |

If ZIP-15 role visibility is uncertain for a specific service, use the flow's
ROLE-SCREEN-MATRIX (B-50) to determine which roles interact with this service.

---

## COMPLETE TEMPLATE (3-service flow with all verdict types)

```json
{
  "$schema": "flow-ui-automation.v1",
  "flowId": "FLOW-XX",
  "slug": "{slug}",
  "generated_at": "{YYYY-MM-DD}",
  "branch": "{branch}",
  "summary": {
    "total_processes": 3,
    "verdict_counts": {
      "FULL_UI": 1,
      "PARTIAL_UI": 1,
      "NO_UI": 0,
      "INTERNAL_ONLY": 1,
      "EVENT_ONLY_NO_OBSERVER": 0
    }
  },
  "processes": [
    {
      "processId": "T{N}-{ServiceWithFullUI}",
      "kind": "service",
      "service_class": "{ServiceClassName}",
      "service_file": "server/src/engine/flows/{slug}/{name}.service.ts:1",
      "taskTypeId": "T{N}",
      "archetype": "routing",
      "public_methods": ["{method}"],
      "events_emitted": ["{Event}"],
      "events_consumed": [],
      "endpoints": ["POST /api/{slug}/{endpoint}"],
      "ui_reflection": {
        "applicable": true,
        "react_components_found": ["client/src/pages/{slug}/{Page}Page.tsx"],
        "hooks_found": ["client/src/hooks/use{Name}.ts"],
        "client_tests_found": ["client/__tests__/flows/{slug}/{test}.test.tsx"],
        "e2e_tests_found": ["client/e2e/{slug}.spec.ts"],
        "endpoint_route_hits": ["/{route}"],
        "state_indicators": {
          "initiate":    { "found": true, "evidence": "{Page}Page.tsx:{line} — {form/button}" },
          "in_progress": { "found": true, "evidence": "{Page}Page.tsx:{line} — {loading state}" },
          "result":      { "found": true, "evidence": "{Page}Page.tsx:{line} — {result panel}" },
          "error":       { "found": true, "evidence": "{Page}Page.tsx:{line} — {error div}" }
        },
        "verdict": "FULL_UI",
        "missing": [],
        "role_visibility": { "primary_roles": ["tenant-user", "tenant-admin"], "restricted_from": [] }
      }
    },
    {
      "processId": "T{N+1}-{ServiceWithPartialUI}",
      "kind": "service",
      "service_class": "{ServiceClassName2}",
      "service_file": "server/src/engine/flows/{slug}/{name2}.service.ts:1",
      "taskTypeId": "T{N+1}",
      "archetype": "decision",
      "public_methods": ["{method}"],
      "events_emitted": ["{Event2}"],
      "events_consumed": [],
      "endpoints": [],
      "ui_reflection": {
        "applicable": true,
        "react_components_found": ["client/src/pages/{slug}/{Page}Page.tsx"],
        "hooks_found": [],
        "client_tests_found": [],
        "e2e_tests_found": [],
        "endpoint_route_hits": [],
        "state_indicators": {
          "initiate":    { "found": false, "evidence": null },
          "in_progress": { "found": false, "evidence": null },
          "result":      { "found": true,  "evidence": "{Page}Page.tsx:{line} — {result}" },
          "error":       { "found": false, "evidence": null }
        },
        "verdict": "PARTIAL_UI",
        "missing": ["initiate", "in_progress", "error"],
        "role_visibility": { "primary_roles": ["tenant-admin"], "restricted_from": ["anonymous"] }
      }
    },
    {
      "processId": "T{N+2}-{InternalService}",
      "kind": "service",
      "service_class": "{ServiceClassName3}",
      "service_file": "server/src/engine/flows/{slug}/{name3}.service.ts:1",
      "taskTypeId": "T{N+2}",
      "archetype": "arbiter",
      "public_methods": ["{method}"],
      "events_emitted": [],
      "events_consumed": ["{Event}"],
      "endpoints": [],
      "ui_reflection": {
        "applicable": false,
        "react_components_found": [],
        "hooks_found": [],
        "client_tests_found": [],
        "e2e_tests_found": [],
        "endpoint_route_hits": [],
        "state_indicators": {
          "initiate":    { "found": false, "evidence": null, "note": "internal arbiter — no UI" },
          "in_progress": { "found": false, "evidence": null },
          "result":      { "found": false, "evidence": null },
          "error":       { "found": false, "evidence": null }
        },
        "verdict": "INTERNAL_ONLY",
        "missing": [],
        "role_visibility": { "primary_roles": ["platform-admin"], "restricted_from": ["tenant-user", "anonymous"] }
      }
    }
  ]
}
```

---

## SELF-CHECK BEFORE SAVING

```
□ One process entry per service file found in server/src/engine/flows/{slug}/
□ processId follows "T{NNN}-{ServiceClassName}" format
□ service_file includes :1 line reference (not just the path)
□ state_indicators: every entry where found=true has a non-null evidence string
  with format "{file}:{line} — {what was found}"
□ state_indicators: evidence strings reference real line numbers (run grep -n to get them)
□ verdict follows the selection rule — never set FULL_UI if any state indicator is false
□ missing[] lists exactly the state indicator keys where found=false AND applicable=true
□ summary.verdict_counts updated to match actual process entries
□ summary.total_processes = number of process entries in processes[]
□ role_visibility.primary_roles uses only ZIP-15 §2 confirmed strings (exactly as listed above)
□ File saved to docs/sessions/FLOW-XX/UI-REFLECTION-STATE.json
```

**SILENT_FAILURE RISK 1:** Setting `found: true` for a state indicator without a real
evidence string. The evidence string is what makes this file auditable — someone reviewing
it should be able to open the referenced file at the referenced line and see the cited code.
Never set `found: true` with `"evidence": null`.

**SILENT_FAILURE RISK 2:** Setting `applicable: false` for a service that does have a
REST endpoint or React component. Run the grep commands before deciding applicability.
A service with `endpoints: ["GET /api/..."]` is never INTERNAL_ONLY.

**SILENT_FAILURE RISK 3:** Forgetting to update `summary.verdict_counts` after adding
process entries. The summary is what the companion B-10 markdown and the RECONCILIATION
report use — stale counts create false impressions of UI coverage.

---

## THREE CONFIRMED EXAMPLES

| Flow | Total processes | FULL_UI | PARTIAL_UI | NO_UI | INTERNAL_ONLY |
|------|----------------|---------|-----------|-------|---------------|
| FLOW-09 | 1 | 0 | 0 | 1 | 0 |
| FLOW-46 | 7 | 2 | 2 | 0 | 3 |
| FLOW-47 | 8 | 1 | 1 | 2 | 4 |

FLOW-09 has a single orphan service with no UI (early implementation state).
FLOW-46 is the most complete: 2 FULL_UI, 2 PARTIAL_UI (decision + action services
partially wired), 3 INTERNAL_ONLY (intake, retrieval, learning are engine-internal).
FLOW-47 has 4 INTERNAL_ONLY (bootstrap, snapshot, portability, topology are background) + 1 PARTIAL_UI (provisioning has stub instead of real API).

---

## C30/C38 SOURCE SPLIT NOTE

The UI-REFLECTION-STATE.json schema is **universal** — same structure for all 49 flows.
For FLOW-35..47: same generation process (scan service files, grep for components).
For FLOW-41 (`adapter-ci-cd-bridge`): all services will be INTERNAL_ONLY (no user UI).
For FLOW-48 (`i18n-translation`): role_visibility for the `/settings/language` page
uses `"tenant-user"` as primary_role (the missing-page from SK-539 §6 registry).

---

## AUTHORING QUALITY GATE

This guidance file is SELF-SUFFICIENT if a Claude Code session can produce a correct
`UI-REFLECTION-STATE.json` using only:
1. This guidance file
2. The codebase (for bash evidence commands)
3. No external documents required

---
*GUIDE-B09 | Round 19 | Phase 4 — Guidance File Authoring*
*Sources: ZIP-14 (P — ux-guidelines.csv, app-interface.csv), ZIP-15 (R — §2 confirmed role strings)*
*Three confirmed examples: FLOW-09 (1 process), FLOW-46 (7 processes), FLOW-47 (8 processes)*
*Next: GUIDE-B10 — UI-REFLECTION-STATE.md (Round 20)*

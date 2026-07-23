# XIIGen Flow Delivery Protocol

**STATUS: MANDATORY CHECKLIST — never override, never skip steps**
**Source of truth: this file. Updated here when protocol changes.**

---

## Per-Flow Delivery Protocol

Every flow MUST complete ALL stages in order before it is considered DONE.

```
FLOW-PREP        → produces session files
     ↓  (CANNOT skip — simulation needs session files to trace)
SIMULATION       → produces gap catalog
     ↓  (CANNOT skip — GAP-PREP needs simulation findings to classify)
GAP-PREP         → produces gap list document
     ↓  (CANNOT skip — GAP-TRANSLATE needs the gap list to build fix sessions)
GAP-TRANSLATE    → produces Claude Code SESSION-GAP-RN.md files
     ↓
[Claude Code applies fixes via agents]
     ↓
IMPLEMENTATION REVIEW  → verify all DNA rules satisfied, no regressions, 0 TS errors
     ↓
E2E + UI AUTOMATION REVIEW  → every flow must have E2E tests + UI automation coverage
     ↓
DONE ← committed to Skills_Creation_Claude + pushed to remote
```

**A flow is NOT done until it reaches the last step.**

---

## Mandatory Quality Gates (before DONE)

| Gate | Check | Must Pass |
|------|-------|-----------|
| TypeScript | `npx tsc --noEmit` | 0 errors |
| Tests | `npx jest --no-coverage` | 0 failures (no "pre-existing" exceptions) |
| DNA Rules | All 9 DNA rules satisfied | See dna-compliance-guard skill |
| E2E Coverage | Flow has E2E test file | Must exist |
| UI Automation | Flow UI interactions automated | Must exist |
| Commit | Changes on Skills_Creation_Claude | Pushed to remote |

---

## Agent Monitoring Protocol

- Every background agent must be checked every **3 minutes** for progress
- Monitor via: `git diff --stat HEAD` (file changes) or `wc -l <output-file>` (output written)
- Agents only write their output file when they finish — non-zero byte count = done
- Do NOT launch multiple agents that touch the same shared files concurrently
- Shared files: `archetypes.ts`, `validate.handler.ts`, `feedback.handler.ts`, `engine-bootstrapper.ts`

---

## Flow Status Tracker

**Legend:** ✅ DONE | 🔄 IN_PROGRESS | ⏳ NOT_STARTED | ❌ BLOCKED
**Source of truth:** `docs/FLOW-STATE-REGISTRY.json` — update that file after every agent run.

| Flow | Domain | FLOW-PREP | SIMULATION | GAP-PREP | GAP-TRANSLATE | Code Fixes | Impl Review | E2E+UI | DONE |
|------|--------|-----------|------------|----------|---------------|------------|-------------|--------|------|
| FLOW-01 | Content Creation | ✅ | ✅ | ✅ | ✅ | ⏳ | ⏳ | ⏳ | ⏳ |
| FLOW-02 | Profile Enrichment | ✅ | ✅ | ✅ | ✅ | ⏳ | ⏳ | ⏳ | ⏳ |
| FLOW-03 | Community Events | ✅ | ✅ | ✅ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| FLOW-04 | Event Attendance | ✅ | ✅ | ✅ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| FLOW-05 | Completion/Gamification | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⏳ | ⏳ |
| FLOW-06 | Membership/Group Feed | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⏳ | ⏳ |
| FLOW-07 | TBD | ✅ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| FLOW-08 | TBD | ✅ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| FLOW-09 | TBD | ✅ | ✅ | ✅ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| FLOW-10 | Reviews & Reputation | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⏳ | ⏳ |
| FLOW-11 | Schema Registry & DAG | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⏳ | ⏳ |
| FLOW-12 | Subscription & Billing | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⏳ | ⏳ |
| FLOW-13 | Data Warehouse | ✅ | ✅ | ✅ | ✅ | ⏳ | 🔄 | ⏳ | ⏳ |
| FLOW-14 | ETL Pipeline | ✅ | ✅ | ✅ | ✅ | ⏳ | 🔄 | ⏳ | ⏳ |
| FLOW-15 | SaaS Platform Builder | ✅ | ✅ | ✅ | ✅ | ⏳ | 🔄 | ⏳ | ⏳ |
| FLOW-16 | Marketplace & Payments | ✅ | ✅ | ✅ | ✅ | ⏳ | 🔄 | ⏳ | ⏳ |
| FLOW-17 | Digital Asset & IP | ✅ | ✅ | ✅ | ✅ | ⏳ | 🔄 | ⏳ | ⏳ |
| FLOW-18 | Platform Infrastructure | ✅ | ✅ | ✅ | ✅ | ⏳ | ⏳ | ⏳ | ⏳ |
| FLOW-19 | Durable Sagas | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⏳ | ⏳ |
| FLOW-20 | AI Safety & Moderation | ✅ | ✅ | ✅ | ✅ | ⏳ | 🔄 | ⏳ | ⏳ |
| FLOW-21 | Dynamic Forms | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⏳ | ⏳ |
| FLOW-22 | CMS & Publishing | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⏳ | ⏳ |
| FLOW-23 | Form Builder | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⏳ | ⏳ |
| FLOW-24 | AI Tutoring | ✅ | ✅ | ✅ | ✅ | ⏳ | 🔄 | ⏳ | ⏳ |
| FLOW-25 | BFA Governance | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⏳ | ⏳ |
| FLOW-26 | Meta-Arbitration Feedback | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| FLOW-27 | Dynamic Flow Adaptation | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| FLOW-28 | Blog/CMS Modules | ✅ | ✅ | ✅ | ✅ | ⏳ | ⏳ | ⏳ | ⏳ |
| FLOW-29 | Adaptive RAG Research | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| FLOW-30 | RAG Aggregation | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| FLOW-31 | RAG Continuous Learning | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| FLOW-32 | Skill Graph | ✅ | ✅ | ✅ | ✅ | ⏳ | ⏳ | ⏳ | ⏳ |
| FLOW-33 | Self-Building Bootstrap | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| FLOW-34 | Feature Registry | ✅ | ✅ | ✅ | ✅ | ⏳ | ⏳ | ⏳ | ⏳ |

---

## E2E + UI Automation Requirements

Each flow's E2E + UI automation must cover:

1. **Happy path** — primary use case end-to-end
2. **Error path** — failure handling, DataProcessResult.failure() responses
3. **Tenant isolation** — requests from different tenants stay isolated
4. **Idempotency** — duplicate events are deduplicated
5. **UI state** — loading, success, error states in React components
6. **Optimistic updates** — UI updates before server confirmation where applicable
7. **API contract** — `/api/dynamic/{indexName}` responses match expected shape
8. **CloudEvents** — events emitted with correct envelope

**Location:** `server/test/e2e/flow-{NN}/` and `client/src/__tests__/e2e/flow-{NN}/`

---

## Test Quality Rule

**Zero tolerance for failing tests.** There are no "pre-existing failures."
Every failing test is a bug that must be fixed before the flow is committed.

Current baseline: **5,889 passing, 0 failing** (as of 2026-03-31)

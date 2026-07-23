# Functional Spec — FLOW-19 Durable Sagas & Compliance

**Grammar:** G1 Progress strip (per saga) + G3 Card list (saga runs + audit log)
**Primary role tiers:** PLATFORM_OPS (compliance), TENANT_OPS (workflow author), TENANT_CONSUMER (end user — sees progress of their own long-running operations)
**Current state:** **Designed** — 4 services; no UI.

## 1. Summary

Long-running operations (multi-step payouts, background imports, approval chains) are modelled as sagas that survive failures via compensation + audit trail. A tenant admin sees saga runs with their progress strips; an end user sees their own saga's progress; a compliance officer audits the trail.

## 2. Roles & modes

| Role | Route | What |
|---|---|---|
| **TENANT_OPS** | `/admin/sagas/` | Monitor saga runs, retry failures, author new sagas |
| **TENANT_CONSUMER** | `/operations/me` | See own long-running operations' state |
| **PLATFORM_OPS** (compliance) | `/admin/engine/compliance/` | Audit log viewer, regulatory export |

**Modes:** Active run / Completed / Failed-compensating / Failed-final / Audit-only.

## 3. User stories

### Story 3.1 — End user watches their payout processing

**Screens:** `/operations/me/:sagaId`.

1. Page shows saga progress strip: *Request → Verify → Approve → Process → Paid*.
2. Current step pulsing; prior steps check-marked with timestamp; future steps outlined.
3. Estimated-completion banner: *"Usually takes 2 business days. We'll email when done."*
4. If step fails: clear message + *"We're working on it — no action needed from you"*.

### Story 3.2 — Admin retries a failed saga

**Screens:** `/admin/sagas/` list → saga detail.

1. List: G3 card per saga with state badge + current stage.
2. Click → detail with full progress strip + compensation chain + per-step logs.
3. Failed saga: **Retry failed step** or **Rollback to state X**.

### Story 3.3 — Compliance officer exports an audit trail

**Screens:** `/admin/engine/compliance/` → filter → export.

1. Filter bar: date range, user, saga type, state.
2. Results: per-saga audit rows (every state change + who triggered + timestamp).
3. Export: CSV / regulatory PDF.

## 4. Screen structure

- **User operations page** — per-saga progress strip + status banner.
- **Admin saga list** — G3 cards with filter bar.
- **Saga detail** — progress strip + compensation chain + logs + retry/rollback.
- **Compliance viewer** — audit table with filter + export.

## 5. Edge cases

| Case | Behaviour |
|---|---|
| Saga stuck > SLA | Auto-alert platform admin + banner on user-facing page. |
| Compensation fails | Escalate; leave saga in "Needs attention" state, never silently broken. |
| Audit export > 100k rows | Background job + email link. |
| Timezone differences on audit view | Per-user timezone with UTC shown on hover. |

## 6. Problematic states

- **Empty** → *"No operations yet."*
- **Loading** → skeleton progress strip
- **Saga state regression** (rare) → banner *"Re-processed — latest state shown"*
- **Compliance export fails** → toast + retry
- **User tries to see someone else's saga** → `/404`

## 7. Visual direction

**Grammar:** G1 progress strip + G3 card list.

**Feel:** *Observable · Patient · Trustworthy*. Long operations need to feel solid, not anxious.

**Colour world:** neutral chrome; blue for active step; green for completed; amber for compensating; red for failed-final.

**Signature:** the **estimated-completion banner** on user-facing operations — removes anxiety of "is anything happening?"

**Anti-patterns:**
- Hiding compensation from users (they should know refunds are in progress)
- Raw saga-state-machine names ("COMPENSATING_STAGE_4")

## 8. Acceptance criteria

- [ ] User operations page with progress strip per saga.
- [ ] Admin list + detail + retry + rollback.
- [ ] Compliance audit viewer + export (CSV / PDF).
- [ ] Compensation chain visible on failure.
- [ ] SLA alerting.
- [ ] All 5 problematic states covered.
- [ ] Zero engineering state-machine names in user copy.

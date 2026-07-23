# Functional Spec — FLOW-33 System Initiation & Bootstrap

**Grammar:** G1 Progress strip
**Primary role tiers:** PLATFORM_OPS. Engine-internal.
**Current state:** **Designed** — 0 services; 22 session files (one of the most iterated specs in the corpus, 8 deep-research revisions).

## 1. Summary

When the platform boots (first ever boot or after a major version upgrade), a multi-stage bootstrap runs: database initialisation, RAG seeding, skill compilation, health checks, first-tenant provisioning. A platform admin watches the bootstrap progress strip and can intervene on any failing stage.

## 2. Roles & modes

| Role | Route | What |
|---|---|---|
| **PLATFORM_OPS** | `/admin/engine/bootstrap/` | Watch bootstrap, retry stages, approve milestones |

**Modes:** Cold boot (first ever), Warm reboot (post-upgrade), Partial reboot (single subsystem), Simulation (dry-run).

## 3. User stories

### Story 3.1 — Admin watches initial bootstrap

**Screens:** `/admin/engine/bootstrap/current`.

1. Progress strip: 10-12 stages (Infrastructure ready → Databases initialised → Secrets service up → RAG seeded → Skills compiled → First tenant provisioned → Health checks → Go-live).
2. Per stage: timestamp, duration, status, log link.
3. Stuck stage highlights with retry / skip / investigate options.

### Story 3.2 — Admin investigates a failing stage

1. Click a failing stage → expanded panel: error detail, log tail, retry parameters, escalation path.
2. Retry in-place OR retry-from-earlier-stage OR manual fix + mark-complete.

### Story 3.3 — Admin reviews bootstrap history

**Screens:** `/admin/engine/bootstrap/history`.

1. Card list of past bootstraps with outcomes + duration.
2. Click → progress strip replay of that bootstrap.

## 4. Screen structure

- **Current bootstrap** — full-width progress strip + per-stage detail panel.
- **History** — G3 card list.
- **Dry-run** — same UI, banner *"Simulation — not persisted"*.

## 5. Edge cases

| Case | Behaviour |
|---|---|
| Stage timeout | Highlight with amber; retry / manual-fix. |
| Prior stage invalidated by a later fix | Re-run from earliest affected stage. |
| Mid-bootstrap browser closed | Bootstrap continues server-side; admin can reconnect. |

## 6. Problematic states

- **Never-bootstrapped** (first load) → helpful *"Click **Start bootstrap** to begin"*.
- **Stage stuck** → clear retry affordance.
- **Catastrophic failure** (data-loss scenario) → escalate to engineering + lock further bootstrap attempts pending review.

## 7. Visual direction

**Grammar:** G1 Progress strip.

**Feel:** *Observable · Technical · Reassuring*.

**Signature:** the **live log tail** per stage — tail -f style, auto-scrolling, with severity highlighting.

**Anti-patterns:**
- Blocking UI without progress.
- Hiding failures until bootstrap fails completely.

## 8. Acceptance criteria

- [ ] Current-bootstrap progress strip.
- [ ] Per-stage detail with logs + retry.
- [ ] History view.
- [ ] Dry-run simulation.
- [ ] All 3 problematic states covered.

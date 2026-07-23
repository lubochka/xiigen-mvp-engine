# Functional Spec — FLOW-00 Bundle Activation

**Grammar:** G1 Progress strip
**Primary role tiers:** TENANT_OPS, PLATFORM_OPS
**Current state:** **Designed** — spec exists; no code.

## 1. Summary

A tenant activates a pre-defined feature bundle (e.g., "Community starter", "Commerce add-on", "Analytics pro"). The system provisions dependencies, wires routes, seeds data, validates health — each step visible as a progress strip. At the end the tenant gets a working set of flows.

## 2. Roles & modes

| Role | Route | What |
|---|---|---|
| **TENANT_OPS** | `/workspace/settings/bundles/activate/:bundleId` | Kick off activation, watch progress, troubleshoot |
| **PLATFORM_OPS** | `/admin/engine/bundles/` | Author bundles, monitor cross-tenant activation health |

**Modes:** Dry-run (preview provisioning plan before applying), Live activation, Rollback (undo a completed activation within a grace window).

## 3. User stories

### Story 3.1 — Tenant activates a bundle

**Screens:** `/workspace/settings/bundles` → pick bundle → confirm → `/workspace/settings/bundles/activate/:id` progress → success.

1. Browse available bundles; each with description, included flows, effect-on-existing-workspace summary.
2. Click **Activate** → confirm modal: *"Activating Commerce bundle will enable FLOW-08, FLOW-12, FLOW-16 for your workspace. ~15 minutes. Safe to close this page — we'll email you when ready."*
3. Activation page loads progress strip: 8 stages (Validate prereqs → Provision data stores → Wire routes → Seed defaults → Run checks → Configure FREEDOM → Test round-trip → Complete).
4. Each stage has a timestamp + icon + status + "what it does" tooltip.
5. On completion: *"Activated. Here's your new workspace."* + link to the first new screen.

### Story 3.2 — Activation fails mid-way

1. Progress strip stops at the failed stage with red icon + error detail + **Retry this stage** / **Rollback all** / **Contact support**.
2. Prior stages that succeeded are preserved — retry continues from the failed point, not from scratch.

### Story 3.3 — Platform admin authors a new bundle

**Screens:** `/admin/engine/bundles/new`.

1. Bundle metadata (name, description, category, icon).
2. Flow picker: drag flows in; declare order + dependencies.
3. FREEDOM config defaults per flow.
4. Test on staging tenant → publish.

## 4. Screen structure

- **Bundles catalogue:** G3 card list.
- **Activation page:** G1 progress strip (full width) + side panel per stage for details + log.
- **Bundle author console:** wizard + dependency graph preview.

## 5. Edge cases

| Case | Behaviour |
|---|---|
| Prereq flow not activated | Activation blocked with *"Activate FLOW-X first — one-click install?"* |
| Partial success after timeout | Resume from last checkpoint; show *"Resumed from stage 4"*. |
| Tenant cancels mid-activation | Clean rollback; no partial state. |
| Two admins try to activate same bundle | Second sees *"Anna is activating this — watching progress"*. |

## 6. Problematic states

- **Unauthenticated / Permission denied** → redirect / 404
- **Network offline during activation** → progress paused with *"Waiting for connection"*
- **Stage timeout** → *"Stage X taking longer than expected — still running"* with retry option
- **Rollback fails** → *"Rollback incomplete — contact support"* (never leave in partial state silently)
- **Empty catalogue** → *"No bundles available yet"*

## 7. Visual direction

**Grammar:** G1 Progress strip.

**Feel:** *Confident · Observable · Forgiving*. Tenant should know exactly what's happening and feel safe closing the tab.

**Colour world:** Blue for running, green for complete, red for failed, grey for pending.

**Signature:** the **per-stage "what it does" tooltip** — translates engineering steps into plain language.

**Anti-patterns:** Opaque "spinner with no progress"; jargon in stage names.

## 8. Acceptance criteria

- [ ] Bundles catalogue with card list.
- [ ] Activation page with 8-stage progress strip.
- [ ] Resume-from-checkpoint on retry.
- [ ] Rollback preserves prior state cleanly.
- [ ] Email notification on completion.
- [ ] Bundle author console with dependency graph preview.
- [ ] All 5 problematic states covered.

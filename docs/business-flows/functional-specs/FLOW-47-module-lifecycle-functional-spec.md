# Functional Spec — FLOW-47 Module Lifecycle (Fork + Adapt + Export + Test)

**Grammar:** G1 Progress strip + G3 Card list (forked modules)
**Primary role tiers:** TENANT_OPS (module adapter), PLATFORM_OPS (governance)
**Current state:** **Designed** — 0 services. The unresolved architect goal referenced across prior sessions: *"Decouple XIIGen module lifecycle from Claude Code execution; extend the module copy phase to fork+adapt+export+test modules in isolation."*

## 1. Summary

A tenant can **fork** a flow module from the sharable-flows marketplace (FLOW-32) into their own workspace, **adapt** it (modify without touching origin), **export** the adapted module back to the marketplace as a new variant, and **test** it in isolation — without affecting the origin module or the XIIGen engine itself. This flow enables safe experimentation and community-driven module evolution.

Architecturally this is the flow that closes the earlier "decouple module lifecycle from Claude Code" question — modules become first-class artifacts with their own lifecycle (fork/adapt/export/test), not bound to the engine's internal state.

## 2. Roles & modes

| Role | Route | What |
|---|---|---|
| **TENANT_OPS** | `/admin/modules/` | Fork, adapt, test, export modules |
| **PLATFORM_OPS** | `/admin/engine/modules/` | Governance: module signing, version publishing, abuse review |

**Modes:** Fork (copy from origin), Adapt (local modification sandboxed), Test (isolation test environment), Export (publish adapted variant back to marketplace).

## 3. User stories

### Story 3.1 — Tenant forks a module

**Screens:** FLOW-32 marketplace → module detail → **Fork into my workspace**.

1. On the module detail page (FLOW-32), alongside **Install**, tenant sees **Fork**.
2. Fork creates an editable copy with a new identity tied to the tenant's workspace.
3. Redirect to `/admin/modules/:id/edit` where adaptation happens.

### Story 3.2 — Tenant adapts the forked module

**Screens:** `/admin/modules/:id/edit` — uses FLOW-18 visual flow engine.

1. Tenant opens the forked module in the flow editor.
2. Makes changes: rename, re-wire, swap task types, modify FREEDOM config defaults.
3. Each change saved as a "patch" on top of the origin module — tenant can see diff vs origin at any time.

### Story 3.3 — Tenant tests the adapted module in isolation

**Screens:** `/admin/modules/:id/test`.

1. **Isolation test environment** spun up on demand — a sandbox tenant that runs only this module with synthetic data.
2. Test runs: seed data → execute module → capture outcomes → compare against expected.
3. Report: pass/fail per test case + diff-from-origin-behaviour + performance metrics.

### Story 3.4 — Tenant exports the adapted module

**Screens:** `/admin/modules/:id/export` → wizard.

1. Wizard: (1) metadata (name, description, changelog, origin attribution); (2) visibility (tenant-only / public marketplace); (3) licensing (inherit / override); (4) review.
2. Submit → if public, goes through marketplace curator review (FLOW-32); if tenant-only, available immediately.
3. New module ID + URL; tracked as a variant of the origin.

### Story 3.5 — Platform admin reviews a module variant for signing

**Screens:** `/admin/engine/modules/signing-queue`.

1. Queue of exported variants awaiting signing (marketplace publication).
2. Each: origin module link, diff summary, test report, author.
3. Actions: **Sign and publish** / **Request changes** / **Reject**.

## 4. Screen structure

- **Forked modules list** — G3 cards with state (Forked / Adapted / Tested / Exported).
- **Adapt editor** — uses FLOW-18 canvas; shows diff toggle.
- **Test environment** — isolation sandbox with controlled seed + outcome comparison.
- **Export wizard** — 4-step with review.
- **Signing queue** — admin verdict grid (G2).

## 5. Edge cases

| Case | Behaviour |
|---|---|
| Origin module updates after fork | Fork shows *"Origin has new version — rebase?"* with merge tool. |
| Test environment provisioning fails | Clear error + retry; no partial state. |
| Export conflicts with existing name | Prompt for alternative; can't overwrite. |
| Origin unpublished after fork | Fork still works; warning on detail: *"Origin no longer available."* |
| Tenant accumulates 100+ forks | Bulk-archive tool for cleanup. |
| Circular fork (fork of a fork of origin) | Full lineage tracked; visible on detail page. |

## 6. Problematic states

- **Empty list** → *"Fork a module from the marketplace to get started."*
- **Test environment unavailable** — queue for later with ETA.
- **Export fails curator review** — detailed feedback + **Revise** option.
- **Signing rejected** — clear reason + appeal path.
- **Conflict (two tenants fork same origin, similar adaptations)** — no prevention needed; both coexist.

## 7. Visual direction

**Grammar:** G1 Progress strip (fork→adapt→test→export lifecycle) + G3 Card list (forked modules).

**Feel:** *Sandbox · Controlled · Traceable*. Tenants should feel free to experiment; the isolation is the guarantee.

**Signature:** the **diff-vs-origin toggle** in the adapt editor — instant visibility of what the tenant changed vs the origin.

**Anti-patterns:**
- Silent propagation of origin updates to forks (always prompt).
- Export without clear attribution to origin author.

## 8. Acceptance criteria

- [ ] Fork flow from marketplace creates editable copy with lineage.
- [ ] Adapt editor (reuses FLOW-18) with diff-vs-origin toggle.
- [ ] Isolation test environment spins up on demand with sandbox tenant.
- [ ] Test report with pass/fail + behavioural diff + perf metrics.
- [ ] Export wizard with metadata + visibility + licensing + review.
- [ ] Platform admin signing queue (G2 verdict grid).
- [ ] Origin-update prompt on forks.
- [ ] Lineage visible on module detail (fork tree).
- [ ] All 5 problematic states covered.
- [ ] Tenant isolation verified — forks can't affect origin tenant's flows.
- [ ] Module lifecycle decoupled from XIIGen engine lifecycle (closes architect goal).

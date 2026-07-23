# Functional Spec — FLOW-37 Multi-Stack Porting (design-system-governance)

**Grammar:** G2 Verdict grid (coupling audit) + G3 Card list (porting jobs + compatibility reports)
**Primary role tiers:** PLATFORM_OPS (primary), PLATFORM_SUPPORT (read-only). Engine-internal.
**Current state:** **Half-built** — **27 services** (the most for any flow), purpose-built `StackPortingScreen`, `StackCouplingBadge`, `CompatibilityReportCard`, `PortingStatusTag` exist — all orphaned. Page wrapper renders generic `AdminCrudPanel`.
**Primary unblock:** FLOW-45 RUN-52 page rewrite. **Single biggest implementation-to-UI gap in the product.**

*Note:* The slug "design-system-governance" is a legacy name. Per the zip addendum, this flow is actually about **Multi-Stack Porting / Engine Self-Awareness** — auditing whether the engine's task types can run on Node vs Python vs PHP vs Rust etc., and orchestrating porting jobs when needed.

---

## 1. Summary

The XIIGen engine is multi-stack — it generates NestJS (TypeScript), but could generate Python FastAPI, PHP Laravel, Rust Axum. Before generating to a new stack, the engine audits each task type across ten *coupling dimensions* (dependency, runtime, build, test, deployment, concurrency, language features, ecosystem, security, operability) and classifies each cell as CONCEPT_NEUTRAL / IMPL_VARIES / STACK_COUPLED / INCOMPATIBLE. A platform admin reviews the audit verdict grid, approves porting jobs, and watches compatibility reports per target stack. All 27 services run; the UI is one page-rewrite away from being live.

---

## 2. Roles & modes

| Role | Route | What they do |
|---|---|---|
| **PLATFORM_OPS** (primary) | `/admin/engine/multi-stack-porting/` | Review coupling audits, approve/reject porting jobs, commission new audits |
| **PLATFORM_SUPPORT** | Same, read-only | Read-only |

**Modes:** `?mock=<key>` design preview / live mode. Filter by target stack / by task type / by verdict severity.

---

## 3. User stories

### Story 3.1 — Admin reviews the engine's porting readiness for a target stack

**Screens:** `/admin/engine/multi-stack-porting/` → coupling verdict grid → cell detail popover.

**Happy path:**
1. Page loads `StackPortingScreen`. Top-right: target-stack selector (`node-nestjs` default, dropdown of supported + proposed stacks: `python-fastapi`, `php-laravel`, `rust-axum`, `dotnet-aspnet`, `go-chi`).
2. Admin picks `python-fastapi`.
3. Verdict grid renders: rows = 10 coupling dimensions, columns = task types being audited, cells = verdict (CONCEPT_NEUTRAL ✅ green / IMPL_VARIES 🟡 amber / STACK_COUPLED 🟠 orange / INCOMPATIBLE ❌ red).
4. Admin clicks a red cell → popover: *"T48 Email verification wait — INCOMPATIBLE on PHP Laravel (wp_cron TTL unreliable for 24-hour gate). Mitigation: use Redis-backed scheduler. Confidence: high."*
5. Top of page: summary tile *"python-fastapi compatibility: 80% — 8 incompatible cells flagged"*.

**UI elements:**
- Verdict grid: sticky first column (dimension names), sticky top row (task type IDs + human names).
- Cells: colour + icon + abbrev label (never colour alone).
- Popover: verdict reasoning + mitigation suggestion + confidence score + related decisions link.

### Story 3.2 — Admin commissions a new audit for a newly proposed stack

**Screens:** `/admin/engine/multi-stack-porting/` → **Propose stack** button → wizard → live audit job.

**Happy path:**
1. Admin clicks **Propose stack** (top-right).
2. Wizard: (1) *Stack identity* — slug, display name, category (server/client/platform), well-known packages; (2) *Capability declarations* — async model, scheduler, database drivers, common constraints; (3) *Audit depth* — full (all dimensions) or targeted (pick dimensions).
3. Submit → audit job queued. Job card appears in the *Active audits* section (G3 card list below the verdict grid) with progress bar.
4. When audit completes, verdict grid for the new stack becomes available.

### Story 3.3 — Admin reviews compatibility report per target stack

**Screens:** `/admin/engine/multi-stack-porting/` → **Reports** tab → per-stack card list → detail.

**Happy path:**
1. Reports tab (top). Card list: one `CompatibilityReportCard` per target stack.
2. Card: target stack logo, overall compatibility %, task-type count by verdict (e.g., *"84 CONCEPT_NEUTRAL · 12 IMPL_VARIES · 6 STACK_COUPLED · 3 INCOMPATIBLE"*), last-audited timestamp.
3. Click card → report detail view: verdict grid + narrative summary + recommended stubs + incompatible task types with mitigations.
4. **Export as PDF** button for sharing with engineering stakeholders.

### Story 3.4 — Admin approves a porting job

**Screens:** Reports tab → incompatible cell → *"Initiate porting"* → job card with state machine.

**Happy path:**
1. Admin reviews a compatibility report; decides to commission work on the 3 INCOMPATIBLE task types for `python-fastapi`.
2. **Initiate porting** button on the report → wizard: assign engineering owner, set deadline, write brief.
3. Job appears in *Active porting jobs* section. States: *Brief → Accepted → In progress → In review → Verified → Live*.
4. Once Live, the audit re-runs and cells flip from red to green.

### Story 3.5 — Admin sees that a stack became more constrained (regression)

**Trigger:** an audit re-run finds new INCOMPATIBLE cells in a stack that was previously fully green.

**Happy path:**
1. Compatibility report card flashes with a regression indicator: *"⚠ 2 new incompatibilities since last audit"*.
2. Click → detail view highlights the specific cells that flipped + diff from previous audit + potential causes (new task type added to the engine; existing task type added a dependency).
3. Top-right: **Alert platform team** button (posts to Slack / sends email to on-call).

---

## 4. Screen structure & UI elements

### 4.1 `/admin/engine/multi-stack-porting/` layout

**Tabs:** *Coupling audit · Reports · Active jobs · Proposed stacks · Decisions*.

**Tab 1 — Coupling audit (the headline):** target-stack selector + verdict grid + cell popover.

**Tab 2 — Reports:** card list of `CompatibilityReportCard` per target stack.

**Tab 3 — Active jobs:** card list of porting jobs in flight with state badges.

**Tab 4 — Proposed stacks:** card list of stacks awaiting audit + **Propose stack** CTA.

**Tab 5 — Decisions:** timeline of porting decisions (approved / rejected / blocked) with rationale.

### 4.2 Verdict grid component (the flagship)

- Rows: 10 coupling dimensions (labelled).
- Columns: task types (scrollable horizontally; sticky row labels).
- Cells: colour + icon + abbrev. Hover for full verdict; click for popover.
- Summary row at bottom: per-column count of each verdict type.
- Summary column at right: per-row incompatibility count.

### 4.3 `CompatibilityReportCard`

```
┌──────────────────────────────────────────────────────────────┐
│ [stack-logo]  python-fastapi                  87% compatible │
│ Server stack                                                  │
│                                                               │
│ 84 concept-neutral · 12 impl-varies · 6 stack-coupled · 3 inc │
│                                                               │
│ Last audited 2 hours ago                          View report │
└──────────────────────────────────────────────────────────────┘
```

### 4.4 `StackCouplingBadge`

Small inline badge with icon + colour + label. Used inside the verdict grid cells and also inline in task-type documentation.

---

## 5. Edge cases

| Case | Expected behaviour |
|---|---|
| Audit times out | Job card flags *"Audit timed out"*; **Retry** + **Investigate** actions. Admin can see partial results if any. |
| Two audits for same stack run concurrently | Second is blocked with notice; admin can cancel the first or wait. |
| Stack capability declaration changes after audit | Audit results marked stale; banner on the verdict grid *"Capabilities changed — re-run audit to see current verdict"*. |
| Task type removed from engine mid-audit | Audit job continues; removed task type's column shows *"No longer in engine"*. |
| Admin approves porting for a dimension marked CONCEPT_NEUTRAL | Warning modal: *"This dimension is already concept-neutral — porting effort is probably zero. Sure you want a job?"* |
| Rerun audit finds same verdicts as before | Silent pass; timestamp updates; no banner. |

---

## 6. Problematic states

| State | What the user sees |
|---|---|
| **Unauthenticated** | Redirect. |
| **Permission denied** | `/404`. |
| **Empty audit** (no stacks ever audited) | Empty state with **Propose stack** CTA + brief explanation of what multi-stack porting is. |
| **Loading verdict grid** | Skeleton grid that preserves layout. |
| **Server error loading grid** | Retry banner; grid skeleton stays. |
| **Audit job fails** | Job card turns red; error message + **Retry** + **Contact platform team**. |
| **Stale audit** (≥30 days) | Report card shows age warning; top-level banner prompts re-run. |
| **Incompatible cell clicked but no mitigation authored** | Popover shows *"No mitigation documented yet"* with **Suggest mitigation** affordance. |
| **Export PDF fails** | Toast with retry. |
| **Regression alert** | Red pill on the Reports tab + detail highlight (see Story 3.5). |

---

## 7. Visual direction

**Grammar:** G2 verdict grid (headline) + G3 card list (reports, jobs, decisions).

**Feel:** *Rigorous · Technical · Clear*. This is the engine auditing itself — the UI should feel like a compliance dashboard.

**Reference UIs:** **Flyway** migration matrix, **SonarQube** dependency dashboards, **Percy** visual diff grids.

**Colour world:**
- Green for compatibility
- Amber for "varies" (not a problem, just effort)
- Orange for "stack-coupled" (requires per-stack work)
- Red for "incompatible" (blocker)
- Dark-chrome neutral background (`#1a1d22` optional dark mode; `#f5f7fa` light)

**Signature:** the verdict grid — 10 × N cells, instantly scannable. It's the primary artifact of this whole flow.

**Anti-patterns:**
- Task-type IDs (`T590`, `T591`) as the only column header (use human name: "Stack Coupling Auditor T590")
- Colour-only verdict cells (WCAG — use colour + icon + abbrev)
- Generic admin CRUD table (replace it)

---

## 8. Acceptance criteria

- [ ] `DesignSystemGovernancePage.tsx` wraps `StackPortingScreen` via FLOW-45 RUN-52 template.
- [ ] Verdict grid renders 10 coupling dimensions × N task types with colour + icon + abbrev per cell.
- [ ] Target-stack selector switches the visible verdict set.
- [ ] Cell popover shows verdict reasoning + mitigation + confidence score.
- [ ] Reports tab renders `CompatibilityReportCard` per stack with compat %, verdict breakdown, last-audited timestamp.
- [ ] Export as PDF works.
- [ ] Propose-stack wizard captures stack identity, capabilities, audit depth.
- [ ] Active porting jobs display with state machine (Brief → Accepted → In progress → In review → Verified → Live).
- [ ] Regression detection flags new INCOMPATIBLE cells with diff view.
- [ ] All 10 problematic states (§6) documented treatment.
- [ ] Human-readable task-type names always precede numeric IDs.
- [ ] WCAG AA on all cell colour/icon combinations.

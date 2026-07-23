# Functional Spec — FLOW-39 OSS Curriculum

**Grammar:** G1 Progress strip (per-contributor lifecycle)
**Primary role tiers:** PLATFORM_OPS (curriculum author), TENANT_CONSUMER (OSS contributor), PLATFORM_SUPPORT
**Current state:** **Half-built** — 4 services, purpose-built `OssCurriculumScreen` orphaned. Page wrapper renders `AdminCrudPanel`.
**Primary unblock:** FLOW-45 RUN-52 page rewrite + contributor-facing progress page.

---

## 1. Summary

XIIGen maintains an OSS contributor programme. A curriculum author (platform admin) defines a progression — "First contribution → Bug fix → Feature add → Code review → Maintainer" — with specific tasks and thresholds at each level. Contributors see their own progress strip, pick tasks to work on, submit via PR, and get reviewed. Today the curriculum data model exists; the contributor-facing progress page doesn't; the author-facing curriculum editor doesn't.

---

## 2. Roles & modes

| Role | Route | What they do |
|---|---|---|
| **TENANT_CONSUMER** (contributor) | `/oss/me` | See own progress strip, pick next task, submit contribution |
| **PLATFORM_OPS** (curriculum author) | `/admin/engine/oss-curriculum/` | Define stages, author tasks, approve level-ups |
| **PLATFORM_OPS** (reviewer) | `/admin/engine/oss-curriculum/review` | Review submitted contributions |

**Modes:**
- **First-time contributor:** onboarding card walks them through Stage 1.
- **Active contributor:** progress strip dominant, next-task recommendation prominent.
- **Maintainer:** has additional actions (approve level-ups for others).

---

## 3. User stories

### Story 3.1 — Contributor sees their progress *(TENANT_CONSUMER, G1)*

**Screens:** `/oss/me` → task detail → PR submission → progress update.

**Happy path:**
1. `/oss/me` loads. Top: progress strip — 5 stages (Newcomer / First contribution / Bug fixer / Feature builder / Code reviewer / Maintainer) with current stage highlighted.
2. Below strip: *"Your next milestone: submit 1 more bug fix to reach Feature builder."*
3. Below: *Recommended tasks* — card list of tasks matching your stage level, filterable by difficulty / area / estimated hours.
4. Sidebar: stats (PRs merged, reviews done, streak, rank).

**UI elements:**
- **Progress strip:** horizontal, 5 pills, filled/empty state per pill. Current pill pulsing subtly.
- **Next-milestone line:** clear progress-to-next-level text.
- **Task card:** title, area (e.g., *flows*), difficulty (easy / medium / hard), estimated hours, "good first issue" badge if relevant, **Claim** CTA.

### Story 3.2 — Contributor claims a task and works on it

**Trigger:** contributor clicks **Claim** on a task card.

**Happy path:**
1. Modal: *"Claim this task? You'll have 7 days to submit a PR. After that it returns to the pool."*
2. On confirm: task state → *Claimed by you*; progress strip unchanged but a new card appears: *"In progress — submit by Apr 29."*
3. Contributor works externally, opens PR referencing the task ID.
4. Task auto-detects the PR; state → *In review*; progress card updates.
5. On merge: state → *Complete*; progress strip updates; level-up toast if threshold crossed.

### Story 3.3 — Curriculum author defines a new stage *(PLATFORM_OPS)*

**Screens:** `/admin/engine/oss-curriculum/` → **New stage** → stage editor.

**Happy path:**
1. Admin clicks **New stage**.
2. Stage editor: name, description, entry criteria (e.g., "5 merged PRs"), exit criteria, colour, icon.
3. Publish → stage appears in curriculum; contributors at the entry criteria see it unlocked.

### Story 3.4 — Reviewer approves a contribution *(PLATFORM_OPS reviewer)*

**Screens:** `/admin/engine/oss-curriculum/review` → queue → per-PR review.

**Happy path:**
1. Review queue: card list of submitted contributions sorted by age.
2. Click card → per-PR view: PR diff link, contributor profile, task brief.
3. Actions: **Approve** / **Request changes** (with comment) / **Reject** (with reason).
4. On approve, contributor's progress updates; level-up fires if threshold crossed.

---

## 4. Screen structure & UI elements

### 4.1 `/oss/me` (contributor, G1)

**Layout:**
- **Progress strip** at top, spanning full width.
- **Next milestone** card below strip.
- **Recommended tasks** card list.
- **Stats sidebar** (desktop) / bottom section (mobile).

**Progress strip visual:**
```
●─────●─────●─────○─────○
Newcomer  First  Bug   Feature Reviewer
                  fixer builder
                  [ YOU ARE HERE ]
```

### 4.2 `/admin/engine/oss-curriculum/` (author)

**Layout:** tabs — *Stages · Tasks · Contributors · Review queue*.

- **Stages:** card list of defined stages; **New stage** CTA.
- **Tasks:** task library with filter by stage / area / difficulty.
- **Contributors:** leaderboard + individual progress strips.
- **Review queue:** embedded Story 3.4 view.

### 4.3 Task card (shared between author + contributor views)

```
┌───────────────────────────────────────────────────────┐
│ [area-icon]  Fix typo in FLOW-01 spec                 │
│              ★ Easy · ~1h · good first issue          │
│              Stage 1: First contribution               │
│                                              [Claim]  │
└───────────────────────────────────────────────────────┘
```

---

## 5. Edge cases

| Case | Expected behaviour |
|---|---|
| Contributor claims 3 tasks without finishing any | Inline warning: *"You have 3 active claims — finish one before claiming more?"*. Soft cap, not hard block. |
| Task deadline passes without PR submitted | Task returns to pool; contributor sees *"Deadline passed — claim again if you want another shot"* on their dashboard. |
| Reviewer approves a PR for a task that was already completed by another contributor | Rare race condition; second approval is noop; banner on reviewer UI: *"Already merged by {other-contributor}"*. |
| Level-up criteria changes after contributor already met old criteria | Grandfather: honour old criteria for existing contributors; new criteria applies only to new joiners. |
| Contributor has 0 contributions | Empty stats sidebar with encouraging copy: *"Claim your first task to get started."* |

---

## 6. Problematic states

| State | What the user sees |
|---|---|
| **Unauthenticated** on `/oss/me` | Redirect to login with return path. |
| **Permission denied** (contributor on `/admin/engine/oss-curriculum/`) | `/404`. |
| **Empty queue** (reviewer) | *"Nothing to review right now — well done."* |
| **Loading** | Skeleton progress strip + skeleton cards. |
| **Task claim fails** | Toast *"Couldn't claim — try again"* + retry. |
| **Stage publish fails** (author) | Inline validation or banner; retry. |
| **Stale contributor data** (leaderboard out of date) | *"Updated 2m ago"* timestamp, subtle refresh button. |
| **PR link broken** (external GitHub) | Task card shows *"PR link unreachable — re-submit?"*; doesn't block other tasks. |

---

## 7. Visual direction

**Grammar:** G1 Progress strip.

**Feel:** *Encouraging · Honest · Craftspeople*. This isn't gamification with confetti; it's a craftsperson's ladder.

**Colour world:**
- Each stage has its own restrained colour (cooler blues for early stages, warmer amber/gold for higher stages — never rainbow).
- Completed pills filled; current pulsing; future greyed out.

**Signature:** the **next-milestone line** — one sentence that tells the contributor exactly what to do next ("Submit 1 more bug fix to reach Feature builder"). Removes ambiguity better than any chart.

**Anti-patterns:**
- XP counts / point totals without meaningful next step (that's vanity metrics)
- Leaderboards as the primary surface (fosters competition over craft)
- Gold-foil graphics / explosions / excessive celebration

---

## 8. Acceptance criteria

- [ ] `OssCurriculumPage.tsx` wraps `OssCurriculumScreen` via FLOW-45 RUN-52 template.
- [ ] Contributor page `/oss/me` renders progress strip + next-milestone line + recommended tasks.
- [ ] Progress strip pills show filled / pulsing-current / greyed-future.
- [ ] Task claim flow includes confirmation modal, deadline, automatic PR detection.
- [ ] Curriculum author can create stages with entry/exit criteria.
- [ ] Review queue renders and supports approve / request changes / reject.
- [ ] All 8 problematic states (§6) documented.
- [ ] Level-up criteria grandfathered for existing contributors when criteria changes.

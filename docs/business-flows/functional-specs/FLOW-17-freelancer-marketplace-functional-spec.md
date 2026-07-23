# Functional Spec — FLOW-17 Freelancer Marketplace

**Grammar:** G3 Card list with state badge
**Primary role tiers:** TENANT_CONSUMER (hirer + freelancer), TENANT_OPS, PLATFORM_OPS
**Current state:** **Designed** — 4 services scaffolded; no UI.

## 1. Summary

A hirer posts a job brief. Freelancers discover, apply, and are shortlisted. Work happens externally; milestones + escrow (FLOW-16) handle payments. Both parties review each other on completion. A two-sided marketplace with trust signals, messaging, and dispute handling.

## 2. Roles & modes

| Role | Route | What |
|---|---|---|
| **TENANT_CONSUMER (hirer)** | `/jobs/post`, `/jobs/mine` | Post briefs, review applicants, hire, manage milestones |
| **TENANT_CONSUMER (freelancer)** | `/freelance`, `/jobs/:id`, `/freelance/me` | Browse jobs, apply, manage active work, earnings |
| **TENANT_OPS** | `/admin/freelance/` | Platform oversight, dispute handling |
| **PLATFORM_OPS** | `/admin/engine/freelance/` | Cross-tenant metrics |

**Modes:** Open market (anyone applies) / Invite-only / Private brief to short-list.

## 3. User stories

### Story 3.1 — Hirer posts a job brief

**Screens:** `/jobs/post` → 4-step wizard → published job page.

1. Step 1 — Brief: title, description, required skills, timeline.
2. Step 2 — Budget: fixed price / hourly / milestones.
3. Step 3 — Visibility: open / invite-only.
4. Step 4 — Payment method: link to FLOW-16 escrow setup.
5. Publish → job live at `/jobs/:id`; notifications to matching freelancers.

### Story 3.2 — Freelancer browses + applies

**Screens:** `/freelance` → job detail → apply modal.

1. Grid of open jobs; filter by skill / budget / timeline.
2. Click job → detail view: brief, hirer profile, budget, similar jobs.
3. **Apply** → modal: cover letter, attach portfolio samples, propose timeline + rate.
4. Submit → application appears in hirer's review queue.

### Story 3.3 — Hirer reviews applications + hires

**Screens:** `/jobs/:id/applicants` → applicant detail → hire.

1. Applicants list (G3 cards): photo, name, rating, proposed rate, cover letter snippet, portfolio preview.
2. Actions per applicant: **Shortlist** / **Message** / **Hire** / **Decline**.
3. **Hire** → contract form (milestones if chosen) → FLOW-16 escrow setup → notification to freelancer.

### Story 3.4 — Freelancer delivers milestone + requests release

**Screens:** `/freelance/me/:jobId` → milestones.

1. Milestone card shows brief, deliverable, state (In progress / Submitted / Released / Disputed).
2. **Submit deliverable** → upload files + message → state → Submitted; hirer notified.
3. Hirer reviews → **Release payment** → escrow released (FLOW-16); next milestone unlocks.

### Story 3.5 — Dispute between hirer and freelancer

**Screens:** milestone detail → Raise dispute → mediation workspace.

1. Either party clicks **Raise dispute** with reason.
2. Mediation workspace: timeline of events, messages, file history, mediator (platform admin) guiding resolution.
3. Resolution: full release / partial release / full refund. Platform logs verdict.

## 4. Screen structure

- **`/freelance`** public hub — G3 card list of open jobs.
- **Job detail** — hero + brief + budget + apply CTA + hirer profile card.
- **Hirer console** — applications kanban (Applied / Shortlisted / Interviewed / Hired / Declined).
- **Freelancer profile** — portfolio, reviews, earnings, active jobs.
- **Dispute workspace** — evidence panel + mediator chat.

## 5. Edge cases

| Case | Behaviour |
|---|---|
| Freelancer applies to own tenant's job | Block with *"Can't apply to your own tenant's job"*. |
| Hirer withdraws job mid-applications | Applicants notified; state → *Withdrawn*; applications marked inactive. |
| Milestone deliverable file over size | Upload chunked; retry on failure. |
| Dispute unresolved after 14 days | Escalate to platform admin; both parties notified. |
| Freelancer disappears mid-project | Hirer can claim refund via dispute after 7 days of inactivity. |

## 6. Problematic states

- **Empty job list** → *"No open jobs yet — check back soon."*
- **No matching skills** → *"No jobs match your skills — update your profile?"*
- **Application failed** → inline error + retry; form state preserved
- **Escrow unavailable** → block hire with *"Set up payments first"*
- **Dispute unresolved** → clear escalation path visible
- **Session expired** → preserve form, sign-in modal

## 7. Visual direction

**Grammar:** G3 Card list with state badge.

**Feel:** *Trustworthy · Direct · Human*. Two humans agreeing on work — not a transactional checkout.

**Reference UIs:** Upwork, Contra, Toptal, Arc.

**Colour world:** Warm neutrals; trust-green for completed milestones; amber for in-progress; red only for disputes.

**Signature:** **Review ratings as trust signals** — both sides rate each other, visible on profiles. Critical for marketplace trust.

**Anti-patterns:**
- Fake "online now" badges.
- Pre-selected "boost this post" upsells.
- Hidden platform fees.

## 8. Acceptance criteria

- [ ] Job posting wizard with 4 steps.
- [ ] Public job hub + detail page.
- [ ] Applicants management with kanban.
- [ ] Milestone tracking + escrow integration (FLOW-16).
- [ ] Dispute workspace with evidence + mediation.
- [ ] Bilateral review system.
- [ ] All 6 problematic states covered.

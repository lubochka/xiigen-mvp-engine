# Functional Spec — FLOW-27 Human Interaction Gate

**Grammar:** G2 Verdict grid (decision queue)
**Primary role tiers:** PLATFORM_OPS (on-call decider), TENANT_CONSUMER (affected user)
**Current state:** **Designed** — 0 services; 22 session files of spec.

## 1. Summary

When the engine is uncertain — a borderline arbiter verdict, a novel case, a policy edge — it pauses and queues the decision for a human. A platform operator reviews, decides, and the engine resumes with that verdict as training signal.

## 2. Roles & modes

| Role | Route | What |
|---|---|---|
| **PLATFORM_OPS** | `/admin/engine/human-gate/` | See queue, decide, optionally explain |
| **TENANT_CONSUMER** | Banner in their own flow while gate is pending | *"We're reviewing your {action} — usually 10 minutes"* |

**Modes:** Sync gate (user waits), Async gate (user proceeds, decision applies later), SLA tier (high-value tenants faster review).

## 3. User stories

### Story 3.1 — Operator reviews queue + decides

**Screens:** `/admin/engine/human-gate/queue` → case detail.

1. Queue: G2 verdict grid — rows = pending decisions, columns = arbiter verdicts + confidence + SLA timer.
2. Cases sorted by SLA urgency + confidence.
3. Click case → detail: full context (what triggered, arbiter reasoning, user profile if relevant, prior similar decisions).
4. Operator chooses verdict + optional explanation (fed back to training).

### Story 3.2 — User waits with context

**Screens:** inline banner in their flow.

1. Banner: *"We're reviewing this — usually 10 minutes. We'll email when done."*
2. On decision: banner disappears; outcome applied; user notified.

## 4. Screen structure

- **Queue** — verdict grid with SLA timers.
- **Case detail** — context panels + decision form.
- **Tenant-facing banner** — ephemeral, dismissible with follow-up email.

## 5. Edge cases

| Case | Behaviour |
|---|---|
| SLA breach | Escalate; second on-call notified. |
| Conflicting operators decide simultaneously | First-decision-wins; second sees *"Already decided"*. |
| Case expires without decision | Default fallback (conservative) applied; logged. |
| Decision reversed on appeal | Retrains arbiter with the reversal. |

## 6. Problematic states

- **Empty queue** → *"No decisions pending."*
- **Operator offline / no one on call** → automatic escalation to platform lead.
- **Case data loss** → never auto-decide; hold until human reviews.
- **User timeout waiting** → graceful fallback with explanation.

## 7. Visual direction

**Grammar:** G2 verdict grid.

**Feel:** *Urgent · Fair · Contextual*. These are live decisions affecting users.

**Signature:** the **SLA timer** per case — visible urgency.

**Anti-patterns:**
- Opaque "under review" banners to users.
- Decision without explanation option (training signal lost).

## 8. Acceptance criteria

- [ ] Queue with G2 grid + SLA sort.
- [ ] Case detail with full context.
- [ ] Decision + optional explanation feeds training.
- [ ] User-facing banner + email notification.
- [ ] SLA escalation.
- [ ] All 4 problematic states covered.

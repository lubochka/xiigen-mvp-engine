# Functional Spec — FLOW-24 AI Safety & Moderation

**Grammar:** G5 Kiosk (user report) + G2 Verdict grid (moderator queue)
**Primary role tiers:** TENANT_CONSUMER (reporter), TENANT_OPS (moderator), PLATFORM_OPS (policy author)
**Current state:** **Designed** — 1 service; no UI.

## 1. Summary

End users report content they find harmful. Automated checks (classifier) pre-sort into "clear" / "borderline" / "flagged". Moderators review borderline + flagged in a verdict grid, decide keep/remove/warn. Policy authors tune the classifier thresholds and policies.

## 2. Roles & modes

| Role | Route | What |
|---|---|---|
| **TENANT_CONSUMER** | Inline report buttons across the product | Report a post / message / listing |
| **TENANT_OPS** (moderator) | `/admin/moderation/` | Review reports, verdict, take action |
| **PLATFORM_OPS** | `/admin/engine/moderation/` | Tune policies, review cross-tenant patterns |

**Modes:** Automated pre-sort (classifier), Human-review (borderline + escalated), Appeals (user contests verdict).

## 3. User stories

### Story 3.1 — User reports bad content

**Screens:** inline **Report** button → 3-step form.

1. Button appears on every reportable content item (post, message, listing, review).
2. Click → modal: (1) *What's wrong?* checkbox list (Spam / Harassment / Hate speech / Sexual content / Violence / Illegal / Other); (2) Optional detail text; (3) Confirm.
3. Submit → toast *"Thanks — we'll review it"*; report enters moderation queue.

### Story 3.2 — Moderator reviews flagged content

**Screens:** `/admin/moderation/` queue → verdict grid → case detail.

1. Queue: G2 verdict grid — rows = reports, columns = check verdicts (Classifier / User reports / History).
2. Click row → case detail: content, context (before/after posts), author history, similar cases, verdict actions.
3. Actions: **Keep** / **Warn author** / **Remove + explain** / **Escalate**.

### Story 3.3 — User appeals a moderation verdict

**Screens:** notification → appeal form → status updates.

1. Affected user gets email/notification: *"Your post was removed because... — disagree? Appeal within 7 days."*
2. Appeal form: reason + evidence.
3. Re-reviewed by a different moderator; verdict confirmed or reversed.

## 4. Screen structure

- **Inline report** modal (consistent across content types).
- **Moderator queue** with verdict grid + detail.
- **Case detail** with context panels.
- **Policy author console** — policy categories + thresholds + example test cases.

## 5. Edge cases

| Case | Behaviour |
|---|---|
| User reports own content | Blocked — *"Use the edit or delete buttons instead."* |
| Rate-limited reports (user submits 20/min) | Soft cap; auto-review spam pattern. |
| Moderator acts on a case that was auto-resolved | Banner *"Already resolved — your verdict is a confirming vote"*. |
| Content deleted by author before moderator decides | Case closes automatically with log. |
| Appeal after window closed | Blocked with explanation. |

## 6. Problematic states

- **Empty queue** → *"Clean queue — nice."*
- **Stale case** (sitting >24h) → flagged for escalation.
- **Classifier down** → queue continues on user reports only; banner informs moderators.
- **Appeal overload** → queue shows priority by severity.

## 7. Visual direction

**Grammar:** G5 report + G2 verdict grid.

**Feel:** *Serious · Fair · Measured*. Moderation is high-stakes; UI must feel like a deliberation room, not a game.

**Signature:** the **context panel** in case detail — shows content + surroundings + author history simultaneously. Moderators need full context, not just the reported snippet.

**Anti-patterns:**
- Emojis in moderator verdicts.
- Gamified moderator leaderboards.
- "Report" button that auto-deletes on one click (should always queue for review).

## 8. Acceptance criteria

- [ ] Inline report across post/message/listing/review types.
- [ ] Moderator queue with G2 verdict grid.
- [ ] Case detail with context panels + author history.
- [ ] Appeals flow with 7-day window + different-moderator re-review.
- [ ] Rate-limited report submission.
- [ ] All 4 problematic states covered.
- [ ] Every removal includes plain-language explanation to author.

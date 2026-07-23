# Flow UI examination — FLOW-24 ai-safety-moderation

## Date: 2026-04-20 · Run: RUN-56 · Batch: B (Grammar 2 Verdict Grid + Grammar 5 Kiosk)

## One-sentence spec (F1)
> When content is submitted on the XIIGen platform, enforce the CF-465 iron
> rule via the SafetyGateToken, run the 8 named safety checks, and update
> the gamification ledger based on the moderation outcome.

## Roles (F3 — `ROLE-ANALYSIS-BATCH-05.md`)
- **anonymous** — report submitter (public report form, no chrome)
- **tenant-user** — content author receiving moderation verdict
- **tenant-admin** — moderator — per-item Keep / Remove / Escalate
- **platform-admin** — cross-tenant policy dashboard + appeal adjudication
- **platform-support** — read-only audit trail

## Grammar split (compound)
- **G5 Kiosk** for anonymous report form (minimal chrome, single primary action)
- **G2 Verdict Grid** for moderator queue (item × safety-check matrix)

## Real-world reference (MARKET-REFERENCE-CATALOG §2 + §5)
- Report form: Trust & Safety public report forms (category tiles + reason textarea + submit)
- Moderator queue: Discord AutoMod, Reddit modqueue, Twitter moderation console
- Appeal adjudication: Facebook Oversight Board, Reddit admin council

## Classification
- **Q1 CRUD?** 🟡 Needs PNG inspection. AiSafetyModerationPage likely renders CRUD default.
- **Q2 Error/empty?** 🟡 Likely — moderator queue without seeded data shows empty state; the queue spec requires a populated demo.
- **Q3 Engineering leak?** 🟡 "CF-465 iron rule" and "SafetyGateToken" in F1 are internal terms — must stay engineering-only.
- **Q4 Role-correct?** ❌ **Likely** — 5 distinct roles but 1 admin page. Anonymous public report form missing (critical — public-facing surface).

**Primary finding:** NEEDS_PURPOSE_BUILT_UI (P0) for the public report form (anonymous) + purpose-built moderator queue (Grammar 2). NEEDS_ROLE_BRANCH (P1).

## 25 existing PNGs
See PNG-INVENTORY FLOW-24 section. Mix of CRUD scaffold, state mocks, and role variants. The anonymous public report form is missing entirely — high-priority surface to build.

## Planned fixes (deferred to post-Batch-H code sweep)

**P0 — Anonymous public report form** at `/report`:
- Grammar 5 Kiosk — no AppShell, minimal header (XIIGen wordmark only)
- Category tile grid (CSAM / violence / harassment / spam / scam / etc.) + reason textarea + submit
- Confirmation screen with case reference number

**P0 — Moderator queue** for tenant-admin:
- Grammar 2 Verdict Grid: per-item row × 8 safety checks
- Per-cell verdict: ✅ PASSED / ❌ FAILED / 🟡 FLAGGED / ⏳ PENDING
- Keep / Remove / Escalate actions inline per row

**P1 — Author's moderation-status page** for tenant-user:
- "Your post was removed because..." with plain-English reason + appeal CTA

**P2 — Platform-admin appeal dashboard** (Grammar 2 Verdict Grid at flow level)

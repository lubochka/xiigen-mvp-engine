---
name: implementation-doc-status
version: "1.0.0"
sk_number: SK-563
priority: MANDATORY
load_order: 9
category: planning
contexts: ["web-session", "claude-code"]
origin: ported from llm_mvp_core/docs/skills/implementation-doc-status-SKILL.md (Universal-Skills refresh, UpdateUniversalSkills)
---

# implementation-doc-status — Part A §4 (status table: what really works now)

> Ported universal standard. The mvp planning library tracked state in STATE.json /
> `flow_name`, but had no §4 human-readable status table as the plan's single source of
> truth for "what actually works / what is a stub". This skill adds that table. TS
> adaptation for this mvp project: one row per NestJS service / React feature / FastAPI
> endpoint; relative `.ts` paths. Note: core's `Bootstrap` status symbol is core_specific
> (a deterministic Confidence=1.0 wrapper awaiting a trained model, under DPO/
> ILearningMachine replacement) and is NOT ported here — for a static wrapper use HARDCODED.

## When to Invoke

- When authoring Part A §4 of any plan that touches code (the status source of truth).
- At phase completion, to refresh which components moved from SKELETON/STUB to COMPLETE.

## §4 — Status table

One row per component. Columns: `Component | File | Status | What actually works now`.

| Status | Meaning | What must be named |
|--------|----------|--------------------------|
| ✅ COMPLETE | implemented in full and working | — |
| ⚠️ PARTIAL | some methods work, others are stubs | list the working AND stub methods by name |
| 🔶 SKELETON | contract/fields preserved, method always returns a stub | what is preserved as contract-fields, what is always a stub |
| ✅ HARDCODED | fixed values / deterministic wrapper | which exact values are fixed |

The column "What actually works now" must name CONCRETE methods/values — not prose.
`"Partially implemented"` with no named methods is BANNED.

### Example §4

| Component | File | Status | What actually works now |
|-----------|------|--------|------------------------------|
| RegisterService | `server/src/registration/register.service.ts` | ⚠️ PARTIAL | `register()` — works (uniqueness + create + enqueue); `resendVerification()` — STUB (returns .failure("NOT_IMPLEMENTED")) |
| InMemoryUserStore | `server/src/registration/in-memory-user-store.ts` | ✅ COMPLETE | `create()`, `findByEmail()` — work on an in-memory Map with tenant-scope |
| useRegistration | `client/src/features/registration/use-registration.ts` | 🔶 SKELETON | the hook returns a fixed `{loading:false}`; submit does not call the API yet |
| /register endpoint | `server/src/registration/register.controller.ts` | ✅ COMPLETE | POST `/register` → delegates to RegisterService, maps .failure → 409/400 |

## Rules

```
□ One row per service/feature/endpoint in the plan's scope.
□ For ⚠️ PARTIAL — list the working AND stub methods by name.
□ For 🔶 SKELETON — what is the contract and what always returns a stub.
□ Relative path (`server/src/...` or `client/src/...`).
□ Uninformative wordings are forbidden ("partially implemented", "in progress").
□ For trainable units — do NOT claim "trained" if only a deterministic
  wrapper exists; such a wrapper is HARDCODED, not COMPLETE (anti-masquerade).
```

## Anti-patterns

- "Partially implemented" with no named methods — FAIL.
- 🔶 SKELETON marked as ✅ COMPLETE — passing a stub off as working logic (masquerade).
- A status table only in STATE.json (machine-readable), without §4 for a human — a violation of the source of truth.
- Using the core symbol `Bootstrap` — it is core_specific; HARDCODED applies here.

## Integration

- Builds on §3 (`implementation-doc-code-refs`) — status reflects what the cited code does now.
- Cross-checks `design-artifact-completeness` C2 (populated vs stub) — a §4 COMPLETE row whose
  C2 check fails is a contradiction to repair.
- Checked by `plan-review` FC-13 (Part A §4 present; working vs stub named, no vague prose).

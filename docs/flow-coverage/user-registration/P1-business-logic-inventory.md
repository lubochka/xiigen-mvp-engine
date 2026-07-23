# FLOW-01 Business Logic Inventory — Phase 1 Deliverable

**Flow:** User Registration and Onboarding (`user-registration`)
**Classification:** TENANT_FACING
**Source:** TOPOLOGY
**Source document:** `contracts/topologies/user-registration.topology.json`

**Topology shape:** 3 nodes, 5 edges. Minimum inventory items: 8.

## Business States & Transitions

1. SSOAndEmailAuth — routing step entered via `POST /auth/register or OAuth callback`
2. EmailVerificationWaitState — processing step entered via `UserRegistrationInitiated event from T47`
3. OnboardingDelivery — orchestration step entered via `EmailVerified event from T48`
4. SSOAndEmailAuth → EmailVerificationWaitState when `registration successful` (emits `xiigen.user-registration.registration-initiated.v1`)
5. SSOAndEmailAuth → ? when `duplicate email or SSO error — terminal` (emits `xiigen.user-registration.registration-failed.v1`) [TERMINAL]
6. EmailVerificationWaitState → OnboardingDelivery when `verification token submitted and valid` (emits `xiigen.user-registration.email-verified.v1`)
7. EmailVerificationWaitState → ? when `24h SLA elapsed — terminal` (emits `xiigen.user-registration.email-verification-expired.v1`) [TERMINAL]
8. OnboardingDelivery → ? when `all onboarding steps complete — triggers FLOW-02` (emits `xiigen.user-registration.onboarding-completed.v1`)

## Arbiter Verdicts

- **Arbiter 1 — Goal Delivery (edge+node formula: 5+3=8):** PASS — 8 items produced.
- **Arbiter 2 — Scope Isolation:** PASS — state descriptions reference nodes/events; no TypeScript types, no file paths, no class names.
- **Arbiter 3 — Terminal State Coverage:** PASS — terminal-labeled edges (condition contains 'terminal') appear as `[TERMINAL]` entries.
- **Arbiter 4 — Iron Rule Labels:** DEFERRED — CF-XX labels require cross-reference with `server/src/engine-contracts/{slug}-bfa-rules.ts`; applied in Phase 9 (edge case discovery) where iron rules directly govern edge cases.
- **Arbiter 5 — Branch Honest Flagging:** PASS (Branch A — no flag required).

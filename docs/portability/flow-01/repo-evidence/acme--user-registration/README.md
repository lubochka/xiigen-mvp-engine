# acme--user-registration

> **Tenant fork of `@xiigen/user-registration` (FLOW-01) for tenant `acme-pro-members`.**

This repository is the **R2 fork-with-code artifact** for FLOW-01 under the tenant
`acme-pro-members`. It satisfies the portability protocol's repo naming convention
(`{tenantId}--{moduleName}` with double-dash separator, per
`docs/portability/FLOW-PORTABILITY-TEST-PROTOCOL-v2.0.md` §REPO NAMING CONVENTION
line 744) and the V-14 evidence gate (line 1023 — "2 PNGs per repo: overview + tree").

## Provenance

| Field | Value |
|---|---|
| Source flow | `@xiigen/user-registration` v1.0.0 (platform-source) |
| Tenant | `acme-pro-members` |
| Adaptation category | `freedom-config` (no MACHINE invariants modified) |
| Published version | `acme-pro-members/user-registration v1.0.1` |
| Adaptation date | 2026-04-22 |
| Adaptation method | XIIGen AI Adaptation Cycle Phases 1–4 (`docs/portability/flow-01/adaptation-plan-freedom-config-user-registration.md`) |
| Verification contract | `server/test/user-registration/phase-01-adaptation-freedom-config.spec.ts` (all FC-ADAPT-1..5 PASS) |

## What's different from platform source

This fork applies **4 FREEDOM-config overrides** documented in
`tenant.config.json`. **Zero MACHINE invariants are modified** — event names,
task-type IDs, schema, idempotency keys, and outbox ordering are byte-identical
to the source.

| FREEDOM key | Default | Acme value | Where it takes effect |
|---|---|---|---|
| `flow01_invitation_inviter_name` | `The XIIGen Team` | `The Acme Pro Team` | Invitation EMAIL body (server-side only) |
| `flow01_invitation_community_name` | `XIIGen Community` | `Acme Pro Members` | Invitation EMAIL body (server-side only) |
| `flow01_email_verification_ttl_seconds` | `86400` (24h) | `3600` (1h) | `EmailVerificationService.getTokenExpiryMs` (server-side only) |
| `flow01_resend_rate_limit_minutes` | `60` | `15` | `EmailVerificationService.getResendLimitMinutes` (server-side only) |

**No client-side delta** — all 4 overrides are server-side-only. The 6 FLOW-01
client kiosk pages (`/register`, `/register/pending-verification`, `/verify`,
`/verify/resend`, `/onboarding`, `/auth/sso/google`) render byte-identically
between platform-source and this fork. See
`docs/portability/flow-01/V-15-DRIFT-PASS-CONTRACT.md` for the formal contract.

## Repository contents

```
acme--user-registration/
├── README.md                              ← this file
├── package.json                           ← @xiigen/user-registration tenant manifest (publisher: acme-pro-members)
├── tenant.config.json                     ← acme FREEDOM overrides (mirror of tenant-profile-acme-pro-members.json)
├── .gitignore                             ← node_modules / dist exclusions
├── registration.service.ts                ← T47 RegistrationService (verbatim from source)
├── email-verification.service.ts          ← T48 EmailVerificationService (verbatim from source)
└── onboarding-delivery.service.ts         ← T49 OnboardingDeliveryService (verbatim from source)
```

## Behavioural separation evidence

Tenant separation is proven independently from visual evidence via the Layer 1
server test:
```
server/test/user-registration/phase-01-adaptation-freedom-config.spec.ts
```
This test asserts that each acme override key returns the acme value (not the
default) when `ScopeContext.tenantId === 'acme-pro-members'`, and the default
otherwise. See test results in `FLOW-01-PORTABILITY-STATE.json` Phase B layer-1
verdict (193 tests PASS, 4 acme override verifications PASS).

## Installation

```bash
npm install @acme-pro-members/user-registration@1.0.1
# OR (after marketplace install)
xiigen marketplace install user-registration --tenant acme-pro-members --version v1.0.1
```

## Cascade tier

This fork is **cascade row 4** of the FLOW-01 portability test protocol:
- Row 1 → platform-source (V-13 instance A — PASS)
- Row 2 → tenant-a-adapted (V-13 instance B — PASS, 2026-04-25)
- Row 3 → tenant-a-marketplace (V-14 instance A first half — this row)
- **Row 4 → tenant-a-repo (V-14 instance A second half — this README is the artifact)**

## License

Inherits from platform source (`@xiigen/user-registration`). MACHINE invariants
non-modifiable per FLOW-01 portability constitution; FREEDOM-config overrides
are tenant-permitted under the v2.0 protocol §AI ADAPTATION lines 871-989.

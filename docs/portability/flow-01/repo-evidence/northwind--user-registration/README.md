# northwind--user-registration

> **Tenant fork of `@acme-pro-members/user-registration` (FLOW-01) for tenant `northwind-guild`.**

This repository is the **R2 fork-with-code artifact** for FLOW-01 under the tenant
`northwind-guild`. It satisfies the portability protocol's repo naming convention
(`{tenantId}--{moduleName}` with double-dash separator, per
`docs/portability/FLOW-PORTABILITY-TEST-PROTOCOL-v2.0.md` §REPO NAMING CONVENTION
line 744) and the V-14 evidence gate (line 1023 — "2 PNGs per repo: overview + tree").

## Provenance

| Field | Value |
|---|---|
| Source flow | `@acme-pro-members/user-registration` v1.0.1 (cascade parent) |
| Ultimate root | `@xiigen/user-registration` v1.0.0 (platform-source) |
| Tenant | `northwind-guild` |
| Adaptation category | `freedom-config` (no MACHINE invariants modified) |
| Published version | `northwind-guild/user-registration v1.0.2` |
| Adaptation date | 2026-04-25 |
| Adaptation method | XIIGen AI Adaptation Cycle Phases 1–4 (`docs/portability/flow-01/adaptation-plan-freedom-config-user-registration.md`) |
| Verification contract | `server/test/user-registration/phase-01-adaptation-freedom-config.spec.ts` (all FC-ADAPT-1..5 PASS) |

## Cascade lineage

```
@xiigen/user-registration v1.0.0 (platform)
        │
        │  acme adapts: 4 FREEDOM overrides
        ▼
@acme-pro-members/user-registration v1.0.1
        │
        │  northwind installs unchanged (cascade row 5),
        │  then forks: 1 further override on top of acme
        ▼
@northwind-guild/user-registration v1.0.2  (THIS REPO)
```

## What's different from the cascade parent (acme v1.0.1)

This fork applies **1 own override** on top of acme's 4. The 3 acme overrides
that touch user-facing copy (inviter_name, community_name) and abuse-protection
(token TTL) are **inherited unchanged** because northwind operates as a
shared-onboarding consortium under the acme parent program.

| FREEDOM key | Default | Acme value | Northwind value | Source | Where it takes effect |
|---|---|---|---|---|---|
| `flow01_resend_rate_limit_minutes` | `60` | `15` | **`5`** ⬇ | northwind own | `EmailVerificationService.getResendLimitMinutes` (server-side only) |
| `flow01_invitation_inviter_name` | `The XIIGen Team` | `The Acme Pro Team` | `The Acme Pro Team` | inherited from acme | Invitation EMAIL body (server-side only) |
| `flow01_invitation_community_name` | `XIIGen Community` | `Acme Pro Members` | `Acme Pro Members` | inherited from acme | Invitation EMAIL body (server-side only) |
| `flow01_email_verification_ttl_seconds` | `86400` (24h) | `3600` (1h) | `3600` (1h) | inherited from acme | `EmailVerificationService.getTokenExpiryMs` (server-side only) |

**Northwind's only adaptation:** `flow01_resend_rate_limit_minutes` further
tightened from acme's 15 minutes down to 5 minutes. Northwind operates a tightly
moderated guild and chose this stricter cap to reduce noise from spam-driven
retries; legitimate users almost never need to resend more than once per session.

**Zero MACHINE invariants modified** — event names, task-type IDs (T47-T49),
schema, idempotency keys, outbox ordering, token hashing, and VALIDATION_FAILURE
shape are byte-identical to acme v1.0.1 (which is byte-identical to platform v1.0.0).

**No client-side delta** — the rate_limit tightening is a server-side rate-limit
only, invocation lives at `EmailVerificationService.getResendLimitMinutes` and
never appears on any of the 6 FLOW-01 client kiosk pages. The 3 inherited acme
overrides are also server-side-only. All 6 pages render byte-identically between
platform-source, acme v1.0.1, and this fork. See
`docs/portability/flow-01/V-15-DRIFT-PASS-CONTRACT.md` for the formal contract.

## Repository contents

```
northwind--user-registration/
├── README.md                              ← this file
├── package.json                           ← @northwind-guild/user-registration tenant manifest
├── tenant.config.json                     ← 1 own + 3 inherited overrides (mirror of tenant-profile-northwind-guild.json)
├── .gitignore                             ← node_modules / dist exclusions
├── registration.service.ts                ← T47 RegistrationService (verbatim from acme = verbatim from platform)
├── email-verification.service.ts          ← T48 EmailVerificationService (verbatim — see note below)
└── onboarding-delivery.service.ts         ← T49 OnboardingDeliveryService (verbatim — see note below)
```

**Note on EmailVerificationService:** The service code is byte-identical to
acme/platform. The rate_limit tightening (15→5) is expressed entirely as data
in `tenant.config.json` and resolved at runtime through
`IFreedomConfigService.get('flow01_resend_rate_limit_minutes')` within
`EmailVerificationService.getResendLimitMinutes`. No code change is needed —
this is the FREEDOM-config Rule 14 (Config Over Code) in action.

## Behavioural separation evidence

Tenant separation is proven independently from visual evidence via the Layer 1
server test:
```
server/test/user-registration/phase-01-adaptation-freedom-config.spec.ts
```
This test asserts that each northwind override key returns the northwind value
(rate_limit=5; inherited acme values for the other 3) when
`ScopeContext.tenantId === 'northwind-guild'`, and the default otherwise.
See test results in `FLOW-01-PORTABILITY-STATE.json` Phase B layer-1
verdict (193 tests PASS, 1 northwind override + 3 inherited verifications PASS).

## Installation

```bash
npm install @northwind-guild/user-registration@1.0.2
# OR (after marketplace install)
xiigen marketplace install user-registration --tenant northwind-guild --version v1.0.2
```

## Cascade tier

This fork is **cascade row 7** of the FLOW-01 portability test protocol:
- Row 1 → platform-source (V-13 instance A — PASS)
- Row 4 → tenant-a-repo `acme--user-registration` (V-14 instance A — PASS)
- Row 5 → tenant-b-installed (V-13 instance C — PASS, northwind installed acme v1.0.1 unchanged)
- Row 6 → tenant-b-marketplace (V-14 instance B first half — paired with row 7)
- **Row 7 → tenant-b-repo `northwind--user-registration` (V-14 instance B second half — this README is the artifact)**

## License

Inherits from acme-pro-members v1.0.1 (which inherits from `@xiigen/user-registration`).
MACHINE invariants non-modifiable per FLOW-01 portability constitution; FREEDOM-config
overrides are tenant-permitted under the v2.0 protocol §AI ADAPTATION lines 871-989.

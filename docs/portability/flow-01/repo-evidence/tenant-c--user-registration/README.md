# tenant-c--user-registration

> **Tenant fork of `@xiigen/user-registration` (FLOW-01) for tenant `tessera-collective`.**
> **Third-party tenant — NOT in the acme→northwind cascade chain.**

This repository is the **R2 fork-with-code artifact** for FLOW-01 under the tenant
`tessera-collective`. It satisfies the portability protocol's repo naming
convention (`{tenantId}--{moduleName}` with double-dash separator, per
`docs/portability/FLOW-PORTABILITY-TEST-PROTOCOL-v2.0.md` §REPO NAMING CONVENTION
line 744) and the V-14 evidence gate (line 1023 — "2 PNGs per repo: overview + tree").

**Slug provenance:** the directory name uses `tenant-c--user-registration`
(matching the protocol's row 9 `repoSlug`). The tenant identifier itself is
`tessera-collective`; the `tenant-c` prefix in the directory name reflects
the cascade-row position (third tenant introduced for V-13(D) Phase 5c
cross-tenant separation confirmation).

## Provenance

| Field | Value |
|---|---|
| Source flow | `@xiigen/user-registration` v1.0.0 (platform-source — direct, no cascade hop) |
| Ultimate root | `@xiigen/user-registration` v1.0.0 (platform-source) |
| Tenant | `tessera-collective` |
| Adaptation category | `no-adaptation-third-party-tenant` (zero FREEDOM overrides applied) |
| Published version | `tessera-collective/user-registration v1.0.1` |
| Adaptation date | 2026-04-25 |
| Adaptation method | Fresh root install — no FREEDOM overrides applied; tenant exists for V-13(D) Phase 5c third-party tenant separation confirmation |
| Verification contract | `server/test/user-registration/phase-01-adaptation-freedom-config.spec.ts` (FC-ADAPT-1 default-fallback case covers tessera by construction) |

## Cascade lineage

```
@xiigen/user-registration v1.0.0 (platform)
        │
        │  tessera installs DIRECTLY (no acme/northwind hops)
        │  ZERO FREEDOM overrides applied
        ▼
@tessera-collective/user-registration v1.0.1  (THIS REPO)
```

**Key distinction from acme/northwind repos:** Tessera is a **third-party
tenant** outside the acme→northwind cascade. The other two cascade-fork
repos (acme--user-registration v1.0.1, northwind--user-registration v1.0.2)
sit in a chain. Tessera deliberately does not — they install fresh from
platform-source with no inherited customisation. This proves the
cascade-coherence claim extends BEYOND a single chain: any tenant can install
FLOW-01 cleanly.

## What's different from the platform baseline

**Nothing.** Tessera applies zero FREEDOM overrides. Their tenant context
returns the platform v1.0.0 defaults (`rate_limit=60`, `ttl=86400`,
`inviter='you'`, `community='our community'`) under their AsyncLocalStorage
scope.

| FREEDOM key | Platform default | Tessera value | Source | Where it takes effect |
|---|---|---|---|---|
| `flow01_resend_rate_limit_minutes` | `60` | `60` (default) | platform | `EmailVerificationService.getResendLimitMinutes` (server-side only) |
| `flow01_invitation_inviter_name` | `you` | `you` (default) | platform | Invitation EMAIL body (server-side only) |
| `flow01_invitation_community_name` | `our community` | `our community` (default) | platform | Invitation EMAIL body (server-side only) |
| `flow01_email_verification_ttl_seconds` | `86400` (24h) | `86400` (default) | platform | `EmailVerificationService.getTokenExpiryMs` (server-side only) |

**Zero MACHINE invariants modified** — event names, task-type IDs (T47-T49),
schema, idempotency keys, outbox ordering, token hashing, and VALIDATION_FAILURE
shape are byte-identical to platform v1.0.0.

**No client-side delta** — every FLOW-01 client kiosk page renders byte-identically
to the platform-source baseline. The 252-PNG capture at
`docs/e2e-snapshots/user-registration/tenant-c-tessera-v1.0.1/` confirms
0 px drift against both `platform-source/` and `tenant-a-acme-v1.0.1/` (transitive
byte-equality holds because tessera defaults match platform AND acme captured
byte-identical to platform under the V-15 contract premise).

See `docs/portability/flow-01/V-15-DRIFT-PASS-CONTRACT.md` for the formal contract.

## Repository contents

```
tenant-c--user-registration/
├── README.md                              ← this file
├── package.json                           ← @tessera-collective/user-registration tenant manifest
├── tenant.config.json                     ← empty overrides {} (mirror of tenant-profile-tessera-collective.json)
├── .gitignore                             ← node_modules / dist exclusions
├── registration.service.ts                ← T47 RegistrationService (verbatim from platform)
├── email-verification.service.ts          ← T48 EmailVerificationService (verbatim from platform)
└── onboarding-delivery.service.ts         ← T49 OnboardingDeliveryService (verbatim from platform)
```

**Note on service files:** Identical bytes to acme/northwind/platform (the
service code never changes; only `tenant.config.json` differs across forks
because all 4 FLOW-01 FREEDOM keys are resolved at runtime through
`IFreedomConfigService.get(...)` within the tenant's AsyncLocalStorage scope).
This is FREEDOM-config Rule 14 (Config Over Code) in action — the
adaptation lives entirely in data, not code.

## Behavioural separation evidence

Tenant separation is proven independently from visual evidence via the Layer 1
server test:
```
server/test/user-registration/phase-01-adaptation-freedom-config.spec.ts
```
The FC-ADAPT-1 test class asserts that for any tenant outside the
acme→northwind cascade (which includes tessera-collective by construction),
the FREEDOM keys return the platform v1.0.0 defaults. This is the same
isolation claim used for V-16 cross-tenant JWT isolation tests at Phase C9.

## Installation

```bash
npm install @tessera-collective/user-registration@1.0.1
# OR (after marketplace install)
xiigen marketplace install user-registration --tenant tessera-collective --version v1.0.1
```

## Cascade tier

This fork is **cascade row 9** of the FLOW-01 portability test protocol:
- Row 1 → platform-source (V-13 instance A — PASS)
- Row 4 → tenant-a-repo `acme--user-registration` (V-14 instance A — PASS)
- Row 5 → tenant-b-installed (V-13 instance C — PASS, northwind installed acme v1.0.1 unchanged)
- Row 6 → tenant-b-adapted v1.0.2 (V-15 instance B — PASS, drift = 0 px vs row 5)
- Row 7 → tenant-b-repo `northwind--user-registration` (V-14 instance B — PASS)
- Row 8 → tenant-c-installed `tenant-c-tessera-v1.0.1` (V-13 instance D — PASS, drift = 0 px vs platform AND vs tenant-a)
- **Row 9 → tenant-c-repo `tenant-c--user-registration` (V-14 instance C — this README is the artifact)**

## License

Inherits from `@xiigen/user-registration` v1.0.0 (platform).
MACHINE invariants non-modifiable per FLOW-01 portability constitution; FREEDOM-config
overrides are tenant-permitted under the v2.0 protocol §AI ADAPTATION lines 871-989.
Tessera elects not to override any keys at v1.0.1 — that is the entire
adaptation contract for this repo.

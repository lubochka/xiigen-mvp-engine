# FLOW-01 FREEDOM-Config Adaptation Plan

**Flow**: FLOW-01 User Registration & Onboarding
**Adaptation category**: FREEDOM-config adaptation (FREEDOM-key value change, no code modification)
**Protocol**: FLOW-PORTABILITY-TEST-PROTOCOL-v1.0 — propose phase
**Sub-tenant**: acme-pro-members (synthetic test tenant)
**Date**: 2026-04-22
**Prepared by**: architect-mode

---

## 1. Adaptation intent

Demonstrate that a tenant forking FLOW-01 can rebrand the community invitation
experience, shorten verification TTL, and tighten resend rate-limits for their
own user base **without** modifying any MACHINE logic (no source code change,
no redeployment of service binaries).

This is the simplest, highest-leverage FREEDOM-config adaptation in the catalog:
four keys, all read by FreedomConfigService at runtime, all already wired through
the tenant-scoped FREEDOM layer (DNA-5).

## 2. Adaptation categories in XIIGen (naming reference)

The adaptation catalog distinguishes four categories per flow. FLOW-01's
adaptation surface uses the following:

| Category | Description | FLOW-01 status |
|---|---|---|
| **FREEDOM-config adaptation** | Tenant changes a named FREEDOM config key value | **7 keys, active** |
| **Grammar adaptation** | Tenant extends or alters a DSL operator set | N/A (FLOW-01 has no DSL surface) |
| **Role-scope adaptation** | Tenant modifies role/permission visibility matrix | Pending GAP-11 Guard 4 |
| **Business-domain adaptation** | Tenant overrides a flow-specific edge case | 3 edge cases, parameter-driven |

This plan scopes only **FREEDOM-config adaptation**. Other categories will be
demonstrated in separate plans.

## 3. Adaptation surface targets

| FREEDOM key | From (default) | To (acme-pro-members override) |
|---|---|---|
| `flow01_invitation_inviter_name` | `The XIIGen Team` | `The Acme Pro Team` |
| `flow01_invitation_community_name` | `XIIGen Community` | `Acme Pro Members` |
| `flow01_email_verification_ttl_seconds` | `86400` (24h) | `3600` (1h — stricter security profile) |
| `flow01_resend_rate_limit_minutes` | `60` | `15` (friendlier to legitimate users) |

Four keys, four independent changes, four different stakeholder decisions.
The test covers the full range of FREEDOM-config adaptations a typical tenant
will make.

## 4. MACHINE constraints that must NOT change

Per `adaptation-surface-user-registration.json` §ironRulesMACHINE:

- Event names: `AccountCreated`, `VerificationEmailRequested`, `VerificationCompleted`, `OnboardingCompleted`
- Task-type identifiers: T47, T48, T49
- User record schema (including `onboarding_materials: []`)
- Material type string literals (`workspace_setup`, `flow_tutorial`, `community_invitation`)
- Token hashing (sha256)
- Outbox pattern (storeDocument before enqueue)
- Uniform VALIDATION_FAILURE error shape

No MACHINE iron rule may be weakened by this adaptation. If the adaptation
accidentally affects a MACHINE element, the apply-and-verify phase must fail.

## 5. Adaptation mechanism

Per DNA-5 + DNA-2, FLOW-01 reads FREEDOM values through `IFreedomConfigService.get(key)`
which resolves the tenant scope from AsyncLocalStorage automatically. A tenant-scoped
override is set by writing to the `xiigen-freedom-config` index with the tenant's ID.

### Configuration change applied in the apply-and-verify phase

Tenant `acme-pro-members` FREEDOM config seed:

```json
{
  "tenant_id": "acme-pro-members",
  "overrides": {
    "flow01_invitation_inviter_name": "The Acme Pro Team",
    "flow01_invitation_community_name": "Acme Pro Members",
    "flow01_email_verification_ttl_seconds": 3600,
    "flow01_resend_rate_limit_minutes": 15
  }
}
```

**Zero source-code changes. Zero rebuild. Zero redeployment.** Adaptation is data-only.

## 6. Expected test outcomes after adaptation is applied

1. **Existing 193 unit tests pass** — adaptation is FREEDOM-only, no MACHINE change.
2. **Tenant isolation test TI-4 proves new values are read** — phase-01-tenant-isolation.spec.ts
   already verifies tenant-scoped FREEDOM reads; the acme-pro-members tenant receives
   15-minute rate-limit messages instead of 60-minute.
3. **New freedom-config verification test** (added during apply-and-verify): exercise
   T49 `deliverInvitation` under acme-pro-members tenant context, assert the stored
   delivery record's `social_params.inviterName === 'The Acme Pro Team'` and
   `social_params.communityName === 'Acme Pro Members'`.
4. **Token TTL test**: exercise T48 `initiateVerification` under acme-pro-members,
   assert the scheduler is invoked with `3600000` ms (1 hour in ms).

If any MACHINE iron rule appears to have changed (event name, task-ID, schema,
hashing, outbox ordering, uniform-failure shape): FAIL. Revert adaptation.
The FREEDOM surface is a controlled blast radius — it cannot touch MACHINE.

## 7. Acceptance criteria for promotion to the package-and-distribute phase

- All 193 existing Layer 1 tests pass
- New freedom-config-verification tests pass (one per keypair tested, ≥ 4 assertions)
- 0 TypeScript errors
- 0 MACHINE rule violations in DNA scan
- Tenant-A (default values) + acme-pro-members (override values) pass side-by-side

## 8. Out of scope for this adaptation

- **Grammar adaptation**: FLOW-01 has no DSL surface (see
  adaptation-surface-user-registration.json §grammarAdaptation)
- **Role-scope adaptation**: ViewerRole extraction is GAP-11 Guard 4 work,
  still pending Tier 2 code session
- **Business-domain adaptation**: SSO bypass, invite-code gating, failure-shape
  variance — future separate plans

## 9. Traceability

- **Protocol**: FLOW-PORTABILITY-TEST-PROTOCOL-v1.0, propose phase
- **Surface catalog**: docs/portability/flow-01/adaptation-surface-user-registration.json
- **Invariants source**: docs/sessions/FLOW-01/FLOW-01-STEP-1-INVARIANTS.md
- **Fix Plan v4.9**: AI Adaptation Simulation Protocol — FREEDOM-config adaptation phase
- **Integration round**: plan file A78 Tier 2 continuation

## 10. Ready for the apply-and-verify phase

This plan is complete. Apply-and-verify may proceed.

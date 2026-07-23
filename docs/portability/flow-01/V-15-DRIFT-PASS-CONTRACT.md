# V-15 Drift PASS Contract — FLOW-01 user-registration

**Authoring date:** 2026-04-25
**Author:** architect-mode / vigorous-margulis (DEV-115)
**Protocol:** FLOW-PORTABILITY-TEST-PROTOCOL-v2.0 § Phase C V-13 + V-15
**Status:** ACTIVE — applies to V-13 instances B/C/D and V-15 instances A/B/C

---

## What V-15 normally requires

The Portability Protocol's V-15 gate audits **drift** — the visual delta between
two cascade points of the same flow. The standard model assumes:

1. Platform-source (instance A) is the canonical baseline.
2. Each tenant adaptation (instances B/C/D) renders the same client UI but with
   tenant-specific text/branding/theming overrides.
3. V-15 compares baseline vs tenant per-PNG and asserts:
   - either **drift detected** → CONCERN/BLOCK with diff explanation, or
   - **drift expected** → PASS with explicit override evidence.

For most flows this means tenant-specific strings appear *somewhere* in the 252
PNGs (community name in headers, brand color on buttons, custom rate-limit copy).

---

## Why FLOW-01 cannot fit that model — and what we use instead

FLOW-01's adaptation surface is **server-side only**. The complete enumeration
of FREEDOM keys (`docs/portability/flow-01/adaptation-surface-user-registration.json`)
contains 7 keys, and **none of them is ever rendered on any of the 6 client pages**
that the V-13 252-PNG matrix captures.

| Acme override key | Default | Acme value | Where rendered? |
|---|---|---|---|
| `flow01_resend_rate_limit_minutes` | 60 | 15 | Server-side only — `EmailVerificationService.getResendLimitMinutes` |
| `flow01_email_verification_ttl_seconds` | 86400 | 3600 | Server-side only — `EmailVerificationService.getTokenExpiryMs` |
| `flow01_invitation_inviter_name` | "The XIIGen Team" | "The Acme Pro Team" | Invitation EMAIL body only — `OnboardingDeliveryService.deliverInvitation` |
| `flow01_invitation_community_name` | "XIIGen Community" | "Acme Pro Members" | Invitation EMAIL body only — `OnboardingDeliveryService.deliverInvitation` |

The 6 FLOW-01 client pages — `RegistrationPage`, `RegistrationPendingPage`,
`VerifyTokenPage`, `ResendPage`, `OnboardingPage`, `SsoPage` — each render the
flow's *transactional kiosk* (form, status, redirect signposts). None of them
embeds the resend-rate-limit number, the TTL, the inviter name, or the community
name. The invitation that DOES carry tenant branding is an SMTP email payload,
not a webview.

Therefore at the standard mock URLs that the 252-PNG matrix exercises:

```
/register, /register/pending-verification, /verify?token=…,
/verify/resend, /onboarding?userId=…, /auth/sso/google
```

**the visible UI delta between platform-source and any tenant-* instance is
exactly zero pixels** — and that zero delta is the correct behaviour, not a bug.

---

## Drift PASS contract (the rule that applies to V-13 B/C/D and V-15 A/B/C)

> **For FLOW-01, "pixel-identical capture between platform-source and any
> tenant-* instance" is the V-15 PASS criterion, not the V-15 BLOCK criterion.**

The contract has three components:

### Component 1 — Pixel identity is the expected outcome

Every tenant cascade run (`XIIGEN_VISUAL_TARGET=tenant-a-acme-v1.0.1`,
`tenant-b-northwind-installed-v1.0.1`, `tenant-b-northwind-v1.0.2`, or
`tenant-c-tessera-v1.0.1`) is expected to produce 252 PNGs
that are byte-equivalent (or visually indistinguishable, modulo non-deterministic
font hinting) to the corresponding platform-source PNGs.

Any drift larger than ~0.1% on any PNG is a CONCERN and must be explained — most
likely it indicates that a server-side override leaked into the client rendering
path, which would itself be a Rule 14 (Config-over-Code) violation.

### Component 2 — Behavioural separation is proven independently

Because the 252-PNG matrix cannot prove tenant separation (there is no visible
delta to compare), behavioural separation is proven via a dedicated server-side
test:

```
server/test/user-registration/phase-01-adaptation-freedom-config.spec.ts
```

This test asserts that:
- Each acme override key returns the acme value, not the default, when the
  tenant context is `acme-pro-members`.
- Each non-tenant context still returns the default.
- Tenant separation is enforced at the FREEDOM lookup boundary, not at the UI.

This test is the contractual replacement for visual drift evidence on FLOW-01.

### Component 3 — Audit trail must explicitly invoke this contract

When SK-549 audits any FLOW-01 tenant cascade instance (B/C/D), the resulting
`SK549-COVERAGE-{target}.json` and corresponding `FC-18-AUDIT-TRAIL` document
must:

1. State "expected drift = 0 pixels" up front.
2. Reference this contract document by path.
3. Cite the existing `phase-01-adaptation-freedom-config.spec.ts` server test
   as the behavioural-separation evidence.
4. Treat any non-zero drift as a CONCERN, not a PASS — non-zero drift would
   contradict the contract.

---

## Precedent — FLOW-03 model

This pattern is not novel for FLOW-01. **FLOW-03 (`event-management`) follows
the same model** — its FREEDOM keys (event-rsvp window, capacity defaults) are
server-evaluated and never appear on client kiosks. FLOW-03's V-15 closure used
the same "pixel identity expected; behaviour proven via server test" framing.

See `docs/portability/flow-03/V-15-DRIFT-PASS-CONTRACT.md` (if/when authored) and
`client/e2e/event-management-tenant-isolation.spec.ts` for the parallel client
spec pattern.

---

## When this contract does NOT apply

The contract is FLOW-01-specific. It applies because the FLOW-01 adaptation
surface is 100% server-side. If a future FLOW-01 enhancement adds a
client-rendered FREEDOM key (e.g. a tenant-branded "Welcome to {communityName}"
banner on `/onboarding`), this contract MUST be revised: the new key would need
its own per-PNG drift expectation, and the corresponding cells in the 252-PNG
matrix would need to be flagged as drift-bearing.

A trigger for revision is documented in `docs/portability/flow-01/CASCADE-PLAN.md`
under "FREEDOM key surface change protocol".

---

## Acceptance scoring

V-15 instance scoring under this contract:

| Drift outcome | Standard V-15 | FLOW-01 V-15 (this contract) |
|---|---|---|
| 0 pixels delta on every PNG | BLOCK (no override evidence) | **PASS** |
| <0.1% delta on some PNGs (font hinting only) | PASS | PASS |
| >0.1% delta on any PNG | PASS (override expected) | **CONCERN — investigate leak** |
| Backing server test missing or failing | PASS | **BLOCK** |

Auditors must apply the right-hand column when reviewing FLOW-01 cascade
instances, and explicitly state this in the verdict notes.

---

## Sign-off

This contract is referenced from:
- `client/e2e/flow-01-visual.spec.ts` (header docstring)
- `docs/portability/flow-01/FLOW-01-PORTABILITY-STATE.json` (V-15 instance entries)
- Per-tenant SK549-COVERAGE-{target}.json artifacts (instance B/C/D verdict notes)

Frozen for branch `claude/vigorous-margulis` / DEV-115.

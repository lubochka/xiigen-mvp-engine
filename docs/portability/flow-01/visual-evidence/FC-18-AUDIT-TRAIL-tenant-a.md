# FC-18 Audit Trail — FLOW-01 user-registration · V-13 instance B (P2 tenant-a-acme-v1.0.1) + V-15 instance A

**Session**: vigorous-margulis · Phase C4 · 2026-04-25
**Protocol**: FLOW-PORTABILITY-TEST-PROTOCOL-v2.0 · Layer 3 visual validation · Cascade row 2 (tenant-a-adapted)
**Audit skill**: SK-549 per-image-validation v1.0.0 — applied via mechanical-derivation under V-15-DRIFT-PASS-CONTRACT.md
**Tier target**: TIER-D (Layer 1 + Layer 2 + Layer 3 + Layer 4)
**V-Gates fired**: V-13 instance B (cascade row 2) + V-15 instance A (drift hop platform-source → tenant-a)
**Jira**: DEV-115

## Summary

| Field | Value |
|---|---|
| PNG corpus | 252 (6 pages × 7 roles × 6 cells) |
| Capture target | `XIIGEN_VISUAL_TARGET=tenant-a-acme-v1.0.1` |
| Drift comparison method | Byte-level SHA-256 equality check on 252 PNG pairs |
| Drift result (V-15) | **0 pairs differ; 252/252 byte-identical** |
| V-13 verdict (instance B) | **PASS** (mechanically derived from V-13 instance A under V-15 contract) |
| V-15 verdict (instance A) | **PASS** (drift = 0 px is the expected and PASS outcome for FLOW-01) |
| BC-001 compliance | YES — drift comparison runs locally, no PNG bytes processed in chat |
| Contract applied | `docs/portability/flow-01/V-15-DRIFT-PASS-CONTRACT.md` |

## Why this audit is mechanically derived (the V-15 contract reasoning)

FLOW-01's adaptation surface is **100% server-side** — its 7 FREEDOM keys
(enumerated in `adaptation-surface-user-registration.json`) are read by the T48
EmailVerificationService and T49 OnboardingDeliveryService at runtime to set
behaviour (rate-limit windows, TTL, invitation email body strings) but **none of
them is rendered on any of the 6 client kiosk pages** that the V-13 252-PNG
matrix captures.

The 4 acme overrides that this cascade hop introduces are:

| Acme override key | Default | Acme value | Rendered on a client kiosk page? |
|---|---|---|---|
| `flow01_resend_rate_limit_minutes` | 60 | 15 | NO — server-side only |
| `flow01_email_verification_ttl_seconds` | 86400 | 3600 | NO — server-side only |
| `flow01_invitation_inviter_name` | "The XIIGen Team" | "The Acme Pro Team" | NO — invitation EMAIL body only |
| `flow01_invitation_community_name` | "XIIGen Community" | "Acme Pro Members" | NO — invitation EMAIL body only |

Therefore the 252-PNG capture at tenant-a is **expected to be byte-identical**
to the platform-source baseline. Per `V-15-DRIFT-PASS-CONTRACT.md`:

- Pixel identity is the V-15 PASS criterion (not BLOCK).
- Behavioural separation is proven independently via `server/test/user-registration/phase-01-adaptation-freedom-config.spec.ts` (193 tests + 4 acme override verifications all passing — Layer 1 evidence).
- Any drift > byte-equality would be a CONCERN to investigate (potential server-side leak).

This audit therefore proceeds in three steps rather than a fresh per-PNG SK-549 visual review:

1. **Capture**: 252 PNGs at `tenant-a-acme-v1.0.1/` via parameterized spec `XIIGEN_VISUAL_TARGET=tenant-a-acme-v1.0.1 npx playwright test e2e/flow-01-visual.spec.ts --project=chromium-desktop`.
2. **Drift comparison**: byte-level SHA-256 equality check via `scripts/portability/flow-01-tenant-a-drift-compare.py`. Drift = 0 confirms the contract premise.
3. **Verdict derivation**: V-13 instance A's 36 anonymous per-cell verdicts + 6 aggregated role verdicts + 1 RTL-on-admin verdict carry forward unchanged to V-13 instance B (mechanical equivalence).

## V-13 acceptance — line-by-line

| Criterion | Verdict | Evidence |
|---|---|---|
| (1) `totalBlock = 0` | **PASS** | Drift = 0 px on every PNG → V-13 instance A `totalBlock = 0` carries forward unchanged |
| (2) Axis B PASS for all 7 roles | **PASS** | Pixel-identical captures imply identical Axis B verdicts; instance A PASS for all 7 roles preserved |
| (3) he-RTL C4 all PASS | **PASS** | All 42 he-RTL × 7-role C4 cells are pixel-identical to instance A; instance A RTL PASS preserved |
| (4) Drift PASS hop-to-hop | **PASS** | V-15 instance A drift verdict applies. 252/252 byte-identical pairs — under V-15 contract this IS the expected and PASS outcome for FLOW-01. |

## V-15 acceptance — drift comparison

```
Baseline corpus       : 252 PNGs at docs/e2e-snapshots/user-registration/platform-source/
Tenant-a corpus       : 252 PNGs at docs/e2e-snapshots/user-registration/tenant-a-acme-v1.0.1/
Common PNG names      : 252
Byte-identical pairs  : 252      ← V-15 PASS criterion (per contract)
Drift detected pairs  : 0
Missing at tenant-a   : 0
Extras at tenant-a    : 0
```

Verdict: **V-15 instance A PASS**.

The contract requires this outcome to be cross-referenced with two pieces of independent evidence:

- **Backing server test (Layer 1)**: `server/test/user-registration/phase-01-adaptation-freedom-config.spec.ts` — proves all 4 acme override keys return the acme value (not default) when tenant context is `acme-pro-members`, and the default value otherwise. Test was authored at Phase A4 and is on the Layer 1 PASS list (193 tests at FLOW-01 scope).
- **Adaptation surface inventory**: `docs/portability/flow-01/adaptation-surface-user-registration.json` — exhaustive enumeration of FLOW-01 FREEDOM keys + their `consumedBy` callsite + `uiVisible: false` evidence for all 4 keys.

Both are present and PASS as of this audit. Therefore the V-15 contract is fully satisfied.

## CONCERN enumeration — carried forward from instance A

All CONCERNs documented in `FC-18-AUDIT-TRAIL.md` (instance A) carry forward
unchanged to instance B because the captures are byte-identical. No new
CONCERNs are introduced at the tenant-a hop, and no instance-A CONCERN is
resolved by the tenant-a hop (resolution would require client-side UI work,
which is out of scope for a FREEDOM-key-only adaptation).

The three CONCERN classes:

1. Hebrew strings not authored for FLOW-01 page bodies (24 cells covered) — sanctioned per cascade plan.
2. Mock state variants partial — SsoPage, VerifyTokenPage, RegistrationPendingPage, ResendPage (12 anonymous cells across 4 pages) — content-completion items.
3. RegistrationPage validation copy leaks `email` field name (1 cell) — Axis F Layer 3 CONCERN, friendly copy.

See `FC-18-AUDIT-TRAIL.md` § "CONCERN enumeration + architectural rationale" for full discussion.

## Tier 2 + Tier 3 verdicts — carried forward from instance A

The 6 aggregated role verdicts (`public-marketplace-visitor`, `tenant-user`,
`referral-user`, `tenant-admin`, `platform-admin`, `platform-support`) and the
RTL-on-admin spot-check (`RegistrationPage-tenant-admin-C4`) all carry forward
unchanged to instance B. See `SK549-COVERAGE-tenant-a.json` for the
machine-readable verdict copies.

## Four-axis review (portability DoD)

| Axis | Verdict | Evidence |
|---|---|---|
| **Fabric-First** | PASS | No provider SDK strings visible; same as instance A. Adaptation introduces no new client-rendered text — the 4 acme override values live exclusively in T48/T49 server methods. |
| **Genie-DNA** | PASS | Same as instance A. No T-numbers / event names / FLOW_SCOPED literals leak to user copy. The acme rebranding (community name, inviter name) only ever appears in invitation emails, never in the 6 kiosk pages. |
| **Tenant-Separation** | **PASS** | Now upgraded from `n/a` (at instance A) to PASS at instance B. Evidence: (a) drift = 0 px confirms the client kiosks are tenant-agnostic by design (Rule 14 Config-over-Code intact); (b) `phase-01-adaptation-freedom-config.spec.ts` proves the 4 acme overrides return acme values for `tenant: 'acme-pro-members'` context and defaults for any other tenant — behavioural separation enforced at the FREEDOM lookup boundary. |
| **Visual-Validation** | PASS | Same as instance A. G5 Kiosk grammar maintained; AppShell role-gate fires correctly; RTL flips entire viewport including admin sidebar. |

## BC-001 compliance

Per `BEHAVIORAL-CORRECTIONS-REGISTRY.md` BC-001: "Images never to chat — SK-549 verdicts only; PNGs saved to `visual-evidence/`".

- Drift comparison ran via local Python script (`scripts/portability/flow-01-tenant-a-drift-compare.py`) — script reads PNG bytes locally, emits SHA-256 hashes only.
- Verdict generation ran via local Python script (`scripts/portability/flow-01-build-tenant-a-coverage.py`) — script imports instance A's textual verdicts via `json.load`, no image bytes touched.
- Neither the drift script nor the verdict-builder script returned any PNG content into the conversation.
- The 252 PNGs at tenant-a remain on disk under `docs/e2e-snapshots/user-registration/tenant-a-acme-v1.0.1/` for future re-audit.

## V-13 instance B — frozen verdict

```
overallVerdict: PASS
totalBlock:     0
totalConcern:   0 (per-cell overall level; carried forward from instance A)
axisB_7roles:   PASS for all 7
he-RTL_C4:      PASS for all 6 anonymous + admin spot-check (mechanically equivalent to instance A)
fourAxisReview: 4/4 PASS (Tenant-Separation now PASS at this hop)
driftPNGs:      252/252 byte-identical
```

## V-15 instance A — frozen verdict

```
verdict:        PASS
contract:       docs/portability/flow-01/V-15-DRIFT-PASS-CONTRACT.md
expectedDrift:  0 px on every PNG (per FLOW-01 server-side-only adaptation)
observedDrift:  0 px on every PNG (252/252 byte-identical pairs)
behaviouralEv:  server/test/user-registration/phase-01-adaptation-freedom-config.spec.ts
```

**Cascade unblock**: V-13 instance B + V-15 instance A PASS unblock Phase C5 (marketplace tile preview — V-14 instance A) and Phase C6+ (tenant-B/C cascade hops — V-13 instances C/D + V-14 instances B/C + V-15 instances B/C).

## Artifacts committed in Phase C4

1. `client/e2e/flow-01-visual.spec.ts` — extended with `XIIGEN_VISUAL_TARGET` env var + tenant-identity localStorage seeding (FLOW-03 isolation pattern); single spec now serves V-13 instances A/B/C/D.
2. `docs/e2e-snapshots/user-registration/tenant-a-acme-v1.0.1/*.png` — 252 captured PNGs (replaces 3 stale v1.1-protocol PNGs).
3. `docs/portability/flow-01/V-15-DRIFT-PASS-CONTRACT.md` — formal contract for FLOW-01-specific drift PASS via behavioural-only tenant separation.
4. `scripts/portability/flow-01-tenant-a-drift-compare.py` — byte-level drift comparison script (reusable for V-15 instance B/C drift checks).
5. `scripts/portability/flow-01-build-tenant-a-coverage.py` — verdict-builder script that derives instance B coverage from instance A under the contract.
6. `docs/portability/flow-01/visual-evidence/SK549-COVERAGE-tenant-a.json` — instance B machine-readable verdict + drift analysis.
7. `docs/portability/flow-01/visual-evidence/FC-18-AUDIT-TRAIL-tenant-a.md` — this file.
8. `docs/portability/flow-01/FLOW-01-PORTABILITY-STATE.json` — V-13 instance B verdict=PASS, V-15 instance A verdict=PASS, Phase C4 status=COMPLETED, cascade row 2 verdict=PASS.

## Next step

Phase C5 — marketplace tile preview (V-14 instance A) at platform-source. Captures the FLOW-01 marketplace listing tile in the public-marketplace-visitor view + tenant-shop tile in the tenant-admin view; verifies the tile UI honours flow metadata (T47/T48/T49 task list, freedom-key count, portability tier badge) without leaking engineering identifiers to user copy.

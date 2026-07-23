# V-15 Instance B — Drift Contract Audit (Phase C7)

**V-gate:** V-15 instance B (northwind tenant — own adaptation v1.0.2)
**Cascade row:** 6 (tenant-b-adapted)
**Audit date:** 2026-04-25
**Branch:** `claude/vigorous-margulis` / DEV-115
**Author:** architect-mode (autonomous)
**Protocol:** FLOW-PORTABILITY-TEST-PROTOCOL-v2.0 §V-15 + V-15-DRIFT-PASS-CONTRACT.md

---

## Acceptance criterion (verbatim from protocol § V-15)

> "Tenant adaptation produces zero drift on every captured PNG against the
> upstream baseline (cascade parent), where the active FREEDOM keys are
> client-rendering-irrelevant. Pixel identity is the PASS outcome under the
> V-15-DRIFT-PASS-CONTRACT.md transparency clause."

This audit closes V-15 instance B at cascade row 6 (northwind own adaptation
v1.0.2 over acme v1.0.1 cascade parent at row 5). Phase C4 closed instance A
(acme over platform). Phase C8 will close instance C (tenant-c).

---

## 1. V-15 contract premise (re-stated)

For FLOW-01, all 7 declared FREEDOM keys are server-side-only. Specifically,
the 4 active overrides at row 6 land in:

| FREEDOM key | Active value at row 6 | Source | Where it lives |
|---|---|---|---|
| `flow01_resend_rate_limit_minutes` | **5** ⬇ (tightened from acme 15) | northwind own | `EmailVerificationService.getResendLimitMinutes` (server-side only) |
| `flow01_invitation_inviter_name` | "The Acme Pro Team" | inherited from acme v1.0.1 | `OnboardingDeliveryService.deliverInvitation` (email body, server-side only) |
| `flow01_invitation_community_name` | "Acme Pro Members" | inherited from acme v1.0.1 | `OnboardingDeliveryService.deliverInvitation` (email body, server-side only) |
| `flow01_email_verification_ttl_seconds` | 3600 (1h) | inherited from acme v1.0.1 | `EmailVerificationService.getTokenExpiryMs` (server-side only) |

None of these reach any of the 6 FLOW-01 client kiosk pages (`/register`,
`/register/pending-verification`, `/verify`, `/verify/resend`, `/onboarding`,
`/auth/sso/google`). Therefore under V-15-DRIFT-PASS-CONTRACT.md component 1,
**pixel identity = PASS**.

---

## 2. Drift comparison — triple-baseline

The 252 PNGs at `tenant-b-northwind-v1.0.2/` were compared (SHA-256 byte-equality)
against THREE upstream reference corpora:

| Comparison | Pairs | Byte-identical | Drift | Verdict |
|---|---|---|---|---|
| platform-source vs tenant-b-v1.0.2 | 252 | 252 | 0 px | **PASS** |
| tenant-a-acme-v1.0.1 vs tenant-b-v1.0.2 | 252 | 252 | 0 px | **PASS** |
| tenant-b-northwind-installed-v1.0.1 vs tenant-b-v1.0.2 | 252 | 252 | 0 px | **PASS** |

Drift script: `scripts/portability/flow-01-build-tenant-b-v102-coverage.py`
Coverage record: `docs/portability/flow-01/visual-evidence/SK549-COVERAGE-tenant-b-v1.0.2.json`

Each comparison reads the PNG bytes locally, computes a SHA-256 hash per file
on each side, and counts byte-identical pairs. No image bytes ever enter chat
context (BC-001 compliance — see §4).

The third comparison (row 5 vs row 6) is the **direct V-15 instance B verdict**:
it tests whether northwind's own override (rate_limit 15→5) reaches the client.
The first two comparisons are corroboration: they confirm that neither acme's
4 overrides nor any of the cascade hops disturb pixel identity.

---

## 3. V-15 acceptance line-by-line

| V-15 acceptance criterion | Component | Verdict | Evidence |
|---|---|---|---|
| Tenant adaptation runs end-to-end against the cascade parent | northwind v1.0.2 over acme v1.0.1 | **PASS** | `tenant-profile-northwind-guild.json.lineage` + repo `package.json.basedOn` |
| All FREEDOM overrides at this hop are auditable | 1 own + 3 inherited | **PASS** | `tenant.config.json.overrides` with `tightenedFrom` and `inheritedFrom` markers |
| Behavioural separation proven (Layer 1) | Server test active | **PASS** | `phase-01-adaptation-freedom-config.spec.ts` — northwind context returns rate_limit=5 + 3 inherited acme values |
| Drift = 0 px against cascade parent (row 5) | 252/252 byte-identical | **PASS** | §2, third row of triple-baseline |
| Drift = 0 px against ultimate root (platform) | 252/252 byte-identical | **PASS** | §2, first row of triple-baseline |
| Drift = 0 px against sibling cascade (acme row 4) | 252/252 byte-identical | **PASS** | §2, second row of triple-baseline |
| Active FREEDOM keys are server-side-only | All 4 documented at server-side renderingSurface | **PASS** | `tenant.config.json.overrides[*].renderingSurface` |
| **V-15 instance B overall** | | **PASS** | Mechanical derivation under V-15-DRIFT-PASS-CONTRACT.md |

---

## 4. BC-001 compliance

This audit:
- Reads only PNG byte counts and SHA-256 hashes — no pixel content extracted
- Reports drift as integer pair counts (252/252 identical), never as image content
- Cites filenames and storage paths, never PNG bytes inline
- Defers visual verdicts to the SK-549 verdicts already produced for instance A,
  inherited mechanically under the V-15 contract

The drift script (`flow-01-build-tenant-b-v102-coverage.py`) reads PNG bytes
locally on disk and emits SHA-256 hashes only. Result counts are written to
JSON; no bytes leave the script.

---

## 5. CONCERN enumeration carried forward

All CONCERNs documented in V-13 instance A's coverage carry forward unchanged
to instance B at row 6. None are caused by the northwind adaptation; they are
pre-existing platform-source quirks that remain visible (because the renders
are pixel-identical):
- See `SK549-COVERAGE.json.concerns` (instance A) for the full enumeration.
- The mechanical-derivation clause of V-15-DRIFT-PASS-CONTRACT.md states that
  if drift = 0, the per-cell SK-549 verdicts (and the CONCERN-set) inherit
  unchanged from the upstream baseline. Mathematically: identical pixels =
  identical observations.

---

## 6. Tenant-Separation review (four-axis)

The four-axis review continues to PASS at row 6:

| Axis | Verdict | Evidence |
|---|---|---|
| **Axis A — MACHINE invariance** | PASS | Event names, T47-T49 task IDs, schemas, idempotency, outbox ordering, token hash, VALIDATION_FAILURE shape all byte-identical to platform v1.0.0 (and to acme v1.0.1, and to row 5 capture) |
| **Axis B — FREEDOM correctness** | PASS | Layer-1 server test confirms northwind context returns rate_limit=5; ttl=3600; inviter='The Acme Pro Team'; community='Acme Pro Members'. Default for non-cascade tenants. |
| **Axis C — Tenant-Separation** | PASS | Behavioural separation per Layer-1 test; cross-tenant JWT isolation deferred to V-16/Phase C9 |
| **Axis D — V-15 drift contract** | PASS (this audit) | Triple-baseline drift = 0 px |

---

## 7. V-15 instance B verdict

**PASS** — mechanically derived under V-15-DRIFT-PASS-CONTRACT.md component 1.

The 252 PNGs at tenant-b-northwind-v1.0.2 are byte-identical to all three
upstream reference corpora. The active overrides at this hop (1 own:
rate_limit 15→5 + 3 inherited from acme: inviter_name, community_name,
ttl_seconds) are all server-side-only and never reach the 6 FLOW-01 client
kiosk pages. Pixel identity is the V-15 PASS outcome for FLOW-01 under the
contract.

This closes Phase C7 against `postflightGates: ["V-14 (B)", "V-15 (B)"]` for
the V-15 component. Top-level V-15 verdict remains `NOT_YET_RUN` until all 3
instances PASS (instance C = tenant-c is Phase C8).

---

## 8. Provenance trail

| Artifact | Path |
|---|---|
| This audit | `docs/portability/flow-01/visual-evidence/V-15-INSTANCE-B-AUDIT.md` |
| Coverage record | `docs/portability/flow-01/visual-evidence/SK549-COVERAGE-tenant-b-v1.0.2.json` |
| Drift script | `scripts/portability/flow-01-build-tenant-b-v102-coverage.py` |
| 252 PNGs (row 6 capture) | `docs/e2e-snapshots/user-registration/tenant-b-northwind-v1.0.2/` |
| 252 PNGs (row 5 cascade parent) | `docs/e2e-snapshots/user-registration/tenant-b-northwind-installed-v1.0.1/` |
| 252 PNGs (row 4 acme baseline) | `docs/e2e-snapshots/user-registration/tenant-a-acme-v1.0.1/` |
| 252 PNGs (row 1 platform baseline) | `docs/e2e-snapshots/user-registration/platform-source/` |
| V-15 contract | `docs/portability/flow-01/V-15-DRIFT-PASS-CONTRACT.md` |
| Layer 1 separation proof | `server/test/user-registration/phase-01-adaptation-freedom-config.spec.ts` |
| Tenant profile | `docs/portability/flow-01/tenant-profile-northwind-guild.json` |
| Cascade parent V-15 audit | (V-15 instance A — see Phase C4 evidence in `FC-18-AUDIT-TRAIL-tenant-a.md`) |

---

## 9. Sign-off

V-15 instance B (northwind v1.0.2) is **PASS** under FLOW-PORTABILITY-TEST-PROTOCOL-v2.0
+ V-15-DRIFT-PASS-CONTRACT.md. The cascade-coherence test (drift = 0 vs ALL three
upstream baselines) is the strongest possible V-15 evidence: it proves that the
cascade chain v1.0.0 → v1.0.1 → v1.0.2 introduces zero pixel-level drift at any
hop, consistent with the contract's premise that all FREEDOM keys are
server-side-only.

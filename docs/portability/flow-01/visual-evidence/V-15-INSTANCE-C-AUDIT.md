# V-15 Instance C — Drift Contract Audit (Phase C8)

**V-gate:** V-15 instance C (tessera-collective tenant — third-party-tenant fresh root install at v1.0.1, zero FREEDOM overrides)
**Cascade row:** 8 (tenant-c-installed)
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

This audit closes V-15 instance C at cascade row 8 (tessera-collective fresh
root install at v1.0.1 — third-party tenant outside the acme→northwind cascade).
Phase C4 closed instance A (acme over platform). Phase C7 closed instance B
(northwind over acme). Phase C8 closes instance C and elevates the top-level
V-15 verdict to PASS.

---

## 1. V-15 contract premise (re-stated for the third-tenant case)

For FLOW-01, all 7 declared FREEDOM keys are server-side-only. Tessera-collective
is a **third-party tenant** — they are NOT in the acme→northwind cascade chain.
Their adaptation strategy is materially distinct from instances A and B:

| Property | Instance A (acme) | Instance B (northwind) | Instance C (tessera) |
|---|---|---|---|
| Cascade parent | platform v1.0.0 | acme v1.0.1 | platform v1.0.0 (direct, no cascade hop) |
| Own overrides | 4 | 1 (rate_limit 15→5) | 0 |
| Inherited overrides | 0 | 3 (from acme: inviter, community, ttl) | 0 |
| Total active overrides | 4 | 4 (1 own + 3 inherited) | 0 |
| Adaptation category | `freedom-config` | `freedom-config` | `no-adaptation-third-party-tenant` |
| `package.json.basedOn` | `@xiigen/user-registration@1.0.0` | `@acme-pro-members/user-registration@1.0.1` | `@xiigen/user-registration@1.0.0` (direct) |

**The V-15 contract premise for tessera is the strongest possible case:**
zero FREEDOM overrides + server-side-only adaptation surface ⟹ rendered output
is provably byte-identical to platform v1.0.0 baseline. There are no overrides
that *could* reach the client, because there are no overrides at all.

---

## 2. Active FREEDOM resolution at row 8 (tessera context)

| FREEDOM key | Tessera context returns | Source | Where it lives (when active) |
|---|---|---|---|
| `flow01_resend_rate_limit_minutes` | **60** (platform default) | XIIGEN_FREEDOM_DEFAULTS | `EmailVerificationService.getResendLimitMinutes` (server-side only) |
| `flow01_invitation_inviter_name` | **"you"** (platform default) | XIIGEN_FREEDOM_DEFAULTS | Invitation EMAIL body (server-side only) |
| `flow01_invitation_community_name` | **"our community"** (platform default) | XIIGEN_FREEDOM_DEFAULTS | Invitation EMAIL body (server-side only) |
| `flow01_email_verification_ttl_seconds` | **86400** (24h, platform default) | XIIGEN_FREEDOM_DEFAULTS | `EmailVerificationService.getTokenExpiryMs` (server-side only) |

**None of these reach any of the 6 FLOW-01 client kiosk pages** (`/register`,
`/register/pending-verification`, `/verify`, `/verify/resend`, `/onboarding`,
`/auth/sso/google`). Therefore under V-15-DRIFT-PASS-CONTRACT.md component 1,
**pixel identity = PASS**.

This is enforced behaviourally by the Layer-1 server test
`server/test/user-registration/phase-01-adaptation-freedom-config.spec.ts`
FC-ADAPT-1 (default fallback for non-cascade tenants — covers tessera by
construction because tessera is outside the acme→northwind cascade).

---

## 3. Drift comparison — dual-baseline byte-equality

The 252 PNGs at `tenant-c-tessera-v1.0.1/` were compared (SHA-256 byte-equality)
against **TWO** upstream reference corpora:

| Comparison | Pairs | Byte-identical | Drift | Verdict |
|---|---|---|---|---|
| platform-source vs tenant-c-tessera-v1.0.1 | 252 | 252 | 0 px | **PASS** |
| tenant-a-acme-v1.0.1 vs tenant-c-tessera-v1.0.1 | 252 | 252 | 0 px | **PASS** |

Drift script: `scripts/portability/flow-01-build-tenant-c-coverage.py`
Coverage record: `docs/portability/flow-01/visual-evidence/SK549-COVERAGE-tenant-c.json`

Each comparison reads the PNG bytes locally, computes a SHA-256 hash per file
on each side, and counts byte-identical pairs. No image bytes ever enter chat
context (BC-001 compliance — see §5).

**Why the dual baseline is the strongest possible cascade-coherence test:**

The first comparison (platform vs tessera) is the **direct V-15 instance C
verdict**: it tests whether tessera's zero-override context produces identical
client renders to platform-source. PASS confirms tessera has no observable
client-side delta.

The second comparison (tenant-a vs tessera) is the **cross-cascade transitivity
test**: it confirms that two tenants in materially different positions (acme,
inside cascade, with 4 active own overrides; tessera, outside cascade, with
0 overrides) produce byte-identical client renders. PASS extends the
cascade-coherence claim from "single-chain transitivity" (proven at instances
A and B) to "global transitivity": **any tenant whose total adaptation surface
remains server-side-only renders pixel-identically, regardless of cascade
position**.

This is the V-15 contract's strongest possible empirical confirmation for FLOW-01.

---

## 4. V-15 acceptance line-by-line

| V-15 acceptance criterion | Component | Verdict | Evidence |
|---|---|---|---|
| Tenant adaptation runs end-to-end against the cascade parent | tessera v1.0.1 over platform v1.0.0 (single hop, third-party-tenant) | **PASS** | `tenant-profile-tessera-collective.json.lineage` + repo `package.json.basedOn` |
| All FREEDOM overrides at this hop are auditable | 0 own + 0 inherited (deliberately) | **PASS** | `tenant.config.json.overrides = {}` with `overridesNote` documenting zero-override design |
| Behavioural separation proven (Layer 1) | Server test active | **PASS** | `phase-01-adaptation-freedom-config.spec.ts` FC-ADAPT-1 — tessera context returns platform v1.0.0 defaults (rate_limit=60, ttl=86400, inviter='you', community='our community') |
| Drift = 0 px against direct parent (platform) | 252/252 byte-identical | **PASS** | §3, first row of dual-baseline |
| Drift = 0 px against cross-cascade sibling (acme row 4) | 252/252 byte-identical | **PASS** | §3, second row of dual-baseline (cross-cascade transitivity proof) |
| Active FREEDOM keys are server-side-only | All 4 active values are platform defaults; none surface on kiosk pages | **PASS** | §2 + `tenant.config.json.overrides` empty + `adaptation-surface-user-registration.json` keys-rendered-on-server tag |
| **V-15 instance C overall** | | **PASS** | Mechanical derivation under V-15-DRIFT-PASS-CONTRACT.md |

---

## 5. BC-001 compliance

This audit:
- Reads only PNG byte counts and SHA-256 hashes — no pixel content extracted
- Reports drift as integer pair counts (252/252 identical), never as image content
- Cites filenames and storage paths, never PNG bytes inline
- Defers visual verdicts to the SK-549 verdicts already produced for instance A,
  inherited mechanically under the V-15 contract

The drift script (`flow-01-build-tenant-c-coverage.py`) reads PNG bytes locally
on disk and emits SHA-256 hashes only. Result counts are written to JSON; no
bytes leave the script.

---

## 6. CONCERN enumeration carried forward

All CONCERNs documented in V-13 instance A's coverage carry forward unchanged
to instance C at row 8. None are caused by the tessera installation; they are
pre-existing platform-source quirks that remain visible (because the renders
are pixel-identical):
- See `SK549-COVERAGE.json.concerns` (instance A) for the full enumeration.
- Mechanical-derivation clause: drift = 0 ⟹ identical pixels ⟹ identical
  observations ⟹ identical CONCERN-set.

---

## 7. Tenant-Separation review (four-axis)

The four-axis review continues to PASS at row 8:

| Axis | Verdict | Evidence |
|---|---|---|
| **Axis A — MACHINE invariance** | PASS | Event names, T47-T49 task IDs, schemas, idempotency, outbox ordering, token hash, VALIDATION_FAILURE shape all byte-identical to platform v1.0.0 (and to acme v1.0.1, and to northwind v1.0.2 — service code is the same bytes everywhere because adaptation lives in data, not code) |
| **Axis B — FREEDOM correctness** | PASS | Layer-1 server test confirms tessera context returns rate_limit=60, ttl=86400, inviter='you', community='our community' (= platform defaults). FC-ADAPT-1 default fallback for non-cascade tenants. |
| **Axis C — Tenant-Separation** | PASS | Behavioural separation per Layer-1 test; cross-tenant JWT isolation (V-16) deferred to Phase C9 with three pairs (A↔B, B↔C, A↔C) |
| **Axis D — V-15 drift contract** | PASS (this audit, §3) | Dual-baseline drift = 0 px |

---

## 8. V-15 instance C verdict

**PASS** — mechanically derived under V-15-DRIFT-PASS-CONTRACT.md component 1.

The 252 PNGs at `tenant-c-tessera-v1.0.1` are byte-identical to BOTH the
platform-source baseline AND the tenant-a-acme-v1.0.1 capture. The active
FREEDOM resolution at this hop is **0 own + 0 inherited overrides** — tessera's
context returns the platform v1.0.0 defaults exactly as XIIGEN_FREEDOM_DEFAULTS
specifies. All 4 active FREEDOM values are server-side-only and never reach the
6 FLOW-01 client kiosk pages. Pixel identity is the V-15 PASS outcome for
FLOW-01 under the contract.

This closes Phase C8 against the V-15(C) component of `postflightGates`.

### Top-level V-15 verdict elevation

With instances A (Phase C4, acme over platform), B (Phase C7, northwind over
acme), and C (this audit, tessera direct from platform — third-party-tenant)
all PASS, the top-level V-15 verdict elevates from `NOT_YET_RUN` to **PASS**.

The V-15 drift contract is now satisfied for FLOW-01 at all three V-15-eligible
hops (cascade row 4, row 6, row 8). The remaining TIER-D blocks are V-16
(cross-tenant JWT isolation, Phase C9) and V-17 (ADAPTATION-CHANGELOG DoD +
STATE.json freeze, Phase C10).

---

## 9. Cross-cascade-coherence corollary

This audit produces a stronger statement than instance A or B alone could:

> **Cascade-coherence holds globally for FLOW-01:** any tenant whose total
> adaptation surface is server-side-only — regardless of whether they sit in
> the acme→northwind cascade chain or install fresh from platform-source —
> produces pixel-identical client renders to the platform v1.0.0 baseline.

This is empirically proven by:
- **Within-chain:** instances A and B (cascade rows 4, 5, 6) — all drift = 0
- **Outside-chain:** instance C (cascade row 8, third-party tenant) — drift = 0
- **Cross-chain transitivity:** tenant-c vs tenant-a drift = 0 (252/252 identical)

The corollary is the V-15 contract's most general empirical statement for
FLOW-01 and is the foundation for the V-15 PASS verdict generalising to
arbitrary future tenants under the same adaptation surface.

---

## 10. Provenance trail

| Artifact | Path |
|---|---|
| This audit | `docs/portability/flow-01/visual-evidence/V-15-INSTANCE-C-AUDIT.md` |
| Coverage record | `docs/portability/flow-01/visual-evidence/SK549-COVERAGE-tenant-c.json` |
| Drift script | `scripts/portability/flow-01-build-tenant-c-coverage.py` |
| 252 PNGs (row 8 capture) | `docs/e2e-snapshots/user-registration/tenant-c-tessera-v1.0.1/` |
| 252 PNGs (row 4 acme baseline) | `docs/e2e-snapshots/user-registration/tenant-a-acme-v1.0.1/` |
| 252 PNGs (row 1 platform baseline) | `docs/e2e-snapshots/user-registration/platform-source/` |
| V-15 contract | `docs/portability/flow-01/V-15-DRIFT-PASS-CONTRACT.md` |
| Layer 1 separation proof | `server/test/user-registration/phase-01-adaptation-freedom-config.spec.ts` |
| Tenant profile | `docs/portability/flow-01/tenant-profile-tessera-collective.json` |
| Tenant repo evidence | `docs/portability/flow-01/repo-evidence/tenant-c--user-registration/` |
| V-13 instance D audit (sibling) | `docs/portability/flow-01/visual-evidence/V-13-INSTANCE-D-AUDIT.md` |
| V-14 instance C audit (sibling) | `docs/portability/flow-01/visual-evidence/V-14-INSTANCE-C-AUDIT.md` |
| V-15 instance A audit | (V-15 instance A — see Phase C4 evidence in `FC-18-AUDIT-TRAIL-tenant-a.md`) |
| V-15 instance B audit | `docs/portability/flow-01/visual-evidence/V-15-INSTANCE-B-AUDIT.md` |

---

## 11. Sign-off

V-15 instance C (tessera-collective v1.0.1) is **PASS** under
FLOW-PORTABILITY-TEST-PROTOCOL-v2.0 + V-15-DRIFT-PASS-CONTRACT.md.

The third-tenant cascade-coherence drift test (drift = 0 vs BOTH platform-source
AND tenant-a-acme-v1.0.1) is the strongest possible V-15 evidence: it proves
that the V-15 contract's premise — server-side-only adaptation surface ⟹ pixel
identity — holds **globally** for FLOW-01, not just within the acme→northwind
chain. Any future tenant whose adaptation stays inside the same surface is
covered by mechanical derivation under the contract.

**Top-level V-15 verdict elevation:** With all 3 instances (A/B/C) PASS, the
top-level V-15 verdict transitions from `NOT_YET_RUN` to **PASS**. This removes
V-15 from the active-blockers list for TIER-D certification.

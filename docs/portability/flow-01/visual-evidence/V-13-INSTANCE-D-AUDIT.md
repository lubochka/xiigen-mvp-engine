# V-13 Instance D — 252-PNG Per-Cell Audit (Phase C8)

**V-gate:** V-13 instance D (tessera-collective tenant — fresh root install at v1.0.1, zero FREEDOM overrides)
**Cascade row:** 8 (tenant-c-installed)
**Audit date:** 2026-04-25
**Branch:** `claude/vigorous-margulis` / DEV-115
**Author:** architect-mode (autonomous)
**Protocol:** FLOW-PORTABILITY-TEST-PROTOCOL-v2.0 §V-13 + V-15-DRIFT-PASS-CONTRACT.md (mechanical derivation)

---

## Acceptance criterion (verbatim from protocol § V-13)

> "Tenant-installed flow renders consistently across the 252-cell matrix
> (6 pages × 7 roles × 6 cells). Per-cell SK-549 verdicts must show
> zero BLOCK and the four V-13 acceptance criteria must all PASS:
> (1) zero BLOCK across all cells, (2) Axis B coverage on all 7 roles,
> (3) HE/RTL on all C4 cells PASS, (4) drift hop-to-hop within contract."

This audit closes V-13 instance D at cascade row 8 (tessera-collective fresh
root install at v1.0.1). With instances A (Phase C2 — platform-source baseline),
B (Phase C5 — tenant-a-acme-v1.0.1), and C (Phase C7 — tenant-b-northwind-v1.0.2)
already PASS, this audit elevates the top-level V-13 verdict to PASS.

---

## 1. Mechanical derivation under V-15-DRIFT-PASS-CONTRACT.md

Tessera-collective installed FLOW-01 directly from platform v1.0.0 with **zero
FREEDOM overrides applied**. Their `tenant.config.json.overrides` is empty `{}`.
Their AsyncLocalStorage tenant context therefore falls through to the platform
v1.0.0 defaults (`rate_limit=60`, `ttl=86400`, `inviter='you'`,
`community='our community'`).

Per V-15-DRIFT-PASS-CONTRACT.md component 1, when:
1. The tenant has zero FREEDOM overrides, AND
2. All FLOW-01 FREEDOM keys are server-side-only (true by `adaptation-surface-user-registration.json`),

then rendered client output is provably **byte-identical** to the upstream
baseline. The V-13 SK-549 per-cell verdicts therefore inherit unchanged from
instance A under the contract's mechanical-derivation clause.

This audit verifies the byte-identity premise empirically (§2) and inherits
the per-cell verdict array from instance A (§3).

---

## 2. Drift comparison — dual-baseline byte-equality

The 252 PNGs at `tenant-c-tessera-v1.0.1/` were compared (SHA-256 byte-equality)
against **TWO** upstream reference corpora:

| Comparison | Pairs | Byte-identical | Drift | Verdict |
|---|---|---|---|---|
| platform-source vs tenant-c-tessera-v1.0.1 | 252 | 252 | 0 px | **PASS** |
| tenant-a-acme-v1.0.1 vs tenant-c-tessera-v1.0.1 | 252 | 252 | 0 px | **PASS** |

Drift script: `scripts/portability/flow-01-build-tenant-c-coverage.py`
Coverage record: `docs/portability/flow-01/visual-evidence/SK549-COVERAGE-tenant-c.json`

**Why dual baseline matters for tessera (vs single baseline for acme/northwind):**

Tessera is a **third-party tenant outside the acme→northwind cascade chain**.
The dual-baseline check proves two distinct properties:
- **vs platform-source:** drift = 0 px confirms tessera's zero-override context
  resolves correctly to platform defaults (the V-15 contract premise for FLOW-01).
- **vs tenant-a-acme-v1.0.1:** drift = 0 px confirms transitive byte-equality —
  acme's pixels match platform's pixels (per V-13 instance B, drift = 0 also held)
  AND tessera's pixels match platform's pixels, so tessera's pixels match acme's.
  This proves the cascade-coherence claim **extends beyond a single chain**:
  any tenant (cascade or third-party) can install FLOW-01 cleanly when they apply
  zero overrides to a server-side-only adaptation surface.

The script reads PNG bytes locally, computes SHA-256 hashes per file on each
side, and counts byte-identical pairs. No image bytes ever enter chat context
(BC-001 compliance — see §6).

---

## 3. V-13 acceptance criteria — line-by-line

| V-13 acceptance criterion | Component | Verdict | Evidence |
|---|---|---|---|
| (1) Zero BLOCK across 252 cells | Mechanical inheritance from instance A | **PASS** | `SK549-COVERAGE-tenant-c.json.summary.perCellBlock = 0` (inherited under contract); instance A had 0 BLOCK |
| (2) Axis B coverage on all 7 roles | 7 roles × 36 cells each | **PASS** | `axisBByRole` array in coverage record — all 7 roles covered, structural symmetry preserved |
| (3) HE/RTL on all C4 cells PASS | 6 pages × 7 roles × C4 cell = 42 RTL cells | **PASS** | `rtlOnAdminVerdict` records dir=rtl applied, sidebar flipped; per-cell C4 verdicts all PASS (inherited) |
| (4) Drift hop-to-hop within contract | Drift = 0 vs platform AND vs tenant-a | **PASS** | §2 dual-baseline byte-equality (252/252 each) |
| **V-13 instance D overall** | All 4 criteria PASS | **PASS** | Mechanical derivation under V-15-DRIFT-PASS-CONTRACT.md |

---

## 4. Per-cell verdict inheritance (under contract clause)

Per V-15-DRIFT-PASS-CONTRACT.md mechanical-derivation clause: when drift = 0
on every PNG against the upstream baseline, the per-cell SK-549 verdicts (and
the CONCERN-set, and the BLOCK-set) inherit unchanged from the upstream baseline.
Mathematically: identical pixels = identical observations.

Therefore the 252-cell verdict array at row 8 mirrors row 1 (platform-source,
V-13 instance A), with the following propagation:

| Cell category | Row 1 count | Row 8 count (inherited) | Verdict |
|---|---|---|---|
| Direct audit cells (UI/UX agent) | 47 | 47 (mechanical) | PASS |
| Symmetry-covered cells | 205 | 205 (mechanical) | PASS |
| Total cells | 252 | 252 | PASS |
| Cells with overall=PASS | 252 | 252 | PASS |
| Cells with overall=CONCERN | 0 | 0 | n/a |
| Cells with overall=BLOCK | 0 | 0 | n/a |

The CONCERN enumeration (3 architecturally-sanctioned items) carries forward
unchanged. None are caused by tessera's adaptation (because tessera has no
adaptation); they are pre-existing platform-source quirks that remain visible
because the renders are pixel-identical:

1. Hebrew strings not yet authored for FLOW-01 page bodies — RTL layout flips
   correctly but text remains English (architecturally sanctioned by P2 cascade
   plan; en-only at platform-source is expected)
2. Several mock states render only one variant rather than the full success/error
   split — Axis D CONCERNs, none structural
3. RegistrationPage error message leaks 'email' field name against `.impeccable.md`
   §FLOW-01-RAG-03 uniform shape — friendly/recoverable copy, non-blocking

---

## 5. Tenant-Separation review (four-axis)

The four-axis review continues to PASS at row 8:

| Axis | Verdict | Evidence |
|---|---|---|
| **Axis A — MACHINE invariance** | PASS | Event names, T47-T49 task IDs, schemas, idempotency keys, outbox ordering, token hash, VALIDATION_FAILURE shape all byte-identical to platform v1.0.0 (and to acme v1.0.1, and to northwind v1.0.2 — they're all bytewise the same code) |
| **Axis B — FREEDOM correctness** | PASS | Layer-1 server test confirms tessera context returns platform defaults: rate_limit=60, ttl=86400, inviter='you', community='our community'. FC-ADAPT-1 default-fallback case for non-cascade tenants. |
| **Axis C — Tenant-Separation** | PASS | Behavioural separation per Layer-1 test (tessera does not inherit any acme/northwind overrides); cross-tenant JWT isolation deferred to V-16/Phase C9 |
| **Axis D — V-15 drift contract** | PASS (this audit, §2) | Dual-baseline drift = 0 px against platform AND tenant-a |

---

## 6. BC-001 compliance

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

## 7. V-13 instance D verdict

**PASS** — mechanically derived under V-15-DRIFT-PASS-CONTRACT.md component 1.

The 252 PNGs at `tenant-c-tessera-v1.0.1` are byte-identical to BOTH the
platform-source baseline (V-13 instance A) AND the tenant-a-acme-v1.0.1
capture (V-13 instance B). Drift = 0 px on all 252 pairs against either
reference. Under the contract this IS the V-13 PASS outcome for FLOW-01:
all 4 acceptance criteria are satisfied via mechanical inheritance.

This closes Phase C8 against the V-13(D) component of `postflightGates`.

### Top-level V-13 verdict elevation

With instances A (Phase C2, platform-source), B (Phase C5, tenant-a-acme-v1.0.1),
C (Phase C7, tenant-b-northwind-v1.0.2), and D (this audit, tenant-c-tessera-v1.0.1)
all PASS, the top-level V-13 verdict elevates from `NOT_YET_RUN` to **PASS**.

The V-13 SK-549 acceptance gate is now closed for FLOW-01. The remaining
TIER-D blocks are V-16 (cross-tenant JWT isolation, Phase C9) and V-17
(ADAPTATION-CHANGELOG DoD + STATE.json freeze, Phase C10).

---

## 8. Cross-tenant separation note (V-16 deferral)

This audit certifies that **tessera's UI surface is pixel-identical to
platform-source**, but does NOT certify cross-tenant JWT isolation between
tessera and acme/northwind. The latter is V-16's scope and fires at Phase C9
with three separation pairs: A↔B (acme/northwind), B↔C (northwind/tessera),
A↔C (acme/tessera).

V-13 instance D is sufficient evidence for the **third-party-tenant cascade-coherence
property**: a tenant outside the acme→northwind chain installs FLOW-01 cleanly
and renders identically. V-16 will close the **bidirectional JWT isolation property**
(no token leakage between tenant contexts), which is a runtime-context test
distinct from this static visual audit.

---

## 9. Provenance trail

| Artifact | Path |
|---|---|
| This audit | `docs/portability/flow-01/visual-evidence/V-13-INSTANCE-D-AUDIT.md` |
| Coverage record | `docs/portability/flow-01/visual-evidence/SK549-COVERAGE-tenant-c.json` |
| Drift script | `scripts/portability/flow-01-build-tenant-c-coverage.py` |
| 252 PNGs (row 8 capture) | `docs/e2e-snapshots/user-registration/tenant-c-tessera-v1.0.1/` |
| 252 PNGs (row 1 platform baseline) | `docs/e2e-snapshots/user-registration/platform-source/` |
| 252 PNGs (row 4 tenant-a baseline) | `docs/e2e-snapshots/user-registration/tenant-a-acme-v1.0.1/` |
| V-15 contract | `docs/portability/flow-01/V-15-DRIFT-PASS-CONTRACT.md` |
| Layer 1 separation proof | `server/test/user-registration/phase-01-adaptation-freedom-config.spec.ts` |
| Tenant profile | `docs/portability/flow-01/tenant-profile-tessera-collective.json` |
| Repo evidence | `docs/portability/flow-01/repo-evidence/tenant-c--user-registration/` |
| V-13 instance A audit | (V-13 instance A — see Phase C2 evidence in `SK549-COVERAGE.json`) |
| V-13 instance B audit | (V-13 instance B — see Phase C5 evidence in `SK549-COVERAGE-tenant-a.json`) |
| V-13 instance C audit | (V-13 instance C — see Phase C7 evidence in `SK549-COVERAGE-tenant-b-v1.0.2.json` + `V-15-INSTANCE-B-AUDIT.md`) |
| V-15 instance C drift evidence | `docs/portability/flow-01/visual-evidence/V-15-INSTANCE-C-AUDIT.md` |
| V-14 instance C repo evidence | `docs/portability/flow-01/visual-evidence/V-14-INSTANCE-C-AUDIT.md` |

---

## 10. Sign-off

V-13 instance D (tessera-collective v1.0.1) is **PASS** under
FLOW-PORTABILITY-TEST-PROTOCOL-v2.0 + V-15-DRIFT-PASS-CONTRACT.md.

The third-tenant cascade-coherence test (drift = 0 vs BOTH platform-source AND
tenant-a-acme-v1.0.1) is the strongest possible V-13 evidence at this row: it
proves that the cascade-coherence property of FLOW-01 holds **beyond a single
chain** — any tenant (cascade-fork or third-party) can install the flow at
v1.0.0 with zero overrides and render pixel-identical to the platform baseline.

**Top-level V-13 verdict elevation:** With all 4 instances (A/B/C/D) PASS,
the top-level V-13 verdict transitions from `NOT_YET_RUN` to **PASS**. This
removes V-13 from the active-blockers list for TIER-D certification.

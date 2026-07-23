# FLOW-01 Portability Plan — user-registration

**Version:** 1.2.0 (2026-04-24 Luba decisions locked: per-tenant signing keys / bcryptjs default / JWT TTL 3600s / TIER-D confirmed / per-phase code+product review pacing + zero tech debt)
**Captured:** 2026-04-24
**Captured by:** architect-mode / opus-4.7 / session vigorous-margulis
**Scope unit:** FLOW-01 user-registration (T47/T48/T49 + 6 React pages)
**Target tier:** **TIER-D** (per `FLOW-PORTABILITY-TEST-PROTOCOL-v2.0.md` §UPDATED FLOW READINESS TIERS lines 1405-1415 + §FLOW READINESS TIERS lines 1465-1482 — TIER-D requires R6 auth isolation certified at all three cascade tenants)

---

## 1. Authoritative Protocol Stack (DoD Source) — consolidated single-version set

Luba's PRE-Q0 absorption (2026-04-24): no more extensions / addendums / INSERTs. Each document below is the **single canonical version** with prior content + auth/roles/repo-evidence integration already merged inline.

| Doc | Role | Line anchors |
|---|---|---|
| `FLOW-PORTABILITY-TEST-PROTOCOL-v2.0.md` | **primary portability protocol** — merges v1.2 base + AUTH-ROLES extension v1.0 inline. Carries R1..R6, Phase 0 AUTH PRE-FLIGHT, Layer 1-3, per-role cell matrix, AI Adaptation Phases 1-5, Phase 5a/5b/5c three-tenant cascade, `{tenantId}--{moduleName}` repo naming + repo evidence gate, Guard 14, PILOT SEQUENCE | §PHASE 0 AUTH PRE-FLIGHT lines 51-166; §LAYER 1 lines 171-281; §LAYER 2 per-role cell matrix lines 282-467; §LAYER 3 Visual SK-549 lines 469-741; §REPO NAMING CONVENTION line 744; §AI ADAPTATION PROTOCOL lines 871-989; §REPO EVIDENCE GATE line 1023; §Phase 5a line 1052; §Phase 5b line 1147; §Phase 5c + cross-tenant JWT line 1271; §UPDATED VISUAL EVIDENCE SUMMARY TABLE line 1351; §UPDATED REQUIREMENT DECLARATION TABLE (R1..R5) lines 1375-1387; §R6 Auth+Role Isolation lines 1389-1403; §UPDATED FLOW READINESS TIERS lines 1405-1415; §GUARD 14 lines 1418-1425; §FLOW READINESS TIERS (final) lines 1465-1482; §PILOT SEQUENCE lines 1488-1503 |
| `XIIGEN-AUTH-ROLES-GROUPS-PLAN-v3.0.md` | **platform auth build** — restamped v3.0 (identical content to v3.md; AM-1..AM-8 all embedded; AM-9 closed via fabric auth interfaces). Phase 0.5 ITokenService + IPasswordHasherService → Phase 1 AuthModule → Phase 2 UserRolesService → Phase 2.5 ScopeEnrichmentInterceptor → Phase 3 MasterTenantGuard → Phase 4 APP_GUARD → Phase 5 seeding → Phase 6 client auth | §AM-9 line 28; §FABRIC INTERFACES (new in v3 for AM-9) lines 303-365; §PHASE 0.5 Fabric interfaces lines 431-451; §PHASE 1 AuthModule lines 454-591; §PHASE 2 UserRolesService lines 593-680; §PHASE 2.5 ScopeEnrichmentInterceptor lines 682-780; §PHASE 3 MasterTenantGuard lines 783-840; §PHASE 4 APP_GUARD lines 844-895; §PHASE 5 Client auth seeding line 901; §PHASE 6 RolesGuard decoration line 921; §EXECUTION SEQUENCE SUMMARY lines 962-988 |
| `FORK-FLOW-ENGINE-PLAN-v1.2.md` | **repo provisioning** — updates naming convention from `xiigen-{slug}-{tenantId}` to `{tenantId}--{moduleName}` across the integration test; adds `flow_module_name` FREEDOM key (defaults to flow slug at fork, updated by AI adaptation when module's primary VERB changes); documents rationale in `GitHubProvisionerService.createRepo()` | §PHASE 3 Marketplace Controller lines 431-536 (repo naming at line 468-470; `flow_module_name` FREEDOM key at line 470); §PHASE 4 Integration Test lines 538-699 (repo-name assertion at line 613) |
| `PER-FLOW-FIX-MAP-v2.9.md` | **per-flow execution roadmap** — adds Guard 14, R6, GAP-24 auth pre-flight, `{tenantId}--{moduleName}` repo naming, per-role visual, repo evidence screenshots to the per-flow table. FLOW-01 row (Pre-CLS, NCD) lists the TIER-A → TIER-B → TIER-C progression targets | §GUARD REFERENCE INDEX lines 21-42 (Guard 14 at line 42); §Global v2.9 corrections G-14 / G-14-R6 lines 342-349; §AI ADAPTATION LOOP Phase 5a/5b/5c lines 625-640; §Cascade Safety Additions R6 lines 678-686; §Five-Requirement Final Status R6 row line 724; §FLOW-01 row (Pre-CLS, cleared after Tier-0) line 386 |
| `XIIGEN-MODULE-SEPARATION-FIX-PLAN-v5.0.md` | **top-level module-separation plan** — carries goal + acceptance tier 1-4 with auth-status annotations; PROOF table (with PROOF-7 R6 auth pilot on FLOW-08); v5.0 corrections for Guard 14 / R6 / GAP-27 per-role visual | §Acceptance Tests Tier 1-4 with auth status lines 45-172; §v5.0 corrections (Auth + Roles) lines 173-184; §PROOF Designation Table (PROOF-7 at line 328 — FLOW-08 pilot); §Guard 14 full body lines 809-817 |

**Rule:** These five documents **are** the DoD for FLOW-01 TIER-D certification. Any V-gate or sub-check in §7 below is a decomposition aid; the requirements themselves are R1..R6 exactly as worded in v2.0 §UPDATED REQUIREMENT DECLARATION TABLE + §R6.

**What no longer exists (superseded):** `FLOW-PORTABILITY-TEST-PROTOCOL-v1.2.md`, `FLOW-PORTABILITY-TEST-PROTOCOL-AUTH-ROLES-EXTENSION-v1.0.md`, `XIIGEN-AUTH-ROLES-GROUPS-PLAN-v3.md` — all absorbed into v2.0 + v3.0 consolidated versions. INSERT 0/1/2/3/4/5 language is retired; all extension content is now inline in v2.0.

---

## 2. DoD Anchor — R1..R6 (verbatim from `FLOW-PORTABILITY-TEST-PROTOCOL-v2.0` §UPDATED REQUIREMENT DECLARATION TABLE lines 1375-1403)

| Req | Name | v2.0 gate | What v2.0 adds over pre-consolidation | Pass criterion |
|---|---|---|---|---|
| **R1** | Decoupling | §LAYER 1 Step 2 DNA compliance scan lines 189-230 (expected 0 hits: throw-in-service, services-without-MicroserviceBase, ClsService imports, direct provider SDK imports, env reads, tenant-hardcoded literals, AsyncLocalStorage consumer violations) | §PHASE 0 AUTH PRE-FLIGHT lines 51-166 adds HTTP matrix (anon / tenant-user / tenant-admin / master-tenant all return expected status codes) + `ScopeEnrichmentInterceptor` wires JWT → ScopeContext.roles before controller | Layer 1 DNA scan = 0 hits **AND** Phase 0 HTTP matrix = all 7 FLOW-01 roles × 6 pages return the right code (200 / 401 / 403 per matrix) |
| **R2** | Fork with code | Sprint B engine — `ForkFlowHandlerService` runs; repo exists; tenant can cold-install without the source repo | §REPO NAMING CONVENTION line 744 mandates `{tenantId}--{moduleName}` (double-dash separator); §REPO EVIDENCE GATE line 1023 requires 2 PNGs per tenant (repo overview + file tree); `flow_module_name` FREEDOM key defaults to flow slug and is updated by AI adaptation when VERB changes (source: `FORK-FLOW-ENGINE-PLAN-v1.2.md` lines 468-470) | Workspace-level proof (package.json + standalone-boot spec) **AND** repos created at `acme--user-registration` / `northwind--user-registration` / `tenant-c--user-registration` with 2 PNGs each |
| **R3** | AI adaptation | §AI ADAPTATION PROTOCOL lines 871-989 — Phases 1-4 (read adaptation surface → AI proposes → apply + run all layers + capture visual → export); Layer 3 SK-549 per-image validation at each cascade checkpoint | Per-role × 3-viewport (C1 1440 / C6 375 / C7 768) × he-RTL (C4) cell matrix (§LAYER 2 lines 282-467); Phase 5c tenant-C confirmation (line 1271); extended Axis B per-role discipline (line 676) | Phases 1..4 executed **AND** cascade visual evidence table (§4 below) = 10 rows all PASS **AND** Phase 5c tenant-C validation PASS |
| **R4** | Independent test | §LAYER 1 lines 171-281 — cold-workspace fork repo boots + jest runs without needing the platform source tree | Auth regression after AI modification — after every Phase 5 adaptation cycle, full Layer 1 + Phase 0 HTTP matrix re-runs green | Cold-workspace jest 193/193 **AND** auth regression after every adaptation cycle = green |
| **R5** | Cascade | §UPDATED REQUIREMENT DECLARATION TABLE line 1385 — `adaptationHistory[]` propagates from platform → tenant A → tenant B → tenant C with module-name and commit hash in each entry | Module name in repo name propagates to all 3 tenants; §Phase 5c line 1271 is the third-tenant confirmation; SK-549 drift check at each hop | `adaptationHistory[]` has 3 entries at tenant C **AND** module repo exists at every cascade stop with `{tenantId}--user-registration` naming **AND** SK-549 drift PASS at each hop |
| **R6** | Auth+Role Isolation | §R6 Auth+Role Isolation lines 1389-1403 (new in v2.0 — merged from extension v1.0) | §PHASE 0 AUTH PRE-FLIGHT lines 51-166 (full HTTP matrix) + §LAYER 3 Extended Axis B per-role content verification lines 676-743 + §Phase 5c Step 2 cross-tenant JWT isolation test (line 1271+) | Phase 0 HTTP matrix = all expected codes **AND** SK-549 Axis B role-visibility PASS for every role × page cell **AND** cross-tenant JWT test green at **all 3** cascade tenant pairs (A→B, B→C, A→C all return 401/403) |

**Binary verdict:** TIER-D achieved only if **R1 ∧ R2 ∧ R3 ∧ R4 ∧ R5 ∧ R6 all = MET**. A single MISSING blocks TIER-D and caps at lower tier. Guard 14 (v2.0 lines 1418-1425 + v5.0 separation plan lines 809-817) prevents TIER-C until AUTH-ROLES-GROUPS-PLAN-v3.0 Phases 1-4 are deployed.

---

## 3. Tier Ladder — Ceiling Logic

| Tier | Entry requirements | Guard 14 constraint | Today's ceiling for FLOW-01 |
|---|---|---|---|
| TIER-A | R1 + R4 + Phase 0 HTTP matrix | — | reachable once Auth Plan Phase 0.5 + Phase 1 land |
| TIER-B | + R2 (workspace fork) + `--` repo naming | — | reachable once package.json + standalone-boot test exist + 3 repos provisioned |
| TIER-C | + R3 (AI adaptation Phases 1-5) + cross-tenant auth tested | **BLOCKED** if Auth Plan Phases 1-4 not deployed → caps at AUTH_DEFERRED → TIER-B | reachable once Auth Plan Phases 1-4 all committed |
| TIER-D | + R6 full (all 3 tenants, he-RTL at all viewports, per-role SK-549 matrix) + SK-549 visual evidence at every cascade point | — | FINAL TARGET for this plan |

**Current ceiling:** `AUTH_DEFERRED` — `server/src/auth/` does not exist; Auth Plan Phase 0.5 has not shipped. This plan drives the ceiling to TIER-D by executing Phases A → B → C below in sequence.

---

## 4. Cascade Visual Evidence Matrix (from `FLOW-PORTABILITY-TEST-PROTOCOL-v2.0.md` §UPDATED VISUAL EVIDENCE SUMMARY TABLE line 1351)

Every row below must have `verdict = PASS` for R3 + R5 + R6 at TIER-D. `{tenantId}--user-registration` is the repo slug convention from v2.0 §REPO NAMING CONVENTION line 744 (superseding the old `xiigen-{slug}-{tenantId}` form).

| # | Cascade point | Repo slug | Captured when | Cells required | R-gate coverage |
|---|---|---|---|---|---|
| 1 | platform-source | (no repo — main branch `claude/vigorous-margulis`) | Phase C, Step 3 | C1, C2, C3, C4, C6, C7 × 6 pages × 7 roles | R1, R6 |
| 2 | tenant-a-adapted (acme) | — | Phase C, Step 4 | same matrix; post-AI-adapt FREEDOM overrides applied | R3, R6 |
| 3 | tenant-a-marketplace | — | Phase C, Step 5 | marketplace tile + install dialog | R2, R3 |
| 4 | tenant-a-repo | `acme--user-registration` | Phase C, Step 5 | repo overview PNG + file tree PNG | R2 |
| 5 | tenant-b-installed (northwind) | — | Phase C, Step 6 | C1, C2, C3, C4, C6, C7 × 6 pages × 7 roles | R3, R5, R6 |
| 6 | tenant-b-adapted (northwind) | — | Phase C, Step 7 | post-adapt matrix | R3, R5 |
| 7 | tenant-b-repo | `northwind--user-registration` | Phase C, Step 7 | repo overview PNG + file tree PNG | R2, R5 |
| 8 | tenant-c-installed | — | Phase C, Step 8 | C1, C2, C3, C4, C6, C7 × 6 pages × 7 roles | R3, R5, R6 |
| 9 | tenant-c-repo | `tenant-c--user-registration` | Phase C, Step 8 | repo overview PNG + file tree PNG | R2, R5 |
| 10 | cross-tenant-auth | — | Phase C, Step 9 | 401/403 screenshot × 3 isolation tests (A→B, B→C, A→C) | **R6 only** |

**Storage path:** `docs/e2e-snapshots/user-registration/{cascade-point}/` (already partially populated — `platform-source/`, `tenant-a-acme-v1.0.1/`, `tenant-b-northwind-installed-v1.0.1/`, `tenant-b-northwind-v1.0.2/` exist at plan-write time; **no tenant-c paths yet**; **no cross-tenant-auth path yet**).

**Protocol line citations (all in `FLOW-PORTABILITY-TEST-PROTOCOL-v2.0.md`):** §LAYER 3 Cell matrix lines 491-512 (C1-C7 cell definitions); §UPDATED VISUAL EVIDENCE SUMMARY TABLE line 1351 (10-row cascade table verbatim); §REPO NAMING CONVENTION line 744 (`{tenantId}--{moduleName}` convention); §REPO EVIDENCE GATE line 1023 (2 PNGs per tenant repo).

---

## 5. Serial Gate Discipline (operating rule)

> **Serial, not bulk.** Every gate fires at the consumer point where its output is needed. Before reading any pre-cached verdict, the agent re-executes the gate against the **live tree** (Glob/Grep/Read against the current filesystem, not against memory of a prior response). No gate verdict survives across phase boundaries without re-verification.

**Why:** User correction on 2026-04-24: *"What I mean that during the execution all this points have to be validated again, since any code change can affect them!"* and *"All these EXISTS need to be reexamined during the execution, you need to define what is acceptance criteria on the point the agents reach it - which means each one need to run one after another - not in bulk!"*

**Implementation:**
1. Every V-gate (§7 below) has `firesAt` (the phase step where it runs).
2. Every V-gate has `checkCmd` (exact command or Glob/Grep to re-execute against the live tree).
3. Every V-gate has `acceptCriterion` (binary true/false, no interpretation).
4. Every V-gate has `onFail` (explicit action — never "proceed anyway").
5. **Before any phase transition**, the agent re-reads this plan + STATE.json, re-runs the `firesAt` gates for the closing phase, and writes fresh verdicts into STATE.json. A gate PASS from a prior session is **not** evidence; only a gate PASS with `lastCheckedAt` within the current phase window counts.

---

## 6. Self-Check Loop (mandatory before every phase transition)

Before marking any phase `COMPLETED` and before starting the next phase, the agent MUST:

1. **Re-read this plan MD** (`docs/portability/flow-01/FLOW-01-PORTABILITY-PLAN.md`) — confirm phase scope + V-gates for the closing phase and the opening phase are unchanged.
2. **Re-read STATE.json** (`docs/portability/flow-01/FLOW-01-PORTABILITY-STATE.json`) — confirm the closing phase's `preflightGates` all have `status=PASS`; if not, refuse to close the phase.
3. **Re-run every V-gate in `postflightGates`** against the **live tree** — Glob/Grep/Read/jest/tsc as specified; do not trust prior verdicts.
4. **Write fresh verdicts** into STATE.json with new `lastCheckedAt` timestamps.
5. **Update R1..R6 aggregate verdicts** — recompute whether any R requirement has moved MET → MISSING or vice versa.
6. **Announce pulse** to Luba — "Phase X closed; Phase Y opening; R-gate deltas: …". Per `feedback_pulse_and_convergence` every 3 min during long runs.
7. **Never infer** — if a V-gate's evidence is ambiguous, block the phase transition and raise to Luba with the exact gate ID + evidence pointer.

**Block-on-drift:** if during post-flight check any prior-PASS V-gate is now FAIL (because a commit between phases broke it), the closing phase flips to `BLOCKED`, new Gap-FLOW-01-X is opened in STATE.json, and no new phase starts until the gap closes.

---

## 7. V-Gate Manifest (sub-gates feeding R1..R6)

Each V-gate is keyed to **exactly one R requirement** and fires at **exactly one phase step**. If a check needs evidence across multiple steps, it is split into V-NNa, V-NNb, … (one row per fires-at point).

| ID | R parent | Fires at | Check | Accept criterion | On fail |
|---|---|---|---|---|---|
| V-01 | R1 | Phase A, Step 0.5 complete | `Glob server/src/fabrics/interfaces/token.service.interface.ts && Glob server/src/fabrics/interfaces/password-hasher.service.interface.ts` + `npx tsc --noEmit` in server | 2 interface files exist + tsc 0 errors | block Phase A Step 1; open Gap-FLOW-01-AUTH-0.5 |
| V-02 | R1 | Phase A, Step 1 complete | `Glob server/src/auth/**/*.ts` returns ≥ 5 files (AuthController, AuthService, AuthModule, jwt.strategy, local.strategy); `Grep 'extends MicroserviceBase' server/src/auth/auth.service.ts` returns 1 | AuthModule shipped + AuthService extends MicroserviceBase | block Phase A Step 2 |
| V-03 | R1 | Phase A, Step 2 complete | `Grep 'UserRolesService' server/src/auth/user-roles.service.ts` + jest suite for UserRolesService green | UserRolesService committed with resolveRolesForUser + attachPlatformRoles + ≥ 6 tests green | block Phase A Step 2.5 |
| V-04 | R1 | Phase A, Step 2.5 complete | `Glob server/src/auth/scope-enrichment.interceptor.ts` + `Grep 'ScopeContext' server/src/auth/scope-enrichment.interceptor.ts` + jest green for interceptor | ScopeEnrichmentInterceptor wired; JWT → ScopeContext.roles before controller | block Phase A Step 3 |
| V-05 | R1, R6 | Phase A, Step 3 complete | `Glob server/src/auth/master-tenant.guard.ts` + jest green | MasterTenantGuard committed with verified platform-admin check | block Phase A Step 4 |
| V-06 | R1 | Phase A, Step 4 complete | `Grep 'APP_GUARD' server/src/app.module.ts` returns wiring entry; jest suite green boot-test | APP_GUARD wired with JwtAuthGuard + RolesGuard + MasterTenantGuard chain | block Phase A Step 5 |
| V-07 | R1 | Phase A, Step 5 complete | Seeding script successfully seeds platform-admin + tenant-admin + tenant-user for acme + default | 3 seed accounts × 2 tenants provable via `db.searchDocuments('xiigen-users',…)` | block Phase A Step 6 |
| V-08 | R1 | Phase A, Step 6 complete | `Glob client/src/auth/**/*.tsx` ≥ 3 files (LoginPage, AuthContext, RequireAuth); `npx tsc --noEmit` in client | Client auth shipped; tsc 0 errors | block Phase B |
| V-09 | R1, R6 | Phase B, Step B1 complete | Phase 0 HTTP matrix test: 7 roles × 6 FLOW-01 pages → expected codes (anon → 401 on protected; tenant-user → 200 on own; cross-tenant → 403) | **42-cell HTTP matrix test file** green (jest / supertest) | block Phase B Step B2 |
| V-10 | R1, R6 | Phase B, Step B2 complete | `Grep '@Inject.*AUTH_MODULE\|@UseGuards.*JwtAuthGuard' server/src/engine/flows/user-registration/*.service.ts` — note: protected routes; `Grep 'tenant_id.*input.tenantId' server/src/engine/flows/user-registration/registration.service.ts` = **0 hits** (DNA-5 repair) | FLOW-01 services use ScopeContext, not explicit tenantId param | block Phase C |
| V-11 | R2 | Phase C, Step 1 | `Glob server/src/engine/flows/user-registration/package.json` + `cat … \| jq '.name,.requiredCoInstalls'` | package.json exists; name = `@xiigen/user-registration`; requiredCoInstalls = [] | block Phase C Step 2 |
| V-12 | R2 | Phase C, Step 2 | `Glob server/test/user-registration/phase-01-circular-install.spec.ts` + jest green on that spec | standalone-boot spec green without FLOW-02/03 services loaded | block Phase C Step 3 |
| V-13 | R3, R5, R6 | Phase C, Step 3 (cascade row 1) | SK-549 7-axis × 42 cells (6 pages × 7 roles) @ platform-source; `Glob docs/e2e-snapshots/user-registration/platform-source/*.png` ≥ 252 PNGs (42 × 6 viewport cells) | 0 BLOCK; Axis B all PASS for all 7 roles; he-RTL C4 all PASS | open Gap; block cascade row 2 |
| V-14 | R2, R3, R5 | Phase C, Steps 5 + 7 + 8 (cascade rows 3, 4, 7, 9) | `acme--user-registration` / `northwind--user-registration` / `tenant-c--user-registration` repos exist; 2 PNGs per repo (overview + tree) | 3 repos provisioned; 6 repo PNGs total | block TIER-B claim |
| V-15 | R3, R5 | Phase C, Step 4, 6, 8 (cascade rows 2, 5, 8) | `adaptationHistory[]` in tenant.config.json has length 1 / 2 / 3 respectively; SK-549 drift check per-hop | history propagates correctly; no drift regression | block cascade |
| V-16 | R6 | Phase C, Step 9 (cascade row 10) | Cross-tenant JWT test: token for tenant-A user on tenant-B route → 401/403; tenant-B on tenant-C → 401/403; tenant-A on tenant-C → 401/403; supertest file + 3 PNGs | all 3 isolation tests = 401/403 | **ABSOLUTE BLOCK** on TIER-D claim — this is R6's blocking gate |
| V-17 | all R | Phase C, Step 10 close | R1..R6 aggregate = all MET; FLOW-01-PORTABILITY-STATE.json `q4BinaryVerdict.frozenComplete = true` with 20+ sub-criteria all TRUE; ADAPTATION-CHANGELOG closed with 6-req DoD verdicts | binary 100% TRUE | cannot close portability session |

**Gate independence rule:** V-09 through V-16 each re-read the live tree and re-run their checks. V-13 does **not** trust V-13's own prior verdict from a previous cascade point — each cascade point re-invokes V-13's check against its own PNG directory.

---

## 8. Phase Breakdown — Phase A / B / C

### Phase A — Platform Auth Foundation (**prereq for TIER-C per Guard 14, v2.0 lines 1418-1425 + v5.0 separation plan lines 809-817**)

Source: `XIIGEN-AUTH-ROLES-GROUPS-PLAN-v3.0.md` §EXECUTION SEQUENCE SUMMARY lines 962-988.

| Step | Name | Artifacts | Gate (post-flight) |
|---|---|---|---|
| A0.5 | Fabric auth interfaces (closes AM-9 per auth plan v3.0 line 28 + §FABRIC INTERFACES lines 303-365) | 2 interfaces in `server/src/fabrics/interfaces/` + concrete providers in `server/src/fabrics/auth/` (JwtTokenProvider with **per-tenant signing keys** via `ISecretsService.getSecret('xiigen/auth/jwt_signing_key/${tenantId}')`, TTL 3600s default; BcryptPasswordHasherProvider using **bcryptjs** rounds=12 per v3.0 line 356) + 2 factories + `fabric-auth.module.ts` imported by `fabrics.module.ts` + 4 jest specs (21 tests) | V-01 |
| A1 | AuthModule | `server/src/auth/auth.{module,service,controller}.ts` + jwt/local strategies | V-02 |
| A2 | UserRolesService | `server/src/auth/user-roles.service.ts` + role-strings constant + jest | V-03 |
| A2.5 | ScopeEnrichmentInterceptor | `server/src/auth/scope-enrichment.interceptor.ts` + jest | V-04 |
| A3 | MasterTenantGuard | `server/src/auth/master-tenant.guard.ts` + jest | V-05 |
| A4 | APP_GUARD wiring | edit `server/src/app.module.ts` to register JwtAuthGuard + RolesGuard + MasterTenantGuard; boot-smoke jest | V-06 |
| A5 | Seeding (dev) | `scripts/seed-auth-dev.ts` — 3 roles × 2 tenants | V-07 |
| A6 | Client auth | `client/src/auth/{LoginPage,AuthContext,RequireAuth,api}.tsx` + vitest | V-08 |

**Phase A exit criteria:** V-01..V-08 all PASS; `server/src/auth/` contains ≥ 12 files; cross-tenant HTTP returns 401/403 at infrastructure level.

### Phase B — FLOW-01 Enablement for Phase 0 HTTP Matrix

Surface: 3 services (registration, email-verification, onboarding-delivery) + 6 pages.

| Step | Name | Artifacts | Gate |
|---|---|---|---|
| B1 | FLOW-01 Phase 0 HTTP matrix test | `server/test/user-registration/phase-01-auth-matrix.spec.ts` — 42 cells (7 roles × 6 pages) | V-09 |
| B2 | Repair DNA-5 in FLOW-01 services | edit 3 service files: remove `tenantId: string` param, read from ScopeContext/AsyncLocalStorage; adjust 193 existing tests to new signature | V-10 |

**Phase B exit criteria:** V-09 + V-10 PASS; existing 193 unit tests + new 42-cell matrix test all green; `Grep 'input.tenantId' server/src/engine/flows/user-registration/` = **0**.

### Phase C — Extension Protocol Execution (R2 + R3 + R5 + R6)

| Step | Name | Cascade row | Gate |
|---|---|---|---|
| C1 | `user-registration/package.json` + xiigenFlowMeta | — | V-11 |
| C2 | standalone-boot spec `phase-01-circular-install.spec.ts` | — | V-12 |
| C3 | Platform-source SK-549 matrix (252 cells) | row 1 | V-13 (instance A) |
| C4 | Tenant-A (acme) install + adaptation + SK-549 | row 2, 3 | V-13 (B), V-15 (A) |
| C5 | Tenant-A marketplace + `acme--user-registration` repo | row 3, 4 | V-14 (A) |
| C6 | Tenant-B (northwind) install + SK-549 drift | row 5, 6 | V-13 (C), V-15 (B) |
| C7 | Tenant-B `northwind--user-registration` repo | row 7 | V-14 (B) |
| C8 | Tenant-C install + SK-549 + `tenant-c--user-registration` repo | row 8, 9 | V-13 (D), V-14 (C), V-15 (C) |
| C9 | Cross-tenant JWT isolation (3 pairs) | row 10 | V-16 |
| C10 | ADAPTATION-CHANGELOG 6-req DoD + FLOW-01-PORTABILITY-STATE.json freeze | — | V-17 |

**Phase C exit criteria:** V-11..V-17 all PASS; `q4BinaryVerdict.frozenComplete = true` in STATE.json; FLOW-01 tier promoted to TIER-D.

---

## 9. Current Baseline (live tree, 2026-04-24)

| Surface element | Path | Status |
|---|---|---|
| FLOW-01 services | `server/src/engine/flows/user-registration/` | 3 files present (registration, email-verification, onboarding-delivery) |
| FLOW-01 pages | `client/src/pages/user-registration/` | 6 files present (OnboardingPage, RegistrationPage, RegistrationPendingPage, ResendPage, SsoPage, VerifyTokenPage) |
| FLOW-01 unit tests | `server/test/user-registration/` | 5 specs / 193 tests (per adaptation-surface.json §layerStatus) |
| FLOW-01 e2e | `client/e2e/user-registration.spec.ts` | EXISTS |
| FLOW-01 invariants | `docs/sessions/FLOW-01/FLOW-01-STEP-1-INVARIANTS.md` | EXISTS |
| FLOW-01 adaptation surface | `docs/portability/flow-01/adaptation-surface-user-registration.json` | EXISTS (7 FREEDOM keys + 3 edge cases) |
| FLOW-01 adaptation plan | `docs/portability/flow-01/adaptation-plan-freedom-config-user-registration.md` | EXISTS |
| FLOW-01 sub-tenant profile | `docs/portability/flow-01/tenant-profile-acme-pro-members.json` | EXISTS |
| FLOW-01 SK-549 platform-source | `docs/e2e-snapshots/user-registration/platform-source/` | PARTIAL — C1/C2/C3/C4/C6/C7 for 6 pages (already C1-C7 naming compliant) |
| FLOW-01 tenant-a snapshots | `docs/e2e-snapshots/user-registration/tenant-a-acme-v1.0.1/` | PARTIAL |
| FLOW-01 tenant-b snapshots | `docs/e2e-snapshots/user-registration/tenant-b-northwind-{installed,}-v1.0.{1,2}/` | PARTIAL (C2/C4/C6 ResendPage only) |
| FLOW-01 tenant-c snapshots | `docs/e2e-snapshots/user-registration/tenant-c-*` | **MISSING** |
| Platform auth module | `server/src/auth/` | **MISSING** |
| Fabric auth interfaces (ITokenService + IPasswordHasherService) | `server/src/fabrics/interfaces/token.service.interface.ts`, `password-hasher.service.interface.ts` + implementations in `server/src/fabrics/implementations/` | **MISSING** — auth plan v3 Phase 0.5 closes AM-9 (Rule 1 Fabric First) |
| Role strings constant | `server/src/kernel/role-strings.ts` | **MISSING** |
| Client auth | `client/src/auth/` | **MISSING** |
| `user-registration/package.json` | `server/src/engine/flows/user-registration/package.json` | **MISSING** |
| `t47.contract.json` | `fixtures/contracts/t47.contract.json` | **MISSING** (earlier agent claim falsified) |
| Cross-tenant JWT test | `server/test/auth/cross-tenant-jwt.spec.ts` | **MISSING** |
| Phase 0 HTTP matrix test | `server/test/user-registration/phase-01-auth-matrix.spec.ts` | **MISSING** |

**Known architectural gaps in FLOW-01 services:**
- DNA-5 violation: `registration.service.ts` line 27 has `tenantId: string;` in `RegisterInput` interface; tenantId should be read from AsyncLocalStorage / ScopeContext, not passed as a param.
- DNA-4 partial: `RegistrationService` has `@connectionType FLOW_SCOPED` JSDoc but does NOT `extends MicroserviceBase`.
- Password hashing upgrade: `registration.service.ts` line 84 uses `createHash('sha256')` for the `credentials_hash` field — Rule 1 Fabric First violation once the AuthModule exists. Migrate to `IPasswordHasherService.hash()` (bcryptjs, rounds=12) once Phase A Step 0.5 lands and RegistrationService `@Inject(PASSWORD_HASHER_SERVICE)`. Email-verification service `createHash` calls at lines 111/237 are for **token hashing** (separate concern from passwords) and stay Node-stdlib for A0.5/B2; migration of those is optional and would land in a later phase. Out of scope: `randomUUID` imports and bootstrap-seeder `createCipheriv` calls — those are Node-stdlib utilities, not provider-SDK violations.
- tenantId hit count correction: prior count of 12 was an under-estimate; Explore-verified actual count is 17 across 3 services (registration 5, email-verification 6, onboarding-delivery 6). B2 migration must address all 17.

---

## 10. Anti-Patterns for This Plan (things that cause instant Rule-15 / protocol violations)

- **NEVER** skip a V-gate post-flight re-check because "I ran it earlier this session" — re-read live tree every time.
- **NEVER** declare TIER-C without V-09 (Phase 0 HTTP matrix green) + Auth Plan Phases 1-4 all deployed (Guard 14).
- **NEVER** declare TIER-D without V-16 (cross-tenant JWT isolation at all 3 tenant pairs).
- **NEVER** use `flow-NN` numeric paths for repo names; use `{tenantId}--{moduleName}` per v2.0 §REPO NAMING CONVENTION line 744.
- **NEVER** use single-dash in repo name (`acme-user-registration`) — must be double-dash (`acme--user-registration`).
- **NEVER** mark a phase COMPLETED without updating R1..R6 aggregate verdicts in STATE.json (per §6 self-check).
- **NEVER** send PNGs to chat (BC-001). UI/UX agent reads them via Read tool and returns text verdicts only.
- **NEVER** trust an agent's EXISTS claim without independent Glob/Grep/Read verification (2026-04-24 correction).

---

## 11. Pulse + Approval Rules

**Luba-locked pacing (2026-04-24):** NOT full autopilot. After every phase (A0.5, A1, ..., C10) the agent runs a 5-step review loop:

1. **Run the phase's V-gates** against the live tree (per §5 serial gate discipline).
2. **Apply code review skill** (`XIIGEN-CODE-REVIEW-PROTOCOL-v2.0.md` — 6 axes: Fabric First + Genie DNA + Tenant Separation + Visual Validation + Auth Isolation + Role Cell Matrix). Use architect-mode skills (Genie DNA, tenant isolation, auth-by-tenant, module/role mechanisms) — tech decisions are the agent's, NOT escalated.
3. **Apply product review** — cross-check against `docs/business-flows/01-user-registration.md` + `docs/business-flows/PRODUCT-STATE.md` — "is this still what the user actually wants?" Product questions STOP and escalate to Luba.
4. **Self-check progress** — on plan? on direction? if yes, proceed; if drift, flip phase to BLOCKED per §6 self-check.
5. **Pulse Luba** with delta (phase closed, next phase opening, R-gate state, any open product questions).

**Zero tech debt** — no "resolve later" / "sprint B split" / "defer to TIER-C" escapes. If something breaks, it blocks the phase until fixed in-place. Target is TIER-D end-to-end; no intermediate tier stop.

**Pulse cadence:** every 3 min during long runs (per `feedback_pulse_and_convergence`).

**⛔ STOP gates:** absolute — write output, present, wait (per `feedback_stop_gate_discipline` + Rule 15).

**Commit + push discipline:** push immediately after every commit (per `feedback_push_on_commit`).

**Jira linking:** include Jira issue key in commit message (per `feedback_jira_commit_linking`).

---

## 12. Plan File Manifest

| Artifact | Path | Purpose |
|---|---|---|
| This plan | `docs/portability/flow-01/FLOW-01-PORTABILITY-PLAN.md` | authoritative plan + self-check rule |
| State JSON | `docs/portability/flow-01/FLOW-01-PORTABILITY-STATE.json` | per-phase status tracking; R1..R6 aggregate verdicts |
| Plans directory | `.claude/settings.local.json` → `plansDirectory: ".claude/plans"` + `.claude/plans/flow-01-portability-plan.md` pointer | session-wide reference so every reply re-loads the plan before acting |
| Adaptation surface (carry-over) | `docs/portability/flow-01/adaptation-surface-user-registration.json` | 7 FREEDOM keys + 3 edge cases (unchanged) |
| Adaptation plan (carry-over) | `docs/portability/flow-01/adaptation-plan-freedom-config-user-registration.md` | FREEDOM-config adaptation (unchanged) |
| Tenant profile (carry-over) | `docs/portability/flow-01/tenant-profile-acme-pro-members.json` | acme-pro-members sub-tenant profile (unchanged) |
| ADAPTATION-CHANGELOG (closing artifact) | `docs/portability/flow-01/ADAPTATION-CHANGELOG.md` | filled in Phase C Step 10; carries 6-req DoD verdicts |

---

## 13. First Next Action

**All Luba decisions are locked (2026-04-24).** No pending approvals. Plan proceeds to Phase A Step A0.5.

**Locked decisions:**
1. **Per-tenant signing keys** — `ISecretsService.getSecret('xiigen/auth/jwt_signing_key/${tenantId}')`; key cache keyed by tenantId with 60s TTL per entry. Verify step: extract tenantId from token claim → fetch matching tenant's key → compare signature → compare token.tenantId vs CLS.tenantId. Cross-tenant isolation becomes structural (wrong key ⇒ signature mismatch) in addition to the existing claim check.
2. **bcryptjs default** (not native bcrypt). Reason: Windows worktree reliability; no node-gyp dependency; identical cryptographic strength; hash prefix `$2a$` accepted alongside `$2b$` in tests. One-line swap path to native if ever needed.
3. **JWT access-token TTL 3600s** default. Refresh-token TTL handled later in A2/A3.
4. **TIER-D target confirmed.** No intermediate tier stop; no TIER-B split.
5. **Per-phase review pacing** (§11 above) — code review + product review + self-check + pulse after every phase. Tech decisions handled by agent using architect skills; only product questions escalate.

**A0.5 scope (locked):**
- 2 fabric interfaces (`ITokenService` + `IPasswordHasherService`) with `refresh()` and `needsRehash()` pulled forward to avoid breaking interface changes in A1→A4
- 2 concrete providers (`JwtTokenProvider` with per-tenant keys via `ISecretsService`; `BcryptPasswordHasherProvider` with bcryptjs rounds=12)
- 2 factories + `fabric-auth.module.ts` imported by `fabrics.module.ts`
- `FabricType.AUTH` enum addition
- 4 jest specs covering 21 tests (including tenant-A-token-on-tenant-B-key → fails at signature check)
- `npm install jsonwebtoken bcryptjs @types/jsonwebtoken` → add to `server/package.json`

**A0.5 gate (V-01):** all files exist + tsc 0 errors + jest green (21 pass) + no leaked SDK imports outside `server/src/fabrics/auth/`.

**Self-check before first action (§6):**
1. Re-read this PLAN.md + pointer + STATE.json.
2. Confirm `phases[].where(id=A0.5).status = PENDING`.
3. Re-verify via Glob that `server/src/auth/` is still absent and `server/src/fabrics/interfaces/token.service.interface.ts` is still absent.
4. Confirm no STATE.json gate claims PASS without evidence.
5. Proceed only if clean.

All subsequent steps gate-chain through §7 (V-02 → V-17).

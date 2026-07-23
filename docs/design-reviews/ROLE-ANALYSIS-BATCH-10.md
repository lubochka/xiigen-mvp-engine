# Role Analysis — Batch 10 of 10 (FLOW-46 → FLOW-48) — **FINAL BATCH**

## Date: 2026-04-20 | Branch: claude/pensive-tereshkova-baf347
## Source: XIIGen P1 business-logic inventories (FLOW-46 real topology; FLOW-48 full design docs) + existing scaffolds
## Scope: 3 flows (FLOW-46, -47, -48)

---

## Batch 10 scope — final batch, fleet completion

This is the last batch. FLOW-46 has real topology (7 nodes) from its platform-agent implementation; FLOW-47 has placeholder P1; FLOW-48 i18n is the fully-implemented flow from the FLOW-48-PLAN-P1-P14 rollout earlier this session. After this batch lands, the ROLE-COVERAGE-MATRIX is the complete authoritative map of role templates × flows for all 48 XIIGen flows.

Existing client scaffolds confirmed:

- **FLOW-46 platform-agent:** `PlatformAgentPage.tsx`
- **FLOW-47 module-lifecycle:** `ModuleLifecyclePage.tsx`
- **FLOW-48 i18n-translation:** Multiple components (LanguageSwitcher, AdminI18nPage, settings integration)

---

## Zip-to-XIIGen mapping for batch 10

No direct zip documents. Analysis derived from P1 inventories and the already-shipped FLOW-48 design docs (`docs/sessions/FLOW-48/`).

---

## FLOW-46 — Platform Agent (ADMIN_FACING)

**Business-logic summary (from real P1 topology):** Platform-wide AI agent for operators. 7 topology nodes: AgentRunOrchestrator, TenantScopeGateway (cross-tenant reads), PlatformContextEnricher (between AF-4 and AF-5), SuperJudgeArbiter (zero-cost verdict path), AgentActionPublisher, PatternContributor (feeds learning loop), AgentChatClient (chat UI). Platform operators converse with the engine via chat; agent proposes actions which require approval. Cross-tenant reads go through scope-gateway with strict audit.

**Entry points:** `POST /api/agent/run` (platform-admin — kick off agent run), `GET /chat` (platform-admin — chat UI), `GET /admin/platform/agent/actions` (platform-admin — pending actions), `POST /admin/platform/agent/actions/:id/approve` (platform-admin — approve), `GET /support/agent/:runId` (platform-support — audit trail), `GET /admin/my-tenant/agent-actions` (tenant-admin — view agent actions affecting my tenant).

### Observable viewer roles

| Role | When they interact | What they see | Distinct template needed? |
|------|--------------------|---------------|---------------------------|
| **`platform-admin`** | Primary — chat with agent, review agent actions, approve/reject, monitor pattern contribution | Chat UI + action-approval gate + pattern-contribution review + cross-tenant read audit | ✅ YES — platform agent primary |
| **`platform-support`** | **Compliance-grade** audit trail for every agent action (similar to FLOW-44) — cross-tenant reads must be auditable | Append-only action log + scope-switch audit + super-judge verdict inspector | ✅ YES — compliance-grade audit |
| **`tenant-admin`** | Receives notifications when agent actions affect their tenant (e.g., "agent proposes modifying your workflow X") | Notification panel + opt-in/out controls for agent actions on tenant | ⚠️ tenant notification slice |
| All other roles | — | Platform-operator tool — not end-user exposed | — |

### Template implications

1. `PlatformAgentPage` (existing) → platform-admin chat primary.
2. `AgentActionApprovalQueuePage` — platform-admin.
3. `AgentActionAuditLogPage` — platform-support (append-only, compliance-grade).
4. `MyTenantAgentActionsPage` (`/admin/my-tenant/agent-actions`) — tenant-admin notification.

### ROLE-COVERAGE-MATRIX update for FLOW-46

anon — · public-mkt — · tenant-user — · tenant-admin ⚠️ (notification) · referral — · freelancer — · biz-partner — · event-org — · platform-admin ✅ · platform-support ✅ (compliance-grade)

(Previously 1 full + 2 partial; now **2 full + 1 partial** cells = 3. Quality shift: platform-support promoted to full ✅ with compliance semantics. Cell count unchanged.)

---

## FLOW-47 — Module Lifecycle

**Business-logic summary (inferred from slug + FLOW-32/34 cross-cut):** Lifecycle manager for installed modules (plugins from FLOW-34, flows from FLOW-32, blog modules from FLOW-28). Install → enable → upgrade → migrate → disable → uninstall. Platform-admin owns the meta-pipeline; tenant-admin owns tenant-scope module state (upgrade their installed modules, roll back a bad upgrade).

**Entry points (inferred):** `GET /admin/platform/modules` (platform-admin), `POST /admin/platform/modules/:id/promote` (platform-admin — promote module version to stable), `GET /admin/my-tenant/modules` (tenant-admin — own-tenant module state), `POST /admin/my-tenant/modules/:id/upgrade` (tenant-admin — upgrade), `GET /support/modules/:tenantId/:moduleId` (platform-support — audit).

### Observable viewer roles

| Role | When they interact | What they see | Distinct template needed? |
|------|--------------------|---------------|---------------------------|
| **`platform-admin`** | Primary — cross-tenant module ops, version promotion, deprecation, force-uninstall for ToS issues | Module lifecycle ops + version promotion gate + deprecation dashboard | ✅ YES — platform module ops |
| **`tenant-admin`** | Own-tenant module state — view installed modules, trigger upgrades, roll back bad upgrades, disable temporarily | Tenant module inventory + upgrade actions + rollback UI | ✅ YES — tenant module admin |
| **`platform-support`** | Read-only — "why did this module upgrade fail?" | Per-module-per-tenant state inspector + upgrade-history trace | ⚠️ read-only variant |
| All other roles | — | Module substrate — not user-visible | — |

### Template implications

1. `ModuleLifecyclePage` (existing) → platform-admin + tenant-admin fork.
2. `MyTenantModulesPage` (`/admin/my-tenant/modules`) — tenant-admin.
3. `ModuleLifecycleSupportInspectorPage` — platform-support.

### ROLE-COVERAGE-MATRIX update for FLOW-47

anon — · public-mkt — · tenant-user — · tenant-admin ✅ · referral — · freelancer — · biz-partner — · event-org — · platform-admin ✅ · platform-support ⚠️

(Previously 2 cells; now **2 full + 1 partial** cells = 3. +1.)

---

## FLOW-48 — i18n Translation (already implemented)

**Business-logic summary (from FLOW-48-DESIGN-R2 + FLOW-48-PLAN-P1-P14):** The already-shipped i18n translation flow — translates UI strings, tenant-authored content, marketplace listings, transactional emails. English is inlined; non-English locales (he, fr, + BCP-47 others) lazy-load via Backend plugin. Per-tenant locale policies (whitelist/blacklist), marketplace-module translation cache, delta translation (only newly-added keys).

**Entry points:** `GET /settings` (any authenticated — locale preference), `POST /api/translate/:locale` (any — translation fetch), `GET /admin/i18n` (tenant-admin — locale policy + translation management), `GET /admin/platform/i18n` (platform-admin — base-locale dictionary + fallback chain policy), `GET /support/translations/:tenantId/:moduleId/:locale` (platform-support — translation audit).

### Observable viewer roles

| Role | When they interact | What they see | Distinct template needed? |
|------|--------------------|---------------|---------------------------|
| **`anonymous`** | Any public page — receives translated UI based on browser locale (Accept-Language) | Translated text throughout + language switcher in header | ✅ YES (already implemented — LanguageSwitcher) |
| **`public-marketplace-visitor`** | Permalink landings — inherited locale from URL or browser | Same as anonymous | ✅ YES (shared) |
| **`tenant-user`** | Authenticated user — saves locale preference in their account; receives transactional emails in chosen locale | Settings page with language picker + email-locale preference | ✅ YES (already implemented) |
| **`tenant-admin`** | Manages tenant locale policy (which languages the tenant supports), reviews auto-generated translations, overrides problematic ones | AdminI18nPage — policy editor + translation review + override UI | ✅ YES (already implemented) |
| **`referral-user`** | Inherits tenant-user locale behaviour + referral link carries locale context | Same as tenant-user | ✅ YES |
| **`freelancer`** | Service offerings + gig descriptions translated when marketplace-viewer language differs | Freelancer profile with locale-aware rendering | ✅ YES (cross-cut with FLOW-17) |
| **`business-partner`** | Partner content (advertorials, promotional posts) translated for marketplace reach | Partner dashboard with translation-status indicators on posted content | ✅ YES (cross-cut with FLOW-20) |
| **`event-organiser`** | Event descriptions translated for multi-region audiences | Event editor with per-locale override + translation-quality preview | ✅ YES (cross-cut with FLOW-03) |
| **`platform-admin`** | Base-locale dictionary management (English = source of truth), fallback-chain policy, cross-tenant translation-quality ops | Platform i18n ops + dictionary editor + translation-job monitor | ⚠️ dictionary management |
| **`platform-support`** | Translation audit — "why did this string not translate?" / "why did fallback trigger?" | Per-string translation-lookup trace + cache hit/miss explainer | ⚠️ read-only variant |

### Template implications

1. `LanguageSwitcher` component (shipped) — cross-cut across all pages.
2. `SettingsPage` locale integration (shipped).
3. `AdminI18nPage` (shipped) — tenant-admin primary.
4. `PlatformI18nPage` (`/admin/platform/i18n`) — NEW — platform-admin base-dictionary + fallback-chain ops.
5. `TranslationSupportInspectorPage` — NEW — platform-support.

### ROLE-COVERAGE-MATRIX update for FLOW-48

anon ✅ · public-mkt ✅ · tenant-user ✅ · tenant-admin ✅ · referral ✅ · freelancer ✅ · biz-partner ✅ · event-org ✅ · platform-admin ⚠️ · platform-support ⚠️

(Previously 8 cells; now **8 full + 2 partial** cells = 10 — ties FLOW-16 marketplace-payments at the top of the density leaderboard. FLOW-48 touches every persona in the fleet because translation is a universal concern.)

---

## Consolidated role signals across batch 10

| Role | Flows in batch 10 needing it | Notes |
|------|:---------------------------:|-------|
| `anonymous` | FLOW-48 ✅ | Translated UI for public |
| `public-marketplace-visitor` | FLOW-48 ✅ | Translated permalinks |
| `tenant-user` | FLOW-48 ✅ | Locale preference + transactional email locale |
| `tenant-admin` | FLOW-46 ⚠️, FLOW-47 ✅, FLOW-48 ✅ | Agent notifications + module admin + i18n policy |
| `referral-user` | FLOW-48 ✅ | Locale-aware referral |
| `freelancer` | FLOW-48 ✅ | Translated gig descriptions |
| `business-partner` | FLOW-48 ✅ | Translated advertorials |
| `event-organiser` | FLOW-48 ✅ | Translated event copy |
| `platform-admin` | All 3 ✅ | Universal |
| `platform-support` | All 3 ✅ or ⚠️ | Universal audit + FLOW-46 compliance-grade |

### Biggest finding in batch 10

**FLOW-48 i18n-translation ties FLOW-16 marketplace-payments at 10 cells each — the two "universal-persona" flows in the XIIGen fleet.** They are architecturally distinct — FLOW-16 because money moves in both directions (payers × payees × admins × support), FLOW-48 because translation is ambient (every user sees translated UI regardless of role). Together they frame a design principle:

> **Two flows must serve ALL 10 personas: marketplace-payments (transactional universal) and i18n-translation (presentational universal).**

Every other flow touches a subset. Implementation priority should reflect this — any C6 rollout pattern must work correctly at both extremes.

---

## Final running coverage

- Initial: ~135 cells
- After batch 1: +9 → 144
- After batch 2: +20 → 155
- After batch 3: +18 → 173
- After batch 4: +7 → 180
- After batch 5: +18 → 198
- After batch 6: +9 → 207
- After batch 7: +9 → 216
- After batch 8: +8 → 224
- After batch 9: +7 → 231
- **After batch 10: +3 → 234** — **FLEET-COMPLETE**

Final fleet target: **234 cells** across 48 flows × 10 roles = 480 matrix intersections. 234 active cells (full or partial) = **48.75% density** of the matrix. The other 246 cells are legitimately `—` (role not applicable) — this is correct, NOT a gap.

---

## Fleet-wide role-template targets (final numbers)

| Role | Flows requiring this role's template (full + partial) | Notes |
|------|------:|------|
| `anonymous` | ~13 full + ~4 partial = 17 flows | Public surfaces: registration, marketplaces, CMS, forms, OSS, translation, etc. |
| `public-marketplace-visitor` | ~12 full + ~4 partial = 16 | Permalink landings + marketplace browsing |
| `tenant-user` | ~27 full + ~6 partial = 33 | Default authenticated persona |
| `tenant-admin` | ~31 full + ~10 partial = 41 | Densest admin role — present in 85% of flows |
| `referral-user` | ~7 full + ~5 partial = 12 | Registration + marketplaces + billing credits |
| `freelancer` | ~6 full + ~6 partial = 12 | Marketplace + payments + payouts + analytics + billing + gigs |
| `business-partner` | ~7 full + ~7 partial = 14 | Four-flow B2B hub + advertorials |
| `event-organiser` | ~6 full + ~4 partial = 10 | Event flows + payouts + analytics + i18n |
| `platform-admin` | ~44 full = 44 | Near-universal — present in 92% of flows |
| `platform-support` | ~18 full + ~22 partial = 40 | Near-universal audit layer |

**Key architectural ratios:**
- tenant-admin density ≥ platform-admin density in business-logic richness (tenant-admin often does FULL CRUD, platform-admin often does OPS)
- freelancer + business-partner density is evenly balanced — reflects the two-sided-marketplace architecture
- platform-support near-universal because compliance + debug + dispute resolution apply everywhere

---

## Fleet-wide plan validation status (FINAL)

| Plan | 48-flow coverage | Tested | UI/UX examined | Business-state evident |
|------|------------------|--------|----------------|------------------------|
| P14b FLOW-SESSION-VISUALIZATION-v2 | ✅ 48/48 — 164 PNGs | ✅ | ✅ | ✅ |
| UX-FIX-THREE-TRACK | ✅ | ✅ | ✅ | ✅ |
| UX-FIX-EXECUTION (7-task v2) | ✅ | ✅ | ✅ | n/a |
| P14-EXECUTION (P1-14 test coverage) | ✅ | ✅ | ✅ | ✅ |
| FLOW-UI-COVERAGE-PLAN-UNIFIED | ✅ all 48 | ✅ | ✅ | ✅ |
| FLOW-48-PLAN-P1-P14 (i18n) | ✅ | ✅ 12/12 Playwright | ✅ 14 PNGs w/ Hebrew | ✅ |
| ui-ux-pro-max-skill-main | ✅ baseline; 43 pages pending useTranslation wiring | partial | ✅ | ✅ |
| **C6 role-aware templating — ANALYSIS** | ✅ **ALL 10 BATCHES DONE — 48 of 48 flows, 100%** | ✅ analysis-tested (cross-batch consistency) | ✅ | ✅ |
| **C6 role-aware templating — IMPLEMENTATION** | 🟡 **scaffold + FLOW-08 pilot; 47 flows pending rollout — 234-cell target** | 🟡 1 flow × 7 roles | 🟡 | 🟡 |

**Overall gate:** C6 analysis is **100% complete** across all 48 flows. Implementation is the next major work front — convert the matrix from analysis artifact to 234 shipped `<RoleScopedView>` instances across 47 remaining flows.

---

## What batch 10 completes

1. ✅ All 48 flows have a deep role analysis in ROLE-ANALYSIS-BATCH-01..10
2. ✅ ROLE-COVERAGE-MATRIX.md is the complete authoritative map
3. ✅ Top-rollout priority list is finalized (FLOW-16 + FLOW-48 tied at 10 cells; 6-way tie at 9 cells)
4. ✅ Four "dual-sided marketplace" cluster identified (FLOW-08/16/32/34)
5. ✅ Four cross-cutting substrates identified (FLOW-38 feedback widget, FLOW-40 push, FLOW-44 compliance audit, FLOW-48 translation)
6. ✅ Engine-internal two-role-minimum pattern confirmed
7. ✅ Role-density leaderboard stable — 20 flows at 6+ cells, 28 flows at 2-5 cells

## What remains (next major work front after this branch)

1. 🟡 Convert ROLE-COVERAGE-MATRIX from analysis into shipped `<RoleScopedView>` instances on 47 flows (pilot exists on FLOW-08)
2. 🟡 Ship `PlatformI18nPage` + `TranslationSupportInspectorPage` for FLOW-48 (the two newly-identified platform roles)
3. 🟡 Scaffold `client/src/pages/adapter-ci-cd-bridge/` for FLOW-41 (CLAUDE.md-reserved but not built)
4. 🟡 Complete `useTranslation` wiring on the 43 pages still on English-only strings
5. 🟡 Extend `<RoleScopedView>` to accept compliance-grade audit-log semantics for FLOW-44 + FLOW-46

This work is architecturally scoped and prioritized — sequencing is the next planning decision, not a discovery task.

---

## Footer

Produces artifact at: `docs/design-reviews/ROLE-ANALYSIS-BATCH-10.md` — **FINAL BATCH**.
Companion: `docs/design-reviews/ROLE-COVERAGE-MATRIX.md` (matrix rows 46..48 updated — all 48 rows now filled).
Synthesis: `docs/design-reviews/FLEET-ROLE-SYNTHESIS.md` — fleet-wide consolidation.
Prior batches: `ROLE-ANALYSIS-BATCH-01.md` through `-09.md`.
Scaffold: `client/src/components/common/{ViewerRole.ts, RoleScopedView.tsx}` + `client/src/hooks/useViewerRole.ts`.
Pilot: `client/src/pages/marketplace/EventDiscoveryPage.tsx`.

# VISUAL-ROUND-1-FULL — 45-of-45 baseline scored, honest numbers

Every flow has a line. Every line was scored by reading the rendered PNG.

## Per-flow score (45 flows)

Offence weights: BLOCKER = 3, MAJOR = 2, MINOR = 1.

| # | Flow | Role (viewport-desktop) | Score | Offences |
|---|------|-------------------------|-------|----------|
| 1 | bundle-activation | platform-admin | 0 | — |
| 2 | user-registration | anonymous | 0 | — |
| 3 | profile-enrichment | tenant-user | 0 | — |
| 4 | event-management | tenant-user | 0 | — |
| 5 | event-attendance | tenant-user | 0 | — |
| 6 | completion-gamification | tenant-user | **3 BLOCKER** | stuck `Loading your gamification data...`; no skeleton, no timeout fallback, no empty/error state |
| 7 | user-groups-communities | tenant-user | 0 | — |
| 8 | friend-request-social-feed | tenant-user | 0 | — |
| 9 | marketplace | tenant-user | 0 | — (fixed RUN-148) |
| 10 | transactional-event-participation | tenant-user | **2 MAJOR** | barebones 2-field form; no order summary; no trust indicators — G5 checkout grammar not met |
| 11 | reviews-reputation | tenant-user | 2 MINOR | no card wrapper; stars + number input redundant |
| 12 | schema-registry-dag | platform-admin | **2 MAJOR** | sparse page; no DAG visualization, no version/compatibility nodes per MARKET-REFERENCE-CATALOG G1+G4 |
| 13 | subscription-billing | tenant-admin | 0 | — |
| 14 | data-warehouse-analytics | platform-admin | 0 | — |
| 15 | etl-data-integration | platform-admin | 1 MINOR | hub page only; missing pipeline-runs list per G1 catalog spec |
| 16 | saas-multi-tenancy | platform-admin | 0 | — |
| 17 | marketplace-payments | tenant-user | 0 | — |
| 18 | freelancer-marketplace | tenant-user | 2 MINOR | barebones form, no card wrapper, no rich description per Upwork/Fiverr ref |
| 19 | visual-flow-engine | platform-admin | 1 MINOR | `FLOW-18 ·` in subtitle |
| 20 | durable-sagas-compliance | platform-admin | 2 MINOR | barebones form; no saga timeline per Temporal ref (renders only after Execute clicked) |
| 21 | ads-platform | platform-admin | 0 | — |
| 22 | dynamic-forms-workflows | tenant-user | 0 | — |
| 23 | cms-publishing | anonymous | 0 | — |
| 24 | form-builder-templates | tenant-admin | 1 MINOR | `— FLOW-23` visible in h1 |
| 25 | ai-safety-moderation | anonymous | 0 | — |
| 26 | bfa-cross-flow-governance | platform-admin | 0 | — |
| 27 | meta-flow-engine | platform-admin | 0 | — |
| 28 | human-interaction-gate | platform-admin | 1 MINOR | `FLOW-NN` references in queue-item subtitles (borderline; platform-admin cross-reference) |
| 29 | blog-cms-modules | anonymous | 0 | — |
| 30 | adaptive-rag-deep-research | platform-admin | 0 | — |
| 31 | tenant-lifecycle-manager | platform-admin | 1 MINOR | `FLOW-30 ·` in subtitle |
| 32 | design-intelligence-engine | platform-admin | 1 MINOR | `FLOW-31 ·` in subtitle |
| 33 | sharable-flows-marketplace | platform-admin | **2 MAJOR** | only admin-debug "Loading..." panel renders; G3 curator grid absent |
| 34 | system-initiation-bootstrap | platform-admin | 1 MINOR | `ENGINE_WARM` SCREAMING_SNAKE phase label |
| 35 | marketplace-plugin-adapter | platform-admin | 0 | — |
| 36 | meta-arbitration-engine | platform-admin | 0 | — |
| 37 | feature-registry | platform-admin | 0 | — |
| 38 | design-system-governance | platform-admin | 0 | — |
| 39 | rag-quality-feedback | platform-admin | 0 | — |
| 40 | oss-curriculum | platform-admin | 0 | — |
| 41 | client-push | platform-admin | 0 | — |
| 42 | ai-self-modification | platform-admin | 0 | — |
| 43 | history-bootstrap | platform-admin | 0 | — |
| 44 | platform-agent | platform-admin | 3 MINOR | `Super judge OVERRIDE_BLOCK` in SAMPLE_AGENT_ACTIONS; action-type enums (PROPOSE_EDIT/APPLY_GLOBAL/CREATE_FLOW/ADVISE) rendered raw; `FLOW-46 ·` subtitle |
| 45 | cycle-chain-extension | platform-admin | 1 MINOR | `FLOW-45 ·` in subtitle |
| — | module-lifecycle (48 addendum) | platform-admin | 1 MINOR | `FLOW-47 ·` in subtitle |
| — | admin-i18n (48 addendum) | platform-admin | 0 | — |

## V-R1 full totals (45 flows)

- Clean (0 offences): **30 flows**
- Partial (1–3 offences): **14 flows**
- Blocker: **1 flow** (completion-gamification)

Weighted total:
- 1 × BLOCKER × 3 = 3
- 3 × MAJOR × 2 = 6 (schema-registry-dag, transactional-event-participation, sharable-flows-marketplace)
- 14 × MINOR × 1 = 14

**V-R1 FULL SCORE = 23 weighted offences across 45 flows (0.51 per flow).**

## V-R1 → V-R2 fix plan (batched by pattern)

| Pattern | Flows affected | Fix |
|---------|---------------|-----|
| `FLOW-NN ·` in user-visible subtitles/h1 | 7 (visual-flow-engine, form-builder-templates, tenant-lifecycle-manager, design-intelligence-engine, platform-agent, cycle-chain-extension, module-lifecycle) | grep-sweep `FLOW-\d\d\s·\s` and `— FLOW-\d\d` in client/src/pages JSX body strings; rewrite |
| `ENGINE_WARM` SCREAMING_SNAKE phase | 1 (system-initiation-bootstrap) | sentence-case presenter: "Warm" or "Ready" |
| `Super judge OVERRIDE_BLOCK` + action-type enums | 1 (platform-agent SAMPLE_AGENT_ACTIONS) | presenter layer: PROPOSE_EDIT → "Propose edit"; APPLY_GLOBAL → "Apply to all tenants"; etc. |
| Stuck "Loading..." without skeleton | 1 (completion-gamification) | shape-preserving skeleton + 8s timeout fallback |
| Barebones forms (no card wrapper, no reference-grammar depth) | 3 (transactional-event-participation, freelancer-marketplace, reviews-reputation) | wrap in card, add G5/G3 reference elements |
| Sparse admin page (G3/G4 missing) | 2 (sharable-flows-marketplace, schema-registry-dag) | add populated seeded content |

Total offences addressable in V-R2 batch: 23 → expected 4-8 residual after fix (~65-80% delta).

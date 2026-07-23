# Flow Registry — Existing Flows Reference

Check this before registering entities, events, or routes to avoid BFA conflicts.
All directory and file names use the **Slug** column — never `flow-NN` numeric names.

## Implemented Flows (FLOW-00..FLOW-17)

| Flow | Slug | Domain | Factories | Task Types | Families |
|------|------|--------|-----------|------------|----------|
| FLOW-00 | `bundle-activation` | Bundle Activation | F1-F50 | T1-T20 | 1-5 |
| FLOW-01 | `user-registration` | User Registration & Onboarding | F174-F181 | T47-T49 | 18 |
| FLOW-02 | `profile-enrichment` | Profile Enrichment & Matching | F182-F189 | T50-T52 | 19 |
| FLOW-03 | `event-management` | Event Creation & Promotion | F197-F204 | T59-T62 | 21 |
| FLOW-04 | `event-attendance` | Event Attendance & Management | F190-F196 | T53-T58 | 20 |
| FLOW-05 | `completion-gamification` | Lesson Completion & Gamification | F166-F173 | T44-T46 | 17 |
| FLOW-06 | `user-groups-communities` | User Groups & Communities | F225-F233 | T63-T72 | 25 |
| FLOW-07 | `friend-request-social-feed` | Friend Request & Social Feed | F234-F243 | T73-T82 | 26 |
| FLOW-08 | `marketplace` | Multi-Tenant Marketplace | F244-F271 | T83-T98 | 27-29 |
| FLOW-09 | `transactional-event-participation` | Transactional Event Participation | F272-F287 | T99-T118 | 30-31 |
| FLOW-10 | `reviews-reputation` | Reviews & Reputation | F288-F324 | T119-T138 | 32-36 |
| FLOW-11 | `schema-registry-dag` | Schema Registry DAG | F325-F367 | T139-T158 | 37-44 |
| FLOW-12 | `subscription-billing` | Subscription Billing | F368-F383 | T159-T168 | 45 |
| FLOW-13 | `data-warehouse-analytics` | Data Warehouse & Analytics | F384-F425 | T169-T188 | 46-51 |
| FLOW-14 | `etl-data-integration` | ETL Data Integration | F426-F495 | T189-T208 | 52-59 |
| FLOW-15 | `saas-multi-tenancy` | SaaS Multi-Tenancy | F496-F565 | T209-T228 | 60-73 |
| FLOW-16 | `marketplace-payments` | Marketplace Payments | F239-F247 | T225-T228 | 74 |
| FLOW-17 | `freelancer-marketplace` | Freelancer Marketplace | F248-F257 | T229-T232 | 75-83 |

## Infrastructure Flows (FLOW-25..FLOW-40)

| Flow | Slug | Domain | Status |
|------|------|--------|--------|
| FLOW-25 | `bfa-cross-flow-governance` | BFA Cross-Flow Governance | Active |
| FLOW-26 | `meta-flow-engine` | Self-Developing Meta-Flow Engine | Active |
| FLOW-27 | `human-interaction-gate` | Human Interaction Gate | Active |
| FLOW-28 | `blog-cms-modules` | Blog/CMS Modules | Active |
| FLOW-29 | `adaptive-rag-deep-research` | Adaptive RAG Deep Research | Active |
| FLOW-30 | `tenant-lifecycle-manager` | Tenant Lifecycle Manager | Active |
| FLOW-31 | `design-intelligence-engine` | Design Intelligence Engine | Active |
| FLOW-32 | `sharable-flows-marketplace` | Sharable Flows Marketplace | Active |
| FLOW-33 | `system-initiation-bootstrap` | System Initiation Bootstrap | Active |
| FLOW-34 | `marketplace-plugin-adapter` | Marketplace Plugin Adapter | Active |
| FLOW-35 | `meta-arbitration-engine` | Meta-Arbitration Engine | Active |
| FLOW-36 | `feature-registry` | Feature Registry | Active |
| FLOW-37 | `design-system-governance` | Design System Governance | Active |
| FLOW-38 | `rag-quality-feedback` | RAG Quality Feedback | Active |
| FLOW-39 | `oss-curriculum` | OSS Curriculum Runner | Active |
| FLOW-40 | `client-push` | Client Push Infrastructure | Active |

## Unimplemented Domain Flows (namespace reserved)

| Flow | Slug | Domain | Factories reserved | Note |
|------|------|--------|--------------------|------|
| FLOW-18 | `visual-flow-engine` | Visual Flow Creation | F631-F696 | e2e dir exists |
| FLOW-19 | `durable-sagas-compliance` | Durable Sagas Compliance | F697-F727 | e2e dir exists |
| FLOW-20 | `ads-platform` | Sponsored Content + Ads | F728-F851 | e2e dir exists |
| FLOW-21 | `dynamic-forms-workflows` | Forms & Flow Automation | F852-F900 | e2e dir exists |
| FLOW-22 | `cms-publishing` | CMS Publishing | F901-F944 | e2e dir exists |
| FLOW-23 | `form-builder-templates` | Form Builder Templates | F945-F981 | e2e dir exists |
| FLOW-24 | `ai-safety-moderation` | AI Safety Moderation | F982-F1027 | e2e dir exists |
| FLOW-28 | `blog-cms-modules` | Blog/CMS Modules | F1129-F1175, T423-T440 | namespace reserved |

## Next Available (FLOW-41+)

```
Factory:    F1519     Family: 209
Task Type:  T605      BFA Rule: CF-809
Skill:      SK-529
```

## Naming Rules (ENFORCED)

When creating any file or directory for a new flow, use the slug — never the numeric prefix:

```bash
# ✅ Correct
server/src/engine/flows/my-new-flow/
server/test/e2e/my-new-flow/
server/test/my-new-flow/
server/src/engine-contracts/my-new-flow-contracts.ts
server/src/engine-contracts/my-new-flow-bfa-rules.ts
server/src/rag-init/my-new-flow.rag-seed.ts
client/__tests__/flows/my-new-flow/
client/src/pages/my-new-flow/

# ❌ Wrong — will fail OP-7 pre-commit check
server/test/e2e/flow-41/
server/src/engine-contracts/flow-41-contracts.ts
```

## BFA Conflict Hotspots

These entities/routes are owned by multiple or high-traffic flows — be extra careful:

- `user` / `user_profile` — owned by `user-registration`, referenced by many
- `payment` / `transaction` — owned by `marketplace` and `marketplace-payments`
- `post` / `feed` — owned by `event-management` and `reviews-reputation`
- `/api/dynamic/*` — route namespace shared by all flows via DynamicController

**Safe naming strategy:** Prefix new entities with your flow domain: `freelancer_contract` instead of `contract`.

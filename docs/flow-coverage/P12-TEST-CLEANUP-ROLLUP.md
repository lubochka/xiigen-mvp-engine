# Cross-Flow P12 Test Cleanup Roll-Up

Flows analyzed: 47 | CLEAN: 13 | NEEDS_FIX: 34 | .todo: 0 | unconditional .skip: 131 | false-green: 2 | duplicate specs: 3

| Flow | Slug | Status | client/e2e | e2e/tests | server/test | .todo | .skip (u) | false-green | dup |
|------|------|--------|-----------:|----------:|------------:|------:|----------:|------------:|----:|
| FLOW-00 | `bundle-activation` | NEEDS_FIX | 2 | 0 | 0 | 0 | 2 | 0 | 0 |
| FLOW-01 | `user-registration` | CLEAN | 1 | 0 | 2 | 0 | 0 | 0 | 0 |
| FLOW-02 | `profile-enrichment` | CLEAN | 1 | 0 | 2 | 0 | 0 | 0 | 0 |
| FLOW-03 | `event-management` | NEEDS_FIX | 2 | 1 | 1 | 0 | 19 | 0 | 1 |
| FLOW-04 | `event-attendance` | NEEDS_FIX | 3 | 1 | 1 | 0 | 19 | 0 | 1 |
| FLOW-05 | `completion-gamification` | CLEAN | 0 | 0 | 2 | 0 | 0 | 0 | 0 |
| FLOW-06 | `user-groups-communities` | CLEAN | 0 | 0 | 2 | 0 | 0 | 0 | 0 |
| FLOW-07 | `friend-request-social-feed` | CLEAN | 0 | 0 | 2 | 0 | 0 | 0 | 0 |
| FLOW-08 | `marketplace` | NEEDS_FIX | 4 | 0 | 7 | 0 | 4 | 0 | 0 |
| FLOW-09 | `transactional-event-participation` | NEEDS_FIX | 1 | 0 | 2 | 0 | 11 | 0 | 0 |
| FLOW-10 | `reviews-reputation` | NEEDS_FIX | 1 | 0 | 3 | 0 | 11 | 0 | 0 |
| FLOW-11 | `schema-registry-dag` | NEEDS_FIX | 1 | 0 | 3 | 0 | 8 | 0 | 0 |
| FLOW-12 | `subscription-billing` | CLEAN | 1 | 0 | 2 | 0 | 0 | 0 | 0 |
| FLOW-13 | `data-warehouse-analytics` | NEEDS_FIX | 2 | 0 | 1 | 0 | 2 | 0 | 0 |
| FLOW-14 | `etl-data-integration` | NEEDS_FIX | 2 | 0 | 2 | 0 | 2 | 0 | 0 |
| FLOW-15 | `saas-multi-tenancy` | CLEAN | 0 | 0 | 3 | 0 | 0 | 0 | 0 |
| FLOW-16 | `marketplace-payments` | CLEAN | 0 | 0 | 3 | 0 | 0 | 0 | 0 |
| FLOW-17 | `freelancer-marketplace` | CLEAN | 0 | 0 | 3 | 0 | 0 | 0 | 0 |
| FLOW-18 | `visual-flow-engine` | CLEAN | 0 | 0 | 3 | 0 | 0 | 0 | 0 |
| FLOW-19 | `durable-sagas-compliance` | CLEAN | 0 | 0 | 3 | 0 | 0 | 0 | 0 |
| FLOW-20 | `ads-platform` | CLEAN | 0 | 0 | 3 | 0 | 0 | 0 | 0 |
| FLOW-21 | `dynamic-forms-workflows` | NEEDS_FIX | 2 | 0 | 3 | 0 | 2 | 0 | 0 |
| FLOW-22 | `cms-publishing` | NEEDS_FIX | 2 | 0 | 2 | 0 | 2 | 0 | 0 |
| FLOW-23 | `form-builder-templates` | CLEAN | 0 | 0 | 3 | 0 | 0 | 0 | 0 |
| FLOW-24 | `ai-safety-moderation` | NEEDS_FIX | 2 | 0 | 1 | 0 | 2 | 0 | 0 |
| FLOW-25 | `bfa-cross-flow-governance` | NEEDS_FIX | 2 | 0 | 0 | 0 | 2 | 0 | 0 |
| FLOW-26 | `meta-flow-engine` | NEEDS_FIX | 2 | 0 | 0 | 0 | 2 | 0 | 0 |
| FLOW-27 | `human-interaction-gate` | NEEDS_FIX | 2 | 0 | 0 | 0 | 2 | 0 | 0 |
| FLOW-28 | `blog-cms-modules` | NEEDS_FIX | 2 | 0 | 2 | 0 | 2 | 2 | 0 |
| FLOW-29 | `adaptive-rag-deep-research` | NEEDS_FIX | 2 | 0 | 0 | 0 | 2 | 0 | 0 |
| FLOW-30 | `tenant-lifecycle-manager` | NEEDS_FIX | 2 | 0 | 0 | 0 | 2 | 0 | 0 |
| FLOW-31 | `design-intelligence-engine` | NEEDS_FIX | 2 | 0 | 0 | 0 | 2 | 0 | 0 |
| FLOW-32 | `sharable-flows-marketplace` | NEEDS_FIX | 2 | 0 | 0 | 0 | 2 | 0 | 0 |
| FLOW-33 | `system-initiation-bootstrap` | NEEDS_FIX | 2 | 0 | 0 | 0 | 2 | 0 | 0 |
| FLOW-34 | `marketplace-plugin-adapter` | NEEDS_FIX | 2 | 0 | 0 | 0 | 2 | 0 | 0 |
| FLOW-35 | `meta-arbitration-engine` | NEEDS_FIX | 2 | 0 | 0 | 0 | 2 | 0 | 0 |
| FLOW-36 | `feature-registry` | NEEDS_FIX | 3 | 1 | 0 | 0 | 2 | 0 | 1 |
| FLOW-37 | `design-system-governance` | NEEDS_FIX | 2 | 0 | 0 | 0 | 2 | 0 | 0 |
| FLOW-38 | `rag-quality-feedback` | NEEDS_FIX | 2 | 0 | 0 | 0 | 2 | 0 | 0 |
| FLOW-39 | `oss-curriculum` | NEEDS_FIX | 3 | 0 | 0 | 0 | 2 | 0 | 0 |
| FLOW-40 | `client-push` | NEEDS_FIX | 3 | 0 | 0 | 0 | 2 | 0 | 0 |
| FLOW-42 | `rag-quality-graph` | NEEDS_FIX | 2 | 0 | 0 | 0 | 2 | 0 | 0 |
| FLOW-43 | `meta-flow-orchestration` | NEEDS_FIX | 2 | 0 | 0 | 0 | 2 | 0 | 0 |
| FLOW-44 | `ai-self-modification` | NEEDS_FIX | 2 | 0 | 0 | 0 | 2 | 0 | 0 |
| FLOW-45 | `cycle-chain-extension` | NEEDS_FIX | 2 | 0 | 0 | 0 | 2 | 0 | 0 |
| FLOW-46 | `platform-agent` | NEEDS_FIX | 3 | 0 | 0 | 0 | 4 | 0 | 0 |
| FLOW-47 | `module-lifecycle` | NEEDS_FIX | 2 | 0 | 1 | 0 | 3 | 0 | 0 |

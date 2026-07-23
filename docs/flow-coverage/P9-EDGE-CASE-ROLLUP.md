# Cross-Flow P9 Edge Case Roll-Up

Flows analyzed: 47 | Total edge cases: 441 | CF-covered rows: 119 | CRITICAL: 15 | HIGH: 364 | MEDIUM: 62 | SERVER_REQUIRED: 377 | CLIENT_ONLY: 64

| Flow | Slug | CF Rules | Rows | CRITICAL | HIGH | MEDIUM | SERVER_REQUIRED | CLIENT_ONLY |
|------|------|---------:|-----:|---------:|-----:|-------:|----------------:|------------:|
| FLOW-00 | `bundle-activation` | 0 | 10 | 0 | 8 | 2 | 8 | 2 |
| FLOW-01 | `user-registration` | 4 | 9 | 3 | 5 | 1 | 8 | 1 |
| FLOW-02 | `profile-enrichment` | 4 | 9 | 1 | 7 | 1 | 8 | 1 |
| FLOW-03 | `event-management` | 4 | 10 | 3 | 6 | 1 | 9 | 1 |
| FLOW-04 | `event-attendance` | 4 | 9 | 2 | 6 | 1 | 8 | 1 |
| FLOW-05 | `completion-gamification` | 4 | 18 | 1 | 14 | 3 | 15 | 3 |
| FLOW-06 | `user-groups-communities` | 4 | 11 | 1 | 9 | 1 | 10 | 1 |
| FLOW-07 | `friend-request-social-feed` | 4 | 18 | 1 | 14 | 3 | 15 | 3 |
| FLOW-08 | `marketplace` | 4 | 14 | 1 | 11 | 2 | 12 | 2 |
| FLOW-09 | `transactional-event-participation` | 7 | 20 | 0 | 18 | 2 | 17 | 3 |
| FLOW-10 | `reviews-reputation` | 4 | 12 | 1 | 10 | 1 | 10 | 2 |
| FLOW-11 | `schema-registry-dag` | 4 | 16 | 1 | 13 | 2 | 14 | 2 |
| FLOW-12 | `subscription-billing` | 4 | 11 | 0 | 10 | 1 | 10 | 1 |
| FLOW-13 | `data-warehouse-analytics` | 0 | 6 | 0 | 5 | 1 | 5 | 1 |
| FLOW-14 | `etl-data-integration` | 0 | 6 | 0 | 5 | 1 | 5 | 1 |
| FLOW-15 | `saas-multi-tenancy` | 4 | 9 | 0 | 8 | 1 | 8 | 1 |
| FLOW-16 | `marketplace-payments` | 7 | 12 | 0 | 11 | 1 | 11 | 1 |
| FLOW-17 | `freelancer-marketplace` | 4 | 9 | 0 | 8 | 1 | 8 | 1 |
| FLOW-18 | `visual-flow-engine` | 4 | 9 | 0 | 8 | 1 | 8 | 1 |
| FLOW-19 | `durable-sagas-compliance` | 4 | 9 | 0 | 8 | 1 | 8 | 1 |
| FLOW-20 | `ads-platform` | 4 | 9 | 0 | 8 | 1 | 8 | 1 |
| FLOW-21 | `dynamic-forms-workflows` | 4 | 9 | 0 | 8 | 1 | 8 | 1 |
| FLOW-22 | `cms-publishing` | 6 | 11 | 0 | 10 | 1 | 10 | 1 |
| FLOW-23 | `form-builder-templates` | 12 | 17 | 0 | 16 | 1 | 16 | 1 |
| FLOW-24 | `ai-safety-moderation` | 6 | 11 | 0 | 10 | 1 | 10 | 1 |
| FLOW-25 | `bfa-cross-flow-governance` | 0 | 5 | 0 | 4 | 1 | 4 | 1 |
| FLOW-26 | `meta-flow-engine` | 0 | 9 | 0 | 7 | 2 | 7 | 2 |
| FLOW-27 | `human-interaction-gate` | 0 | 9 | 0 | 7 | 2 | 7 | 2 |
| FLOW-28 | `blog-cms-modules` | 3 | 8 | 0 | 7 | 1 | 7 | 1 |
| FLOW-29 | `adaptive-rag-deep-research` | 0 | 5 | 0 | 4 | 1 | 4 | 1 |
| FLOW-30 | `tenant-lifecycle-manager` | 0 | 5 | 0 | 4 | 1 | 4 | 1 |
| FLOW-31 | `design-intelligence-engine` | 0 | 5 | 0 | 4 | 1 | 4 | 1 |
| FLOW-32 | `sharable-flows-marketplace` | 0 | 5 | 0 | 4 | 1 | 4 | 1 |
| FLOW-33 | `system-initiation-bootstrap` | 0 | 5 | 0 | 4 | 1 | 4 | 1 |
| FLOW-34 | `marketplace-plugin-adapter` | 0 | 5 | 0 | 4 | 1 | 4 | 1 |
| FLOW-35 | `meta-arbitration-engine` | 0 | 5 | 0 | 4 | 1 | 4 | 1 |
| FLOW-36 | `feature-registry` | 3 | 22 | 0 | 18 | 4 | 18 | 4 |
| FLOW-37 | `design-system-governance` | 0 | 5 | 0 | 4 | 1 | 4 | 1 |
| FLOW-38 | `rag-quality-feedback` | 0 | 5 | 0 | 4 | 1 | 4 | 1 |
| FLOW-39 | `oss-curriculum` | 2 | 7 | 0 | 6 | 1 | 6 | 1 |
| FLOW-40 | `client-push` | 2 | 7 | 0 | 6 | 1 | 6 | 1 |
| FLOW-42 | `rag-quality-graph` | 0 | 5 | 0 | 4 | 1 | 4 | 1 |
| FLOW-43 | `meta-flow-orchestration` | 0 | 5 | 0 | 4 | 1 | 4 | 1 |
| FLOW-44 | `ai-self-modification` | 0 | 5 | 0 | 4 | 1 | 4 | 1 |
| FLOW-45 | `cycle-chain-extension` | 0 | 5 | 0 | 4 | 1 | 4 | 1 |
| FLOW-46 | `platform-agent` | 3 | 20 | 0 | 17 | 3 | 17 | 3 |
| FLOW-47 | `module-lifecycle` | 0 | 5 | 0 | 4 | 1 | 4 | 1 |

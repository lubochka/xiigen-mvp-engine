# Cross-Flow P3 Automation Gap Roll-Up

Flows analyzed: 47 | TESTED: 92 | PARTIAL: 40 | NOT_TESTED: 188

| Flow | Slug | P2 | TESTED | PARTIAL | NOT_TESTED | Auth Spec | Duplicates |
|------|------|----|-------:|--------:|-----------:|-----------|-----------:|
| FLOW-00 | `bundle-activation` | ADMIN_COVERED | 0 | 1 | 9 | `bundle-activation-crud.spec.ts` | 1 |
| FLOW-01 | `user-registration` | COVERED | 2 | 3 | 3 | `user-registration.spec.ts` | 0 |
| FLOW-02 | `profile-enrichment` | COVERED | 4 | 2 | 2 | `profile-enrichment.spec.ts` | 0 |
| FLOW-03 | `event-management` | COVERED | 1 | 7 | 2 | `event-management-event-attendance-teaching-pipeline.spec.ts` | 2 |
| FLOW-04 | `event-attendance` | COVERED | 0 | 0 | 9 | `flow04-event-attendance.spec.ts` | 3 |
| FLOW-05 | `completion-gamification` | COVERED | 0 | 0 | 18 | `—` | 0 |
| FLOW-06 | `user-groups-communities` | COVERED | 0 | 0 | 11 | `—` | 0 |
| FLOW-07 | `friend-request-social-feed` | COVERED | 0 | 0 | 18 | `—` | 0 |
| FLOW-08 | `marketplace` | COVERED | 0 | 9 | 5 | `marketplace-plugin-adapter-crud.spec.ts` | 3 |
| FLOW-09 | `transactional-event-participation` | COVERED | 0 | 4 | 16 | `transactional-event-participation.spec.ts` | 0 |
| FLOW-10 | `reviews-reputation` | COVERED | 8 | 3 | 1 | `reviews-reputation.spec.ts` | 0 |
| FLOW-11 | `schema-registry-dag` | COVERED | 10 | 2 | 4 | `schema-registry-dag.spec.ts` | 0 |
| FLOW-12 | `subscription-billing` | COVERED | 10 | 1 | 0 | `subscription-billing.spec.ts` | 0 |
| FLOW-13 | `data-warehouse-analytics` | COVERED | 1 | 0 | 5 | `data-warehouse-analytics-crud.spec.ts` | 1 |
| FLOW-14 | `etl-data-integration` | COVERED | 1 | 0 | 5 | `etl-data-integration-crud.spec.ts` | 1 |
| FLOW-15 | `saas-multi-tenancy` | COVERED | 0 | 0 | 6 | `—` | 0 |
| FLOW-16 | `marketplace-payments` | COVERED | 0 | 0 | 6 | `—` | 0 |
| FLOW-17 | `freelancer-marketplace` | COVERED | 0 | 0 | 6 | `—` | 0 |
| FLOW-18 | `visual-flow-engine` | ADMIN_COVERED | 0 | 0 | 6 | `—` | 0 |
| FLOW-19 | `durable-sagas-compliance` | COVERED | 0 | 0 | 6 | `—` | 0 |
| FLOW-20 | `ads-platform` | COVERED | 0 | 0 | 6 | `—` | 0 |
| FLOW-21 | `dynamic-forms-workflows` | COVERED | 0 | 1 | 5 | `dynamic-forms-workflows-crud.spec.ts` | 1 |
| FLOW-22 | `cms-publishing` | COVERED | 1 | 0 | 5 | `cms-publishing-crud.spec.ts` | 1 |
| FLOW-23 | `form-builder-templates` | COVERED | 0 | 0 | 6 | `—` | 0 |
| FLOW-24 | `ai-safety-moderation` | COVERED | 0 | 0 | 6 | `ai-safety-moderation-crud.spec.ts` | 1 |
| FLOW-25 | `bfa-cross-flow-governance` | ADMIN_COVERED | 1 | 1 | 2 | `bfa-cross-flow-governance-crud.spec.ts` | 1 |
| FLOW-26 | `meta-flow-engine` | ADMIN_COVERED | 0 | 1 | 8 | `meta-flow-engine-crud.spec.ts` | 1 |
| FLOW-27 | `human-interaction-gate` | ADMIN_COVERED | 0 | 1 | 8 | `human-interaction-gate-crud.spec.ts` | 1 |
| FLOW-28 | `blog-cms-modules` | COVERED | 1 | 0 | 0 | `blog-cms-modules-crud.spec.ts` | 1 |
| FLOW-29 | `adaptive-rag-deep-research` | ADMIN_COVERED | 1 | 0 | 0 | `adaptive-rag-deep-research-crud.spec.ts` | 1 |
| FLOW-30 | `tenant-lifecycle-manager` | ADMIN_COVERED | 1 | 0 | 0 | `tenant-lifecycle-manager-crud.spec.ts` | 1 |
| FLOW-31 | `design-intelligence-engine` | ADMIN_COVERED | 1 | 0 | 0 | `design-intelligence-engine-crud.spec.ts` | 1 |
| FLOW-32 | `sharable-flows-marketplace` | ADMIN_COVERED | 1 | 0 | 0 | `sharable-flows-marketplace-crud.spec.ts` | 1 |
| FLOW-33 | `system-initiation-bootstrap` | ADMIN_COVERED | 1 | 0 | 0 | `system-initiation-bootstrap-crud.spec.ts` | 1 |
| FLOW-34 | `marketplace-plugin-adapter` | COVERED | 1 | 0 | 0 | `marketplace-plugin-adapter-crud.spec.ts` | 1 |
| FLOW-35 | `meta-arbitration-engine` | ADMIN_COVERED | 1 | 0 | 0 | `meta-arbitration-engine-crud.spec.ts` | 1 |
| FLOW-36 | `feature-registry` | ADMIN_COVERED | 22 | 0 | 0 | `feature-registry-mock-states.spec.ts` | 3 |
| FLOW-37 | `design-system-governance` | ADMIN_COVERED | 1 | 1 | 1 | `design-system-governance-crud.spec.ts` | 1 |
| FLOW-38 | `rag-quality-feedback` | ADMIN_COVERED | 1 | 0 | 0 | `rag-quality-feedback-crud.spec.ts` | 1 |
| FLOW-39 | `oss-curriculum` | ADMIN_COVERED | 1 | 0 | 0 | `oss-curriculum-crud.spec.ts` | 2 |
| FLOW-40 | `client-push` | ADMIN_COVERED | 1 | 0 | 0 | `client-push-crud.spec.ts` | 2 |
| FLOW-42 | `rag-quality-graph` | ADMIN_COVERED | 0 | 0 | 1 | `rag-quality-graph-crud.spec.ts` | 1 |
| FLOW-43 | `meta-flow-orchestration` | ADMIN_COVERED | 0 | 0 | 1 | `meta-flow-orchestration-crud.spec.ts` | 1 |
| FLOW-44 | `ai-self-modification` | ADMIN_COVERED | 0 | 0 | 1 | `ai-self-modification-crud.spec.ts` | 1 |
| FLOW-45 | `cycle-chain-extension` | ADMIN_COVERED | 0 | 1 | 0 | `cycle-chain-extension-crud.spec.ts` | 1 |
| FLOW-46 | `platform-agent` | COVERED | 18 | 2 | 0 | `platform-agent-mock-states.spec.ts` | 2 |
| FLOW-47 | `module-lifecycle` | ADMIN_COVERED | 1 | 0 | 0 | `module-lifecycle-crud.spec.ts` | 1 |

# UNIFIED SOURCE INDEX — FLOW-19: CI/CD & DevOps Control Plane
## Extends UNIFIED_SOURCE_INDEX_MERGED.md | DD-86-DD-100
## Pre-existing DD-1-DD-85 UNCHANGED ✅

---

## DESIGN DECISIONS — DD-86-DD-100

```
DD-86: Component Profile as YAML in Git (Backstage-style)
  CONTEXT: Need a "single source of truth" for all platform components.
  DECISION: Component descriptors stored as catalog-info.yaml in each repo.
            Ingested via Git webhook to ES catalog (F466). Not a UI-first form.
  RATIONALE: Git-native version history, PR review, branch-based drafts.
             Webhook-driven keeps catalog always current with code changes.
             Pattern aligns with Backstage entity descriptor approach.
  ALTERNATIVES REJECTED:
    - CMDB UI form entry: no version history, not co-located with code
    - Auto-discovery only: misses ownership/policy metadata
  IMPLICATIONS: Descriptor schema is versioned; F466 supports v1/v2 with migration.

DD-87: Namespace-per-PR as Default Ephemeral Isolation Tier
  CONTEXT: Multiple isolation options for ephemeral environments.
  DECISION: Default = K8s namespace per PR with ResourceQuota + NetworkPolicy.
            Cluster-per-PR is reserved for tier-1 sensitive only.
  RATIONALE: Namespace creation is near-instant vs cluster creation (~10 min).
             Combined with NetworkPolicy, isolation is sufficient for standard tier.
             Cost: namespace is free; cluster adds per-cluster overhead.
  ALTERNATIVES REJECTED:
    - Cluster-per-PR for all: too slow, too expensive
    - Single shared namespace: insufficient isolation
  IMPLICATIONS: DR-67 documents this. Naming: {tenant_id}-{env_type}-{pr_number}.

DD-88: IaC Provider Is a Fabric Implementation Detail
  CONTEXT: Platform must be IaC-provider-agnostic (Terraform, Pulumi, Crossplane).
  DECISION: IIaCRunnerService (F471) wraps IaC tool behind CORE FABRIC HTTP adapter.
            Engine-generated services never import IaC SDKs (DR-68).
  RATIONALE: Preserves vendor agnosticism — switching from Terraform to Crossplane
             is a config change, not a code rewrite.
  ALTERNATIVES REJECTED:
    - Direct Terraform SDK import: violates DNA-7, locks to provider
  IMPLICATIONS: A thin IaC API server (or exec wrapper) required per IaC tool.

DD-89: Compensation Plan Stored Before IaC Apply (EP-4 Pattern)
  CONTEXT: IaC apply can partially succeed, leaving orphaned cloud resources.
  DECISION: Before F471.ApplyAsync(), store compensation (destroy) plan in
            DATABASE FABRIC. If apply fails, compensation plan is always available.
  RATIONALE: Prevents orphaned resources. Compensation plan is the undo operation
             for each created resource. Aligns with EP-4 (cursor persist before advance).
  ALTERNATIVES REJECTED:
    - "Best effort cleanup on failure": unreliable, loses resource list on crash
  IMPLICATIONS: Every resource created in apply must be enumerable in compensation plan.

DD-90: ConfigBundle Contains Only Secret References, Never Values
  CONTEXT: Config resolution must be safe for storage and transmission.
  DECISION: F474 produces ConfigBundle with secret reference paths only.
            F475 validates reference existence. Applications resolve at runtime.
  RATIONALE: Prevents secret sprawl. Reduces blast radius of config store compromise.
             Aligns with vault-native secret lifecycle (rotation, revocation).
  ALTERNATIVES REJECTED:
    - Resolved secret values in ConfigBundle: catastrophic if config store compromised
  IMPLICATIONS: Applications must inject vault SDK at startup to resolve references.
                Engine cannot validate secret VALUE validity (DR-71).

DD-91: Policy Decisions as First-Class Artifacts with Obligations
  CONTEXT: Policy enforcement must be auditable and actionable.
  DECISION: F476 returns PolicyDecision{allow|deny, obligations[], reasoning}
            with full detail. PolicyDecisions are stored as audit events.
  RATIONALE: Obligations make policy decisions actionable (e.g., "route-to-local-only"
             is an obligation, not just a deny). Enables debugging and compliance review.
  ALTERNATIVES REJECTED:
    - Boolean allow/deny only: insufficient for ABAC obligation enforcement

DD-92: Readiness Report Is the Sole Promotion Gate
  CONTEXT: Multiple sources of evidence for deployment readiness.
  DECISION: A passing ReadinessReport (F488) is the ONLY gate for promotion.
            All evidence (config, smoke, integration, policy, drift) is aggregated.
  RATIONALE: Single gate eliminates "some gates are bypassed" problem.
             Immutable report provides audit trail per deployment.
  ALTERNATIVES REJECTED:
    - Multiple independent gates: can be bypassed individually under pressure
  IMPLICATIONS: DR-72 enforces this. F481 PromotionGateService hard-blocks without report.

DD-93: DR Drills Are Non-Negotiable and Evidence Is Immutable
  CONTEXT: DR drills are often deferred or faked.
  DECISION: Tier-1 components require passing drill evidence within 7 days for
            production promotion. Evidence stored in ES WORM — append-only.
  RATIONALE: Un-tested restores are un-tested DR. Immutability prevents evidence tampering.
             Aligns with 19-* document: "restore drills: non-negotiable".
  ALTERNATIVES REJECTED:
    - Voluntary drills: deferred under deadline pressure
    - Mutable evidence: can be "fixed" to show passing
  IMPLICATIONS: DR-73, DR-74 enforce this. T194 gate is mandatory for tier-1.

DD-94: W3C TraceContext for Cross-Service Trace Propagation
  CONTEXT: Control plane spans multiple services and environments.
  DECISION: F494 IOtelCollectorAdapterService propagates trace IDs using W3C traceparent.
            All FlowInstance and StepRun operations emit spans.
  RATIONALE: Vendor-agnostic; supported by all modern observability backends.
             Enables end-to-end trace from API request → worker → IaC runner → test suite.
  ALTERNATIVES REJECTED:
    - Proprietary trace headers: vendor lock-in

DD-95: Idempotency Keys Required on All Provisioning and Onboarding
  CONTEXT: Webhooks and retries cause duplicate processing.
  DECISION: Every "create" endpoint in FLOW-19 requires Idempotency-Key header.
            Dedup table with (key, source, expires_at) per operation type.
  RATIONALE: PR webhooks fire multiple times. Network retries during provisioning
             create duplicate environments/tenants without idempotency (DR-69).
  ALTERNATIVES REJECTED:
    - At-most-once delivery: unacceptable data loss risk

DD-96: Tenant Storage Isolation Follows Pool/Bridge/Silo Model
  CONTEXT: Different tenants have different isolation requirements.
  DECISION: Three isolation modes (FREEDOM config per tenant tier):
            - pooled: shared schema + RLS (standard tier)
            - schema: schema-per-tenant (premium tier)
            - db: database-per-tenant (enterprise/regulated tier)
  RATIONALE: Matches SaaS pool/bridge/silo pattern. Isolation can be upgraded
             (ITenantBindingResolverService F498 supports MigrateIsolationAsync).
  IMPLICATIONS: F498 binding resolver maps tenant_id → isolation mode at runtime.
                RLS enforced at DB level for pooled (PostgreSQL CREATE POLICY).

DD-97: Tenant Config Layering Uses FREEDOM Config
  CONTEXT: Tenants need customization without code forks.
  DECISION: Config priority order (global → tier → tenant → env override).
            Tenant overrides stored in ITenantConfigLayerService (F501).
            Feature flags stored alongside config for staged tenant activation.
  RATIONALE: Single codebase serves all tenants via config differentiation.
             Matches 19-MT document: "solve customization via config, not forks".
  IMPLICATIONS: Cache must be tenant+env scoped (CF-229). Never shared cache keys.

DD-98: Audit Logs Survive Tenant Offboarding (Regulatory Requirement)
  CONTEXT: Tenant offboarding includes data purge, creating tension with audit log retention.
  DECISION: Audit logs and DR evidence are owned by the control plane audit service,
            not the tenant data namespace. They are explicitly excluded from tenant purge.
  RATIONALE: Regulatory requirement (DR-75). Forensics access post-offboarding.
             Compliance audits may occur years after tenant leaves.
  IMPLICATIONS: F502 offboarding saga has explicit step: "preserve audit logs — DO NOT delete".

DD-99: Hallucination Drift Monitoring Feeds AF-11 Feedback Loop
  CONTEXT: RAG pipeline quality can degrade over time without detection.
  DECISION: F496 IHallucinationDriftService computes drift score continuously.
            Scores feed AF-11 (Feedback) to improve future code generation quality.
  RATIONALE: Closes the quality feedback loop. DNA pattern violations in generated
             code are caught early before reaching production.
  ALTERNATIVES REJECTED:
    - One-time quality check: misses drift over time

DD-100: Local-Sensitive Profile Enforces Zero External Egress
  CONTEXT: Some development scenarios require working with sensitive data locally.
  DECISION: local-sensitive environment profile enforces K8s NetworkPolicy with
            zero external egress (CF-228). Only local AI providers respond.
            Profile selection triggers policy evaluation T185 automatically.
  RATIONALE: Sensitive data must never leave local environment boundary.
             Network enforcement is more reliable than application-layer enforcement.
  ALTERNATIVES REJECTED:
    - Application-layer routing only: bypassable under bugs
  IMPLICATIONS: F473 ILocalK8sBootstrapService applies egress-deny NetworkPolicy
                when local-sensitive profile selected.
```

---

## CONCEPT MAP — FLOW-19

```
FLOW-19: CI/CD & DevOps Control Plane
├── CATALOG LAYER
│   ├── F466 Ingestion → F467 Profile → F468 Graph → F469 Query
│   ├── T179 Descriptor Gate → T180 Graph Refresh
│   └── Skills: SK-99, SK-100
│
├── ENVIRONMENT FACTORY
│   ├── F470 Provisioner → F471 IaC Runner → F472 Ephemeral → F473 Local
│   ├── T181 Request Gate → T182 IaC Saga → T183 TTL Expiry
│   └── Skills: SK-101, SK-102, SK-103
│
├── CONFIG & POLICY
│   ├── F474 Config Resolver → F475 Secret Validator → F476 Policy → F477 Config Version
│   ├── T184 Config Gate → T185 Policy Gate
│   └── Skills: SK-109, SK-110
│
├── PIPELINE CONTRACT
│   ├── F478 Contract → F479 Adapter → F480 Artifact Registry → F481 Promotion Gate
│   ├── T186 Contract Gate → T191 Promotion Ladder
│   └── Skills: SK-104
│
├── GITOPS & DEPLOY
│   ├── F482 GitOps → F483 Drift → F484 Health → F485 Manifest Renderer
│   ├── T187 Deploy+Smoke → T188 GitOps Gate → T189 Integration Orchestration → T190 Readiness
│   └── Skills: SK-105, SK-106
│
├── BACKUP & DR
│   ├── F490 Backup → F491 Restore Drill → F492 Evidence → F493 Sandbox
│   ├── T192 Backup Run → T193 Restore Drill Saga → T194 DR Evidence Gate
│   └── Skills: SK-107, SK-108
│
├── OBSERVABILITY & AUDIT
│   ├── F494 OTel → F495 Audit → F496 Hallucination Drift
│   └── Skills: SK-112
│
└── MULTI-TENANT CONTROL PLANE
    ├── F497 Registry → F498 Binding Resolver → F499 Onboarding →
    │   F500 Metering → F501 Config Layer → F502 Lifecycle
    ├── T195 Onboarding Saga → T196 Offboarding Saga
    └── Skills: SK-111
```

---

## FLOW-19 CROSS-FLOW DEPENDENCY MAP

```
FLOW-19 DEPENDS ON:
  FLOW-08 (F461 ITenantWarehouseIsolationService) → tenant isolation primitives
  FLOW-14 (F463 IRowLevelSecurityService) → RLS for pooled tenants
  FLOW-14 (F459 IWarehouseAuditService) → separate audit plane (CF-224)
  FLOW-05 (F176-F224) → gamification event contract tests in pipeline (CF-227)

FLOW-19 PROVIDES TO FUTURE FLOWS:
  F466 ICatalogIngestionService → any future flow can register as catalog component
  F495 IControlPlaneAuditService → available to all future flows for audit events
  F498 ITenantBindingResolverService → all future flows use for tenant routing
  ReadinessReport pattern (SK-106) → reusable by any flow with deployment steps
  DR Drill evidence pattern (SK-107) → reusable by any flow with critical data
```

---

## SAVE POINT: FLOW19:P4b:SOURCE_INDEX ✅
## Next: FLOW19_MASTER_EXECUTION_PLAN.md

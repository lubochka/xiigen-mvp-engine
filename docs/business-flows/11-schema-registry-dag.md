# FLOW-11 - Schema Registry & DAG

## Purpose

FLOW-11 registers new schema versions for the XIIGen engine, validates them against
dependency and compatibility rules, and publishes safe versions into a tenant-scoped
schema registry. The flow also maintains a renderable DAG so platform operators can
inspect schema relationships without reading raw event or service code.

## Primary Actors

- Tenant admin: submits schema versions and reviews tenant-visible schema contracts.
- Platform admin: inspects the full schema registry DAG and handles breaking-change governance.
- Platform support: views the DAG in read-only mode for troubleshooting.

## Runtime Entry Points

- Schema submission: accepts a schema type and JSON schema payload, derives a versioned
  schema record, and validates it before publication.
- Schema registry search: returns tenant-scoped schema records for browsing and support.
- DAG visualization: renders the current schema dependency graph for platform roles.

## Required Flow

1. SchemaRegistrationGateway receives the schema submission request.
2. SchemaVersionManager validates version monotonicity and schema identity.
3. DagCycleDetector checks dependency references with a three-state DFS.
4. SchemaCompatibilityChecker classifies additive, compatible, and breaking changes.
5. SchemaPublisher publishes only validated schema versions with optimistic concurrency.
6. DagTopologyBuilder rebuilds the topology after publication.
7. DagVisualizationGateway serves the rendered topology using a tenant-scoped cache TTL.

## Fixed Machine Rules

- All schema records remain tenant-private; training corpus material remains global.
- Tenant scope comes from AsyncLocalStorage and must not be accepted from request bodies.
- Breaking changes route to approval governance before publication.
- Additive and compatible changes may publish only after version, cycle, and compatibility checks.
- DagCycleDetector uses WHITE, GRAY, and BLACK traversal states to detect circular references.
- SchemaPublisher uses optimistic concurrency for schema version immutability.
- Store-before-emit ordering is mandatory for every state transition that emits an event.
- All FLOW-11 services return DataProcessResult and extend MicroserviceBase.

## Tenant-Safe Adaptation Surface

Tenants may tune operational windows and cache behavior without changing the machine rules:

- Approval window for breaking schema changes.
- Default approval decision for unresolved workflow items.
- Deprecation TTL before archived schemas become inactive.
- DAG visualization cache TTL.

Tenants may also adapt presentation copy and registry labels in their forked module, provided
role isolation, tenant isolation, event contracts, and schema validation behavior remain fixed.

## Certification Criteria

- Missing token returns 401.
- Cross-tenant token use returns 401.
- Wrong role on protected routes returns 403.
- Tenant A, Tenant B, and Tenant C forks keep the same machine rules while proving tenant-specific
  configuration and package identity.
- The forked module is a standalone package with functional spec, invariants, adaptation surface,
  FREEDOM defaults, tenant config, RAG seed, and GitHub Actions workflow.

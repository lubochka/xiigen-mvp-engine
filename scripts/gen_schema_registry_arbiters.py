"""Generate 61 new domain arbiters for schema-registry-dag T190-T208."""
import json

SEEDED_AT = "2026-04-13T00:00:00Z"
FLOW_ID = "FLOW-11"
INDEX = "xiigen-arbiters"


def make(arbiter_id, cf_id, arbiter_type, scope, description, block_conditions, pass_conditions, resolution):
    index_line = json.dumps({"index": {"_index": INDEX, "_id": arbiter_id}})
    data = {
        "arbiterId": arbiter_id,
        "flowId": FLOW_ID,
        "seededAt": SEEDED_AT,
        "arbiterType": arbiter_type,
        "cfId": cf_id,
        "description": description,
        "scope": scope,
        "blockConditions": block_conditions,
        "passConditions": pass_conditions,
        "resolution": resolution,
        "connectionType": "FLOW_SCOPED",
        "knowledgeScope": "PRIVATE",
    }
    return index_line + "\n" + json.dumps(data) + "\n"


new_records = []

# ── T190 SchemaVersionManager (VALIDATION) — 4 records ──────────────────────
new_records.append(make(
    "arb-flow11-semver-format", "CF-FLOW11-DM-18", "domain", ["T190"],
    "T190 SchemaVersionManager MUST enforce semver format (MAJOR.MINOR.PATCH). Non-semver version strings = BUILD_FAILURE.",
    ["T190 accepts 'v1' or '1.0' without PATCH segment",
     "T190 allows arbitrary version strings without validation",
     "version field stored without semver format check"],
    ["T190 validates version matches /^\\d+\\.\\d+\\.\\d+$/ before accepting",
     "DataProcessResult.failure('INVALID_VERSION_FORMAT') returned for non-semver strings"],
    "T190 validates version matches /^\\d+\\.\\d+\\.\\d+$/. Non-semver = DataProcessResult.failure('INVALID_VERSION_FORMAT'). Accepting 'v1' or '1.0' = BUILD_FAILURE."
))

new_records.append(make(
    "arb-flow11-classification-idempotent", "CF-FLOW11-DM-19", "domain", ["T190"],
    "T190 classification MUST be deterministic — same schema diff always produces same BREAKING/ADDITIVE/MINOR result.",
    ["T190 uses timestamp-based or random classification logic",
     "T190 classification changes outcome based on call order",
     "T190 stores state between calls that affects next result"],
    ["T190 classification function is pure — same inputs always produce same output",
     "no external state read or written during classification"],
    "T190 classification is pure: same schema diff → same BREAKING/ADDITIVE/MINOR always. External state affecting result = ARCHITECTURE_VIOLATION."
))

new_records.append(make(
    "arb-flow11-version-classified-event", "CF-FLOW11-DM-20", "domain", ["T190"],
    "T190 MUST emit SchemaVersionClassified event after classification. Returning inline without event = AUDIT_VIOLATION.",
    ["T190 returns classification result without emitting SchemaVersionClassified",
     "T189 reads T190 result via direct function call instead of event",
     "SchemaVersionClassified event absent from T190 handler"],
    ["T190 enqueues SchemaVersionClassified with {schemaId, changeType, version} after classification",
     "storeDocument called before enqueue per DNA-8"],
    "T190: storeDocument then enqueue SchemaVersionClassified. Inline return without event = AUDIT_VIOLATION per DNA-8."
))

new_records.append(make(
    "arb-flow11-field-deletion-breaking", "CF-FLOW11-DM-21", "domain", ["T190"],
    "T190 MUST classify field deletion as BREAKING. Treating field removal as ADDITIVE = INCORRECT_CLASSIFICATION.",
    ["T190 classifies field deletion as ADDITIVE",
     "field removal routed to SchemaQueued fast path",
     "T190 only checks additions when determining BREAKING vs ADDITIVE"],
    ["T190 classifies field deletion as BREAKING → SchemaApprovalRequired",
     "optional field addition classified as ADDITIVE → SchemaQueued",
     "required field addition classified as BREAKING → SchemaApprovalRequired"],
    "T190: field deletion=BREAKING, required addition=BREAKING, optional addition=ADDITIVE. Field deletion as ADDITIVE = INCORRECT_CLASSIFICATION."
))

# ── T191 DagCycleDetector (VALIDATION) — 3 records ──────────────────────────
new_records.append(make(
    "arb-flow11-dag-max-depth", "CF-FLOW11-DM-22", "domain", ["T191"],
    "T191 MUST enforce max DAG depth from FREEDOM config xiigen.schema.dagMaxDepth (default 100). Exceeding maxDepth = DEPTH_EXCEEDED.",
    ["T191 traverses unbounded DAG depth without limit",
     "maxDepth not read from FREEDOM config",
     "T191 does not fail on DAGs with depth > 100"],
    ["T191 reads maxDepth from FREEDOM config xiigen.schema.dagMaxDepth",
     "traversal exceeding maxDepth → DataProcessResult.failure('DEPTH_EXCEEDED')",
     "depth counter checked per DFS iteration"],
    "T191 reads xiigen.schema.dagMaxDepth (default 100). Exceeding maxDepth → DataProcessResult.failure('DEPTH_EXCEEDED'). No limit = PERFORMANCE_VIOLATION."
))

new_records.append(make(
    "arb-flow11-empty-dag-no-error", "CF-FLOW11-DM-23", "domain", ["T191"],
    "T191 MUST handle empty DAG (0 nodes) without error, returning {hasCycle: false, cyclePath: []}.",
    ["T191 throws or returns failure on empty node list",
     "T191 accesses nodes[0] without guard causing TypeError",
     "empty DAG treated as invalid input"],
    ["T191 returns DataProcessResult.success({hasCycle: false, cyclePath: []}) for empty node list",
     "no error thrown for 0-node DAG"],
    "T191 guard: if nodes.length === 0 → DataProcessResult.success({hasCycle: false, cyclePath: []}). Throwing on empty DAG = BUILD_FAILURE."
))

new_records.append(make(
    "arb-flow11-cycle-path-report", "CF-FLOW11-DM-24", "domain", ["T191"],
    "T191 MUST return the full cycle path when hasCycle=true. hasCycle=true without cyclePath = INCOMPLETE_OUTPUT.",
    ["T191 returns {hasCycle: true} without cyclePath array",
     "cycle path omitted from result",
     "DFS does not track path on GRAY node encounter"],
    ["T191 result includes cyclePath: string[] when hasCycle=true",
     "cyclePath traces full cycle from entry node to repeated GRAY node",
     "hasCycle=false returns cyclePath=[]"],
    "T191 result: {hasCycle: boolean, cyclePath: string[]}. hasCycle=true requires full cycle path. Missing path = INCOMPLETE_OUTPUT."
))

# ── T192 DagDependencyTracker (DATA_PIPELINE) — 2 records ───────────────────
new_records.append(make(
    "arb-flow11-edge-deduplication", "CF-FLOW11-DM-25", "domain", ["T192"],
    "T192 MUST deduplicate edges before storing. Duplicate edge (same from+to) MUST be skipped with log warning.",
    ["T192 stores duplicate edges (same from+to stored twice)",
     "T192 fails on duplicate edge instead of deduplicating",
     "no deduplication check before storeDocument on edge"],
    ["T192 checks for existing edge {from, to} before storing",
     "duplicate edge: skip storeDocument and log warning",
     "idempotency key = schemaId + ':' + dependsOnSchemaId"],
    "T192 deduplicates: check existing {from, to} before store. Duplicate → skip + log. Storing duplicate edges = DATA_INTEGRITY_VIOLATION."
))

new_records.append(make(
    "arb-flow11-orphan-not-cascade-delete", "CF-FLOW11-DM-26", "domain", ["T192"],
    "T192 MUST NOT cascade-delete edges on schema removal. Mark edges as {orphaned: true, orphanedAt} instead.",
    ["T192 deletes all edges pointing to a removed schema",
     "T192 calls deleteDocument on edges during schema removal",
     "cascade delete removes DAG edges referencing removed schema"],
    ["T192 sets {orphaned: true, orphanedAt: now()} on affected edges",
     "db.deleteDocument never called by T192 for cascade",
     "orphaned edges retained for audit trail"],
    "T192 on schema removal: storeDocument({orphaned: true, orphanedAt}) on edges. NEVER calls deleteDocument for cascade. Cascade delete = AUDIT_VIOLATION."
))

# ── T193 SchemaCompatibilityChecker (VALIDATION) — 4 records ────────────────
new_records.append(make(
    "arb-flow11-type-change-breaking", "CF-FLOW11-DM-27", "domain", ["T193"],
    "T193 MUST classify field type changes (int→string) as BREAKING even when field name is unchanged.",
    ["T193 classifies type change as ADDITIVE because field name is unchanged",
     "T193 only checks additions/deletions, not type mutations",
     "int→string reclassified as ADDITIVE routed to fast path"],
    ["T193 detects type change for any field and classifies as BREAKING",
     "T193 checks: if existingField.type !== newField.type → BREAKING"],
    "T193: any field type change = BREAKING. Type changed but name unchanged treated as ADDITIVE = INCORRECT_CLASSIFICATION."
))

new_records.append(make(
    "arb-flow11-required-field-addition-breaking", "CF-FLOW11-DM-28", "domain", ["T193"],
    "T193 MUST classify adding a required field as BREAKING. Existing documents lack the new required field.",
    ["T193 classifies required field addition as ADDITIVE",
     "required field addition routed to SchemaQueued fast path",
     "T193 does not distinguish optional vs required addition"],
    ["T193 checks field.required flag for newly added fields",
     "required field addition → BREAKING",
     "optional field addition → ADDITIVE"],
    "T193: new field with required=true = BREAKING (existing docs lack it). new optional field = ADDITIVE. Required addition as ADDITIVE = INCORRECT_CLASSIFICATION."
))

new_records.append(make(
    "arb-flow11-compare-against-published", "CF-FLOW11-DM-29", "domain", ["T193"],
    "T193 MUST compare against the previously PUBLISHED (status=ACTIVE) version, NOT against latest DRAFT.",
    ["T193 compares against latest DRAFT version",
     "T193 fetches schema by latest timestamp regardless of status",
     "compatibility baseline is not the last ACTIVE published version"],
    ["T193 queries {schemaId, status: 'ACTIVE'} sorted by publishedAt DESC LIMIT 1",
     "comparison baseline is always the last ACTIVE version",
     "DRAFT versions ignored as baseline"],
    "T193 baseline: last ACTIVE version via {status:'ACTIVE', schemaId} sorted publishedAt DESC LIMIT 1. Using DRAFT = INCORRECT_BASELINE."
))

new_records.append(make(
    "arb-flow11-compatibility-checked-event", "CF-FLOW11-DM-30", "domain", ["T193"],
    "T193 MUST emit SchemaCompatibilityChecked event before returning. Missing event = AUDIT_VIOLATION.",
    ["T193 returns result without emitting SchemaCompatibilityChecked",
     "T189 reads T193 result via direct function call",
     "SchemaCompatibilityChecked event absent from T193"],
    ["T193 stores compatibility record then enqueues SchemaCompatibilityChecked",
     "DNA-8: storeDocument before enqueue",
     "event payload: {schemaId, isCompatible, changeType}"],
    "T193: storeDocument then enqueue SchemaCompatibilityChecked. Inline return without event = AUDIT_VIOLATION per DNA-8."
))

# ── T194 SchemaPublisher (TRANSACTION) — 2 records ──────────────────────────
new_records.append(make(
    "arb-flow11-publish-sets-active", "CF-FLOW11-DM-31", "domain", ["T194"],
    "T194 MUST set status=ACTIVE and activeFrom=now() on publish. Schema with status=DRAFT after T194 = BUILD_FAILURE.",
    ["T194 stores schema with status=DRAFT after publish",
     "activeFrom field absent from published schema",
     "T194 does not update schema status during publish"],
    ["T194 storeDocumentWithOCC sets {status: 'ACTIVE', activeFrom: new Date().toISOString()}",
     "schema record after T194 has status=ACTIVE"],
    "T194: storeDocumentWithOCC({status:'ACTIVE', activeFrom: now()}). Schema status=DRAFT after publish = BUILD_FAILURE."
))

new_records.append(make(
    "arb-flow11-no-publish-while-pending-approval", "CF-FLOW11-DM-32", "domain", ["T194"],
    "T194 MUST NOT publish if a T202 approval record for this schema has status=PENDING.",
    ["T194 publishes schema while approval is PENDING",
     "T194 does not check approval status before OCC publish",
     "approval bypassed — T194 publishes regardless of T202 state"],
    ["T194 queries xiigen-schema-approvals for {schemaId, status: 'PENDING'} before publishing",
     "PENDING found → DataProcessResult.failure('APPROVAL_PENDING')",
     "T194 proceeds only when no PENDING approval exists"],
    "T194: check {schemaId, status:'PENDING'} in approvals before OCC. PENDING found → DataProcessResult.failure('APPROVAL_PENDING'). Bypass = GOVERNANCE_VIOLATION."
))

# ── T195 SchemaIndexManager (SCHEDULED) — 3 records ────────────────────────
new_records.append(make(
    "arb-flow11-reindex-paginated", "CF-FLOW11-DM-33", "domain", ["T195"],
    "T195 MUST re-index in paginated batches. PAGE_SIZE from FREEDOM config xiigen.schema.indexPageSize (default 200). Single batch = PERFORMANCE_VIOLATION.",
    ["T195 loads all schemas at once without pagination",
     "db.searchDocuments called without size parameter",
     "re-index runs in single batch regardless of count"],
    ["T195 uses while loop with fromOffset += PAGE_SIZE",
     "db.searchDocuments called with size=PAGE_SIZE per batch",
     "loop exits when results.length < PAGE_SIZE"],
    "T195 re-index: while loop with fromOffset += PAGE_SIZE (default 200 from xiigen.schema.indexPageSize). Single batch = PERFORMANCE_VIOLATION."
))

new_records.append(make(
    "arb-flow11-skip-deprecated-in-reindex", "CF-FLOW11-DM-34", "domain", ["T195"],
    "T195 MUST skip schemas with status=DEPRECATED during re-index. Including deprecated schemas pollutes search results.",
    ["T195 re-indexes all schemas regardless of status",
     "deprecated schemas included in re-index batch",
     "filter {deprecated: false} absent from re-index searchDocuments"],
    ["T195 searchDocuments filter includes {deprecated: false}",
     "no deprecated schema processed during re-index"],
    "T195 re-index filter: {deprecated: false}. Including deprecated schemas = INCORRECT_INDEX."
))

new_records.append(make(
    "arb-flow11-index-run-completion-record", "CF-FLOW11-DM-35", "domain", ["T195"],
    "T195 MUST store run completion record in xiigen-schema-index-runs with startedAt, completedAt, processedCount. Missing = AUDIT_VIOLATION.",
    ["T195 stores no run record in xiigen-schema-index-runs",
     "completedAt or processedCount absent from run record"],
    ["T195 stores {runId, startedAt, completedAt, processedCount, status:'COMPLETE'} after loop",
     "storeDocument called for run record after completion"],
    "T195: storeDocument({runId, startedAt, completedAt, processedCount, status:'COMPLETE'}) after loop. Missing run record = AUDIT_VIOLATION."
))

# ── T196 SchemaVersionReader (VALIDATION) — 3 records ───────────────────────
new_records.append(make(
    "arb-flow11-version-not-found-failure", "CF-FLOW11-DM-36", "domain", ["T196"],
    "T196 MUST return DataProcessResult.failure('SCHEMA_NOT_FOUND') if schema does not exist. NEVER return null.",
    ["T196 returns null when schema not found",
     "caller must null-check T196 result instead of DataProcessResult"],
    ["T196 returns DataProcessResult.failure('SCHEMA_NOT_FOUND') when getDocumentWithVersion returns null",
     "no null/undefined returned from T196"],
    "T196: null result from getDocumentWithVersion → DataProcessResult.failure('SCHEMA_NOT_FOUND'). Returning null = BUILD_FAILURE per DNA-3."
))

new_records.append(make(
    "arb-flow11-version-reader-cross-schema-guard", "CF-FLOW11-DM-37", "domain", ["T196"],
    "T196 MUST validate returned document's schemaId matches requested schemaId before returning versionPin.",
    ["T196 returns versionPin without verifying schemaId matches",
     "T196 returns versionPin for wrong schema on document ID collision"],
    ["T196 checks result.schemaId === requestedSchemaId before returning",
     "mismatch → DataProcessResult.failure('SCHEMA_MISMATCH')"],
    "T196: result.schemaId === requested schemaId guard. Mismatch → DataProcessResult.failure('SCHEMA_MISMATCH'). Missing guard = SECURITY_VIOLATION."
))

new_records.append(make(
    "arb-flow11-version-reader-readonly", "CF-FLOW11-DM-38", "domain", ["T196"],
    "T196 MUST NOT call storeDocument or deleteDocument. Version reader is read-only.",
    ["T196 calls storeDocument for version cache update",
     "T196 calls storeDocumentWithOCC during version read"],
    ["T196 only calls db.getDocumentWithVersion() and db.getDocument()",
     "no write operations in T196"],
    "T196 is read-only: only getDocumentWithVersion/getDocument. Any storeDocument in T196 = ARCHITECTURE_VIOLATION."
))

# ── T197 DagTopologyBuilder (DATA_PIPELINE) — 4 records ─────────────────────
new_records.append(make(
    "arb-flow11-topology-cycle-free", "CF-FLOW11-DM-39", "domain", ["T197"],
    "T197 MUST reject topology build if T191 reports a cycle. Return DataProcessResult.failure('CYCLE_DETECTED') immediately.",
    ["T197 builds partial topology when cycle detected",
     "T197 ignores T191 cycle detection result",
     "T197 does not call T191 before building topology"],
    ["T197 calls T191 DagCycleDetectorService before building",
     "hasCycle=true → DataProcessResult.failure('CYCLE_DETECTED')",
     "topology only built when T191 returns {hasCycle: false}"],
    "T197: call T191 first. hasCycle=true → DataProcessResult.failure('CYCLE_DETECTED'). Partial topology on cycle = DATA_INTEGRITY_VIOLATION."
))

new_records.append(make(
    "arb-flow11-topology-level-assignments", "CF-FLOW11-DM-40", "domain", ["T197"],
    "T197 topology output MUST include BFS depth level for each node. Adjacency-list-only without levels = INCOMPLETE_OUTPUT.",
    ["T197 output is adjacency list only without level per node",
     "BFS not performed — topological sort only",
     "level field absent from topology node objects"],
    ["T197 performs BFS from root nodes to assign level to each node",
     "each topology node includes {nodeId, level, edges: []}",
     "root nodes have level=0"],
    "T197 per-node output: {nodeId, level: number, edges: string[]}. BFS from roots assigns level. Missing level = INCOMPLETE_OUTPUT."
))

new_records.append(make(
    "arb-flow11-topology-paginated-fetch", "CF-FLOW11-DM-41", "domain", ["T197"],
    "T197 MUST paginate node fetch from xiigen-schema-dag in batches. Loading all nodes at once = PERFORMANCE_VIOLATION.",
    ["T197 loads all DAG nodes in single searchDocuments call",
     "db.searchDocuments called without size parameter",
     "pagination loop absent from T197 node fetch"],
    ["T197 uses while loop with fromOffset += PAGE_SIZE",
     "db.searchDocuments called with size=PAGE_SIZE per batch",
     "loop exits when results.length < PAGE_SIZE"],
    "T197 node fetch: while loop with fromOffset += PAGE_SIZE. Single batch load = PERFORMANCE_VIOLATION."
))

new_records.append(make(
    "arb-flow11-topology-no-duplicate-edges", "CF-FLOW11-DM-42", "domain", ["T197"],
    "T197 MUST deduplicate edges in topology output. Duplicate edges in output = DATA_INTEGRITY_VIOLATION.",
    ["T197 output includes duplicate edges (same {from, to} pair twice)",
     "T197 does not deduplicate edges from xiigen-schema-dag",
     "edge deduplication absent from topology build"],
    ["T197 uses Set keyed by 'from:to' to deduplicate edges",
     "topology output adjacency list contains no duplicate edges"],
    "T197 deduplicates edges via Set(edgeKey = from+':'+to). Duplicate edges in output = DATA_INTEGRITY_VIOLATION."
))

# ── T198 SchemaSearchService (DATA_PIPELINE) — 4 records ────────────────────
new_records.append(make(
    "arb-flow11-search-requires-query-or-filter", "CF-FLOW11-DM-43", "domain", ["T198"],
    "T198 MUST reject empty-query + empty-filter requests. DataProcessResult.failure('QUERY_REQUIRED') returned.",
    ["T198 accepts empty query with no filters and returns all schemas",
     "T198 does not validate at least one search criterion",
     "full-table scan possible via T198"],
    ["T198 checks: if !query && Object.keys(filters).length === 0 → DataProcessResult.failure('QUERY_REQUIRED')",
     "at least one criterion required"],
    "T198: if !query AND no filters → DataProcessResult.failure('QUERY_REQUIRED'). Accepting empty search = PERFORMANCE_VIOLATION."
))

new_records.append(make(
    "arb-flow11-search-paginated", "CF-FLOW11-DM-44", "domain", ["T198"],
    "T198 MUST paginate search results. Returning unlimited results = PERFORMANCE_VIOLATION.",
    ["T198 returns all matching schemas without pagination",
     "db.searchDocuments called without size/from parameters"],
    ["T198 accepts page and pageSize (defaults: page=0, pageSize=20 from FREEDOM config)",
     "db.searchDocuments called with {size: pageSize, from: page * pageSize}",
     "returns {items, total, page, pageSize}"],
    "T198: db.searchDocuments({size: pageSize, from: offset}). Return {items, total, page, pageSize}. Unlimited return = PERFORMANCE_VIOLATION."
))

new_records.append(make(
    "arb-flow11-search-excludes-deprecated-by-default", "CF-FLOW11-DM-45", "domain", ["T198"],
    "T198 MUST exclude deprecated schemas by default. includeDeprecated=true flag required to include them.",
    ["T198 includes deprecated schemas in results by default",
     "deprecated=true filter absent unless explicitly requested"],
    ["T198 default filter includes {deprecated: false}",
     "includeDeprecated=true flag removes the deprecated:false filter"],
    "T198 default: {deprecated: false} in filter. includeDeprecated=true omits this. Deprecated included by default = INCORRECT_SEARCH_RESULTS."
))

new_records.append(make(
    "arb-flow11-search-includes-version-status", "CF-FLOW11-DM-46", "domain", ["T198"],
    "T198 result documents MUST include schema.version and schema.status. Omitting these = INCOMPLETE_OUTPUT.",
    ["T198 returns documents without version field",
     "T198 projects only schemaId and name, omitting version and status"],
    ["T198 result documents include at minimum: schemaId, name, version, status, namespace",
     "version and status present in all search result items"],
    "T198 result fields: {schemaId, name, version, status, namespace, ...}. Missing version or status = INCOMPLETE_OUTPUT."
))

# ── T199 DagRenderGateway (DATA_PIPELINE) — 3 records ───────────────────────
new_records.append(make(
    "arb-flow11-render-empty-dag-placeholder", "CF-FLOW11-DM-47", "domain", ["T199"],
    "T199 MUST return placeholder Mermaid for 0-node DAG. NEVER return null or empty string.",
    ["T199 returns null for empty DAG",
     "T199 returns empty string for 0-node DAG",
     "T199 passes empty node list to renderer without guard"],
    ["T199 returns 'graph TD\\n  empty[\"No schemas registered\"]' for 0-node DAG",
     "DataProcessResult.success with placeholder string for empty DAG"],
    "T199: 0 nodes → DataProcessResult.success('graph TD\\n  empty[\"No schemas registered\"]'). Null or empty string = BUILD_FAILURE."
))

new_records.append(make(
    "arb-flow11-render-max-nodes-limit", "CF-FLOW11-DM-48", "domain", ["T199"],
    "T199 MUST limit render to MAX_NODES from FREEDOM config xiigen.schema.renderMaxNodes (default 500). Oversized DAG = DAG_TOO_LARGE.",
    ["T199 renders DAGs with more than 500 nodes without limit",
     "MAX_NODES not read from FREEDOM config",
     "T199 passes all nodes to renderer regardless of count"],
    ["T199 reads maxNodes from xiigen.schema.renderMaxNodes (default 500)",
     "nodes.length > maxNodes → DataProcessResult.failure('DAG_TOO_LARGE')",
     "node count checked before delegation to dagRendererHandler"],
    "T199 reads xiigen.schema.renderMaxNodes (default 500). nodes > maxNodes → DataProcessResult.failure('DAG_TOO_LARGE'). No limit = PERFORMANCE_VIOLATION."
))

new_records.append(make(
    "arb-flow11-render-version-labels", "CF-FLOW11-DM-49", "domain", ["T199"],
    "T199 MUST include schema version labels on rendered nodes (e.g. T189[\"SchemaName v1.2.0\"]). Missing version = INCOMPLETE_OUTPUT.",
    ["T199 renders nodes with schemaId only, no version label",
     "Mermaid node labels omit version",
     "dagRendererHandler called without version data"],
    ["T199 passes {nodeId, name, version} per node to dagRendererHandler",
     "Mermaid format: nodeId[\"name v{version}\"]",
     "version included in each rendered node label"],
    "T199 node label: nodeId[\"schemaName v{version}\"]. Node without version = INCOMPLETE_OUTPUT."
))

# ── T200 SchemaDeprecationManager (ORCHESTRATION) — 3 records ───────────────
new_records.append(make(
    "arb-flow11-deprecation-check-dependents", "CF-FLOW11-DM-50", "domain", ["T200"],
    "T200 MUST check for active dependents before deprecating. Active dependents → emit SchemaDeprecationBlocked.",
    ["T200 deprecates without checking active dependents",
     "T200 does not query xiigen-schema-dag for edges pointing to this schema",
     "SchemaDeprecationBlocked event never emitted"],
    ["T200 queries xiigen-schema-dag for {to: schemaId, orphaned: false}",
     "dependents found → storeDocument({status:'DEPRECATION_BLOCKED'}) + emit SchemaDeprecationBlocked",
     "no dependents → proceed with deprecated=true"],
    "T200 checks active dependents {to: schemaId, orphaned: false}. Found → emit SchemaDeprecationBlocked. Skipping = DATA_INTEGRITY_VIOLATION."
))

new_records.append(make(
    "arb-flow11-deprecation-ttl-from-freedom", "CF-FLOW11-DM-51", "domain", ["T200"],
    "T200 deprecation TTL MUST come from FREEDOM config xiigen.schema.deprecationTtlDays (default 90). Hardcoded TTL = Config_VIOLATION.",
    ["T200 uses hardcoded TTL without reading FREEDOM config",
     "deprecationTtlDays absent from FREEDOM key reads",
     "deprecation window fixed in source code"],
    ["T200 reads xiigen.schema.deprecationTtlDays from FREEDOM config",
     "deprecatedAt + ttlDays → removalEligibleAt",
     "FREEDOM absence falls back to 90"],
    "T200 reads xiigen.schema.deprecationTtlDays (default 90). Hardcoded TTL = Config_VIOLATION per Rule 14."
))

new_records.append(make(
    "arb-flow11-deprecation-event-emitted", "CF-FLOW11-DM-52", "domain", ["T200"],
    "T200 MUST emit SchemaDeprecated event after successful soft-delete. Missing event = AUDIT_VIOLATION.",
    ["T200 soft-deletes without emitting SchemaDeprecated",
     "T200 stores deprecated record but does not enqueue event"],
    ["T200 enqueues SchemaDeprecated after storeDocument per DNA-8",
     "payload: {schemaId, deprecatedAt, tenantId}"],
    "T200: storeDocument({deprecated:true, deprecatedAt}) then enqueue SchemaDeprecated. Missing event = AUDIT_VIOLATION per DNA-8."
))

# ── T201 SchemaHistoryTracker (DATA_PIPELINE) — 3 records ───────────────────
new_records.append(make(
    "arb-flow11-history-full-snapshot", "CF-FLOW11-DM-53", "domain", ["T201"],
    "T201 MUST store full schema snapshot at publish time — NOT only diff. Diff-only prevents point-in-time reconstruction.",
    ["T201 stores only changed fields (diff) in history record",
     "history record contains delta only",
     "point-in-time reconstruction not possible from history"],
    ["T201 stores complete schema body in history record at SchemaPublished event",
     "each history record is self-contained for point-in-time reconstruction"],
    "T201: full schema snapshot per publish. Diff-only history = COMPLIANCE_VIOLATION (reconstruction broken)."
))

new_records.append(make(
    "arb-flow11-history-actor-required", "CF-FLOW11-DM-54", "domain", ["T201"],
    "T201 history records MUST include actor={userId, tenantId} from ALS context. Missing actor = AUDIT_VIOLATION.",
    ["T201 stores history record without actor field",
     "userId absent from history record",
     "actor hardcoded or null"],
    ["T201 reads userId from ClsService ALS context",
     "history record includes {actor: {userId, tenantId}}"],
    "T201 history: actor: {userId: cls.get().userId, tenantId: cls.get().tenantId} required. Missing = AUDIT_VIOLATION."
))

new_records.append(make(
    "arb-flow11-history-immutable", "CF-FLOW11-DM-55", "domain", ["T201"],
    "T201 MUST NOT delete or update history records on schema deprecation or deletion. History is immutable.",
    ["T201 deletes history records when schema is deprecated",
     "T201 updates existing history records on schema change",
     "history removed on schema deletion"],
    ["T201 never calls deleteDocument or storeDocumentWithOCC on xiigen-schema-history",
     "history index is append-only"],
    "T201: no deleteDocument or storeDocumentWithOCC on history ever. Deleted on deprecation = COMPLIANCE_VIOLATION."
))

# ── T202 SchemaApprovalWorkflow (ORCHESTRATION) — 3 records ─────────────────
new_records.append(make(
    "arb-flow11-approval-defer-ttl-from-freedom", "CF-FLOW11-DM-56", "domain", ["T202"],
    "T202 DEFER TTL MUST come from FREEDOM config xiigen.schema.approvalDeferTtlHours (default 72). Hardcoded TTL = Config_VIOLATION.",
    ["T202 uses hardcoded DEFER TTL",
     "approvalDeferTtlHours not read from FREEDOM config"],
    ["T202 reads xiigen.schema.approvalDeferTtlHours (default 72)",
     "deferredUntil = now() + ttlHours in SchemaApprovalDeferred payload"],
    "T202 reads xiigen.schema.approvalDeferTtlHours (default 72h). Hardcoded TTL = Config_VIOLATION per Rule 14."
))

new_records.append(make(
    "arb-flow11-no-double-approval", "CF-FLOW11-DM-57", "domain", ["T202"],
    "T202 MUST prevent double-approval. Re-approving status=APPROVED schema = DataProcessResult.failure('ALREADY_APPROVED').",
    ["T202 processes APPROVE even when already APPROVED",
     "no idempotency check before APPROVE action",
     "double-approval overwrites prior record"],
    ["T202 checks for {schemaId, status:'APPROVED'} before processing",
     "found → DataProcessResult.failure('ALREADY_APPROVED')"],
    "T202: check existing {schemaId, status:'APPROVED'} before APPROVE. Found → DataProcessResult.failure('ALREADY_APPROVED'). Double approval = IDEMPOTENCY_VIOLATION."
))

new_records.append(make(
    "arb-flow11-approval-store-before-event", "CF-FLOW11-DM-58", "domain", ["T202"],
    "T202 MUST storeDocument BEFORE emitting approval event for all three outcomes. DNA-8.",
    ["T202 enqueues approval event before storing record",
     "SchemaApprovalGranted emitted before storeDocument"],
    ["T202 calls storeDocument before enqueue for APPROVED/REJECTED/DEFERRED",
     "DNA-8 order enforced for all three approval outcomes"],
    "T202: storeDocument BEFORE enqueue for all outcomes. Enqueue before store = BUILD_FAILURE per DNA-8."
))

# ── T203 SchemaMigrationOrchestrator (ORCHESTRATION) — 3 records ────────────
new_records.append(make(
    "arb-flow11-migration-dry-run", "CF-FLOW11-DM-59", "domain", ["T203"],
    "T203 MUST support dryRun=true mode. In dry run, no documents modified, affected count returned.",
    ["T203 does not support dryRun flag",
     "T203 applies migration regardless of dryRun value"],
    ["T203 accepts dryRun: boolean parameter",
     "dryRun=true: count matching documents without storeDocument",
     "result includes {processedCount, dryRun: boolean}"],
    "T203 dryRun=true: count records, no storeDocument. dryRun=false: migrate. Missing dryRun = ARCHITECTURE_VIOLATION."
))

new_records.append(make(
    "arb-flow11-migration-run-record-before-processing", "CF-FLOW11-DM-60", "domain", ["T203"],
    "T203 MUST store run record with status=IN_PROGRESS BEFORE processing any documents. DNA-8.",
    ["T203 stores migration run record after processing completes",
     "run record absent until all batches complete"],
    ["T203 stores {runId, startedAt, status:'IN_PROGRESS'} BEFORE first batch",
     "runId available for status updates throughout migration"],
    "T203: storeDocument({runId, status:'IN_PROGRESS'}) BEFORE first batch. Record after completion = DNA-8_VIOLATION."
))

new_records.append(make(
    "arb-flow11-migration-failed-status-on-error", "CF-FLOW11-DM-61", "domain", ["T203"],
    "T203 MUST set run status=FAILED and update record if any batch fails. Partial migration without status update = AUDIT_VIOLATION.",
    ["T203 does not update run record when batch fails",
     "run record remains IN_PROGRESS on error"],
    ["T203 wraps batch loop in try/catch",
     "catch: storeDocumentWithOCC({status:'FAILED', failedAt, error})",
     "finally: storeDocumentWithOCC({status:'COMPLETE', completedAt}) on success"],
    "T203 try/catch: failure → storeDocumentWithOCC({status:'FAILED', failedAt}). No status update on failure = AUDIT_VIOLATION."
))

# ── T204 DagConflictDetector (VALIDATION) — 4 records ───────────────────────
new_records.append(make(
    "arb-flow11-conflict-namespace-collision", "CF-FLOW11-DM-62", "domain", ["T204"],
    "T204 MUST detect NAMESPACE_COLLISION: two ACTIVE schemas with same name in same namespace.",
    ["T204 does not check for duplicate schema names within namespace",
     "NAMESPACE_COLLISION type not implemented"],
    ["T204 queries {namespace, name, status:'ACTIVE'} and checks count > 1",
     "count > 1 → NAMESPACE_COLLISION conflict",
     "result includes all conflicting schema IDs"],
    "T204: searchDocuments({namespace, name, status:'ACTIVE'}). count > 1 → NAMESPACE_COLLISION. Missing check = DATA_INTEGRITY_VIOLATION."
))

new_records.append(make(
    "arb-flow11-conflict-no-auto-resolve", "CF-FLOW11-DM-63", "domain", ["T204"],
    "T204 MUST NOT resolve conflicts — detection and reporting only. Auto-resolution = ARCHITECTURE_VIOLATION.",
    ["T204 auto-resolves by deprecating older schema",
     "T204 calls storeDocument to resolve conflicts inline"],
    ["T204 only reads (searchDocuments, getDocument) — no writes",
     "proposedResolution=null in all T204 results"],
    "T204 is detection-only: no storeDocument, no deleteDocument. proposedResolution=null always. Auto-resolution = ARCHITECTURE_VIOLATION."
))

new_records.append(make(
    "arb-flow11-conflict-event-emitted", "CF-FLOW11-DM-64", "domain", ["T204"],
    "T204 MUST emit SchemaConflictDetected with {conflictType, conflictingSchemas, proposedResolution: null}. Missing = AUDIT_VIOLATION.",
    ["T204 returns conflict without emitting event",
     "SchemaConflictDetected absent from T204 output"],
    ["T204 stores conflict record then enqueues SchemaConflictDetected",
     "DNA-8: storeDocument before enqueue",
     "payload: {conflictType, conflictingSchemas: string[], proposedResolution: null}"],
    "T204: storeDocument(conflict) then enqueue SchemaConflictDetected. proposedResolution=null always. Missing event = AUDIT_VIOLATION per DNA-8."
))

new_records.append(make(
    "arb-flow11-conflict-version-collision", "CF-FLOW11-DM-65", "domain", ["T204"],
    "T204 MUST detect VERSION_CONFLICT: two ACTIVE versions of same schema in same namespace.",
    ["T204 allows multiple ACTIVE versions to coexist",
     "VERSION_CONFLICT detection absent",
     "T204 only checks NAMESPACE_COLLISION"],
    ["T204 queries {schemaId, status:'ACTIVE'} and checks count > 1",
     "count > 1 → VERSION_CONFLICT",
     "both NAMESPACE_COLLISION and VERSION_CONFLICT checks run in T204"],
    "T204: searchDocuments({schemaId, status:'ACTIVE'}). count > 1 → VERSION_CONFLICT. Missing = DATA_INTEGRITY_VIOLATION."
))

# ── T205 SchemaValidationService (VALIDATION) — 3 records ───────────────────
new_records.append(make(
    "arb-flow11-validation-returns-all-errors", "CF-FLOW11-DM-66", "domain", ["T205"],
    "T205 MUST return ALL validation errors in single result. Fail-fast (stop at first error) = INCORRECT_VALIDATION.",
    ["T205 stops validation on first error found",
     "T205 returns only first validation error",
     "fail-fast used in T205"],
    ["T205 collects all validation errors before returning",
     "result includes errors: ValidationError[] with all failures"],
    "T205: collect all errors, return complete list. Fail-fast = INCORRECT_VALIDATION."
))

new_records.append(make(
    "arb-flow11-validation-no-side-effects", "CF-FLOW11-DM-67", "domain", ["T205"],
    "T205 MUST NOT trigger T190 or perform any write. Validation is read-only and side-effect-free.",
    ["T205 calls T190 SchemaVersionManager during validation",
     "T205 stores validation result before returning",
     "T205 enqueues events as part of validation"],
    ["T205 only calls db.searchDocuments and db.getDocument",
     "no enqueue, no storeDocument in T205",
     "T190 not called from T205"],
    "T205 pure read: getDocument/searchDocuments only. No storeDocument, no enqueue, no T190. Any write = ARCHITECTURE_VIOLATION."
))

new_records.append(make(
    "arb-flow11-validation-failed-event", "CF-FLOW11-DM-68", "domain", ["T205"],
    "T205 MUST emit SchemaValidationFailed when validation fails. Missing event on failure = AUDIT_VIOLATION.",
    ["T205 returns failure without emitting SchemaValidationFailed",
     "T205 stores no record on validation failure"],
    ["T205 stores validation record then enqueues SchemaValidationFailed on failure",
     "DNA-8: storeDocument before enqueue",
     "payload: {schemaId, errors: ValidationError[]}"],
    "T205: failure → storeDocument(record) then enqueue SchemaValidationFailed. Missing event = AUDIT_VIOLATION per DNA-8."
))

# ── T206 SchemaQualityAnalyzer (SCHEDULED) — 3 records ──────────────────────
new_records.append(make(
    "arb-flow11-quality-score-range", "CF-FLOW11-DM-69", "domain", ["T206"],
    "T206 MUST produce quality scores in [0.0, 1.0]. Score outside range = BUILD_FAILURE.",
    ["T206 produces score outside 0.0–1.0",
     "quality score not clamped"],
    ["T206 clamps: Math.min(1.0, Math.max(0.0, rawScore))",
     "DataProcessResult includes score in [0.0, 1.0]"],
    "T206: score = Math.min(1.0, Math.max(0.0, rawScore)). Score outside [0.0, 1.0] = BUILD_FAILURE."
))

new_records.append(make(
    "arb-flow11-quality-scores-separate-index", "CF-FLOW11-DM-70", "domain", ["T206"],
    "T206 MUST store quality scores in xiigen-schema-quality — NOT inline in schema record. Inline modification = ARCHITECTURE_VIOLATION.",
    ["T206 calls storeDocumentWithOCC to add qualityScore to schema record",
     "T206 modifies xiigen-schemas index"],
    ["T206 stores {schemaId, qualityScore, analyzedAt} in xiigen-schema-quality",
     "T206 never writes to xiigen-schemas"],
    "T206: xiigen-schema-quality only. Never writes to xiigen-schemas. Modifying schema record = ARCHITECTURE_VIOLATION."
))

new_records.append(make(
    "arb-flow11-quality-cron-from-freedom", "CF-FLOW11-DM-71", "domain", ["T206"],
    "T206 cron schedule MUST come from FREEDOM config xiigen.schema.qualityAnalysisCron (default '0 2 * * *'). Hardcoded cron = Config_VIOLATION.",
    ["T206 uses hardcoded @Cron('0 2 * * *')",
     "qualityAnalysisCron not read from FREEDOM config"],
    ["T206 reads xiigen.schema.qualityAnalysisCron from FREEDOM config",
     "FREEDOM absence falls back to '0 2 * * *'"],
    "T206 reads xiigen.schema.qualityAnalysisCron (default '0 2 * * *'). Hardcoded @Cron = Config_VIOLATION per Rule 14."
))

# ── T207 SchemaExportService (DATA_PIPELINE) — 3 records ────────────────────
new_records.append(make(
    "arb-flow11-export-chunk-size", "CF-FLOW11-DM-72", "domain", ["T207"],
    "T207 MUST chunk exports. CHUNK_SIZE from FREEDOM config xiigen.schema.exportChunkSize (default 1000). Single batch = PERFORMANCE_VIOLATION.",
    ["T207 exports all schemas in single batch",
     "CHUNK_SIZE not read from FREEDOM config"],
    ["T207 reads xiigen.schema.exportChunkSize (default 1000)",
     "while loop with offset += chunkSize",
     "each chunk stored as separate batch record"],
    "T207: while loop with offset += chunkSize (default 1000). Single batch = PERFORMANCE_VIOLATION."
))

new_records.append(make(
    "arb-flow11-export-metadata-header", "CF-FLOW11-DM-73", "domain", ["T207"],
    "T207 MUST include export metadata as first record: {tenantId, exportedAt, schemaCount, format}. Missing = INCOMPLETE_OUTPUT.",
    ["T207 export omits metadata header",
     "tenantId absent from export metadata"],
    ["T207 first record: {tenantId: cls.get().tenantId, exportedAt, schemaCount, format}",
     "metadata stored in xiigen-schema-exports before schema records"],
    "T207: first export record = {tenantId, exportedAt, schemaCount, format}. Missing header = INCOMPLETE_OUTPUT."
))

new_records.append(make(
    "arb-flow11-export-audit-before-stream", "CF-FLOW11-DM-74", "domain", ["T207"],
    "T207 MUST store export audit record in xiigen-schema-exports BEFORE streaming schema data. DNA-8.",
    ["T207 stores audit record after export completes",
     "DNA-8 violated: data streamed before audit record stored"],
    ["T207 stores {exportId, tenantId, startedAt, status:'IN_PROGRESS'} before first chunk",
     "status updated to 'COMPLETE' after all chunks"],
    "T207: storeDocument(exportAudit {status:'IN_PROGRESS'}) BEFORE first chunk. Audit after streaming = DNA-8_VIOLATION."
))

# ── T208 DagVisualizationGateway (ROUTING) — 3 records ──────────────────────
new_records.append(make(
    "arb-flow11-visualization-dot-format", "CF-FLOW11-DM-75", "domain", ["T208"],
    "T208 MUST support format=dot as third valid format. Unknown formats not in {mermaid, json, dot} = ROUTE_REJECTED.",
    ["T208 only handles mermaid and json",
     "format=dot returns error or ROUTE_REJECTED"],
    ["T208 routes format=dot to DotRenderer",
     "format=mermaid → T199, format=json → T197, format=dot → DotRenderer",
     "unknown format → DataProcessResult.failure('ROUTE_REJECTED')"],
    "T208 valid: {mermaid, json, dot}. dot → DotRenderer. Unknown → DataProcessResult.failure('ROUTE_REJECTED'). Missing dot = INCOMPLETE_ROUTING."
))

new_records.append(make(
    "arb-flow11-visualization-cache-hit", "CF-FLOW11-DM-76", "domain", ["T208"],
    "T208 MUST return cached visualization on DAG hash match. Re-rendering unchanged DAG = PERFORMANCE_VIOLATION.",
    ["T208 re-renders on every request without cache check",
     "content-addressed DAG cache absent"],
    ["T208 computes dagHash before rendering",
     "cache hit (same dagHash) → return cached visualization",
     "cache miss → render + store with dagHash"],
    "T208: dagHash check first. hit → cached result. miss → render + cache. No cache = PERFORMANCE_VIOLATION."
))

new_records.append(make(
    "arb-flow11-visualization-empty-dag-status", "CF-FLOW11-DM-77", "domain", ["T208"],
    "T208 MUST return {status: 'EMPTY_DAG', visualization: null} for 0-node DAG. NEVER empty string or null.",
    ["T208 returns empty string for 0-node DAG",
     "T208 returns null visualization for empty DAG"],
    ["T208 checks node count before delegation",
     "nodes.length === 0 → DataProcessResult.success({status:'EMPTY_DAG', visualization: null})"],
    "T208: 0 nodes → {status:'EMPTY_DAG', visualization: null}. Empty string = BUILD_FAILURE."
))

# ── Final assembly ───────────────────────────────────────────────────────────
print(f"Generated {len(new_records)} new arbiter records")

# Read current file and split at scope_isolation boundary
with open("fixtures/arbiters/schema-registry-dag-arbiters.bulk.ndjson", "r") as f:
    lines = f.readlines()

domain_lines = []
scope_lines = []
in_scope = False
i = 0
while i < len(lines):
    stripped = lines[i].strip()
    if not stripped:
        i += 1
        continue
    if stripped.startswith('{"index"'):
        next_stripped = lines[i+1].strip() if i+1 < len(lines) else ""
        if '"scope_isolation"' in next_stripped:
            in_scope = True
    if in_scope:
        scope_lines.append(lines[i])
    else:
        domain_lines.append(lines[i])
    i += 1

print(f"Existing domain/security lines: {len(domain_lines)} ({len(domain_lines)//2} records)")
print(f"Existing scope_isolation lines: {len(scope_lines)} ({len(scope_lines)//2} records)")

# Build new file content
new_content = "".join(domain_lines)
for r in new_records:
    new_content += r
new_content += "".join(scope_lines)

with open("fixtures/arbiters/schema-registry-dag-arbiters.bulk.ndjson", "w") as f:
    f.write(new_content)

# Verify
with open("fixtures/arbiters/schema-registry-dag-arbiters.bulk.ndjson", "r") as f:
    final_lines = [l for l in f.readlines() if l.strip() and '"arbiterId"' in l]

domain_count = sum(1 for l in final_lines if '"arbiterType": "domain"' in l)
security_count = sum(1 for l in final_lines if '"arbiterType": "security"' in l)
scope_count = sum(1 for l in final_lines if '"arbiterType": "scope_isolation"' in l)
print(f"Final counts: domain={domain_count}, security={security_count}, scope_isolation={scope_count}, total={len(final_lines)}")

// server/src/kernel/es-index-constants.ts
// NEW FILE — authoritative source for all ES index names

export const ES_INDEX = {
  RAG_PATTERNS: 'xiigen-rag-patterns',
  EXECUTION_STATE: 'xiigen-execution-state',
  FLOW_RUNS: 'xiigen-flow-runs',
  DPO_TRIPLES: 'xiigen-dpo-triples',
  ARTIFACT_BOUNDARIES: 'xiigen-artifact-boundaries',
  PLATFORM_REGISTRY: 'xiigen-platform-registry',
  SERVICE_REGISTRY: 'xiigen-service-registry',
  M1_MEMORY: 'xiigen-m1-memory',
  FREEDOM_CONFIG: 'xiigen-freedom-config',
  SCHEMA_REGISTRY: 'xiigen-schema-registry',
  GENERATION_PROVENANCE: 'xiigen-generation-provenance',
  // Additional indices used in the codebase
  FLOW_LIFECYCLE: 'xiigen-flow-lifecycle',
  FLOW_LIFECYCLE_AUDIT: 'xiigen-flow-lifecycle-audit',
  TENANT_REGISTRY: 'xiigen-tenant-registry',
  ARBITERS: 'xiigen-arbiters',
  CHECKPOINT_REPORTS: 'xiigen-checkpoint-reports',
} as const;

export type EsIndexName = (typeof ES_INDEX)[keyof typeof ES_INDEX];

/**
 * FLOW-23 BFA Rules — Form Builder Templates (new services T637-T640)
 *
 * CF-23-1: T637 JSON Schema validation ORDER 1 + required field enforcement ORDER 2 + type compatibility ORDER 3
 * CF-23-2: T638 OCC DRAFT→PUBLISHED ORDER 1 + version immutability ORDER 2 + schema evolution check ORDER 3
 * CF-23-3: T639 SETNX instantiation lock ORDER 1 + variable binding ORDER 2 + default merge ORDER 3 + redis.del in finally
 * CF-23-4: T640 Append-only usage metrics + PII exclusion + popularity scoring
 */

export const FORM_BUILDER_TEMPLATES_BFA_RULES = [
  {
    ruleId: 'CF-23-1',
    flowId: 'FLOW-23',
    description:
      'T637 TemplateSchemaValidator: three-gate JSON Schema validation is MACHINE-FIXED. ' +
      'JSON Schema structure validation at ORDER 1 — template.schema must be valid JSON Schema (draft-07, draft-2020-12). ' +
      'Required field enforcement at ORDER 2 — required fields marked in template.requiredFields must exist in schema.required array; cannot be empty. ' +
      'Type compatibility at ORDER 3 — field types must match ALLOWED_FIELD_TYPES = [string, number, boolean, object, array, null]. ' +
      'SchemaInvalid emitted on any validation gate failure; no further processing. ' +
      'storeDocument(validation audit) at ORDER 4 BEFORE enqueue(TemplateValidated or SchemaInvalid). DNA-8. ' +
      'Validation before required check, required check before type check, or enqueue before audit = BUILD_FAILURE. ' +
      'SF-CHECK-23-1.',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
  {
    ruleId: 'CF-23-2',
    flowId: 'FLOW-23',
    description:
      'T638 TemplateVersionPublisher: OCC publication with immutability is MACHINE-FIXED. ' +
      'OCC DRAFT→PUBLISHED updateDocument(status:PUBLISHED, expectedVersion) at ORDER 1 — NOT plain storeDocument. ' +
      'OCC_CONFLICT → emit TemplatePublicationConflict, no further processing. ' +
      'Version immutability guard at ORDER 2 — once PUBLISHED, template.schema cannot be modified. ' +
      'VersionImmutableRejected emitted on published template modification attempt. ' +
      'TEMPLATE_IMMUTABLE_STATES = [PUBLISHED] — compile-time constant, never from config. ' +
      'Schema evolution check at ORDER 3 — new schema must be forward-compatible superset of all previous published versions. ' +
      'No field removals allowed. SchemaEvolutionInvalid emitted on incompatibility. ' +
      'storeDocument(publication audit) at ORDER 4 BEFORE VersionPublished enqueue. DNA-8. ' +
      'Non-OCC publish, immutability check after write, plain storeDocument, or enqueue before audit = BUILD_FAILURE. ' +
      'SF-CHECK-23-2.',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
  {
    ruleId: 'CF-23-3',
    flowId: 'FLOW-23',
    description:
      'T639 TemplateInstantiationEngine: atomic instantiation with SETNX lock is MACHINE-FIXED. ' +
      'SETNX instantiation lock at ORDER 1 with key format template-instantiate-lock:{templateId}:{contextId}. ' +
      'InstantiationAlreadyInProgress emitted if lock is held — idempotent duplicate rejection. ' +
      'Variable binding substitution at ORDER 2 — resolve ${variable} patterns using provided bindings map. ' +
      'UnresolvedVariableError emitted if binding required but not provided. ' +
      'Default value merge at ORDER 3 — populate fields with template-defined defaults after variable binding. ' +
      'User-provided values override template defaults. ' +
      'storeDocument(form instance) at ORDER 4 BEFORE FormInstantiated enqueue. DNA-8. ' +
      'redis.del(lockKey) MUST be called in finally block on any outcome (success or failure). ' +
      'Missing redis.del = hung lock = future instantiations permanently blocked for that templateId:contextId. ' +
      'Lock without binding, binding without defaults, enqueue before store, or missing redis.del = BUILD_FAILURE. ' +
      'SF-CHECK-23-3.',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
  // P11 (CF-977..CF-980) — edge-case coverage from docs/flow-coverage/form-builder-templates/P10-server-specs.md
  {
    ruleId: 'CF-977',
    flowId: 'FLOW-23',
    type: 'CONCURRENCY_CONSTRAINT',
    description:
      'EC-13 Optimistic concurrency on POST /api/dynamic/form-builder-templates — winner 201, loser 409 {code:CONCURRENT_UPDATE}. Client retries (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
  {
    ruleId: 'CF-978',
    flowId: 'FLOW-23',
    type: 'IDEMPOTENCY_CONSTRAINT',
    description:
      'EC-14 X-Idempotency-Key replay — first call 201+stores; retries return 200 cached response; no duplicate side effects (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
  {
    ruleId: 'CF-979',
    flowId: 'FLOW-23',
    type: 'ORDERING_CONSTRAINT',
    description:
      'EC-16 Boundary validation — empty/null/zero primary field → 400 {code:VALIDATION_FAILED, details:[{field,reason}]}; no partial write (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
  {
    ruleId: 'CF-980',
    flowId: 'FLOW-23',
    type: 'DNA8_ORDERING',
    description:
      'EC-17 Fabric timeout — 504 {code:TIMEOUT, retryAfterMs}; outbox row retained; queue consumer retries deduplicatively (DNA-8) (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
  {
    ruleId: 'CF-23-4',
    flowId: 'FLOW-23',
    description:
      'T640 TemplateUsageAnalytics: append-only metrics with PII exclusion is MACHINE-FIXED. ' +
      'Append-only metrics storeDocument at ORDER 1 — never updateDocument on usage records. ' +
      'Each instantiation or form submission creates a new metrics storeDocument record. ' +
      'PII_EXCLUDED_FIELDS = [formData, userInput, values, responseData] — compile-time constant. ' +
      'PII exclusion at ORDER 2 — user form input values NOT stored in metrics. ' +
      'Only metadata recorded: field types, submission status, response time, success/failure, timestamp. ' +
      'Popularity scoring at ORDER 3 — rank templates by (instantiation_count + submission_count) / template_age_days. ' +
      'Recent high-usage templates score higher. ' +
      'All metrics remain PRIVATE knowledgeScope per tenant — no cross-tenant leakage. ' +
      'UsageMetricsRecorded emitted at ORDER 4 to enable downstream analytics pipelines. ' +
      'updateDocument on metrics, user input values in storage, or cross-tenant visibility = BUILD_FAILURE. ' +
      'scope_isolation arbiter present in all arbiterConfig blocks (FC-32). ' +
      'SF-CHECK-23-4 + SF-CHECK-23-5.',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
];

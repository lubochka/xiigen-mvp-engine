/**
 * FLOW-21 BFA Rules — Dynamic Forms & Workflows
 *
 * CF-21-1: T629 FormSchemaPublisher — OCC schema publishing with immutable published state
 * CF-21-2: T630 FormSubmissionProcessor — BOLA check + validation against published schema
 * CF-21-3: T631 AutomationDispatcher — SETNX rule locks + conditional branching
 * CF-21-4: T632 SubmissionAnalyticsCollector — append-only analytics with PII exclusion
 */

export const DYNAMIC_FORMS_WORKFLOWS_BFA_RULES = [
  {
    ruleId: 'CF-21-1',
    flowId: 'FLOW-21',
    description:
      'T629 FormSchemaPublisher: Schema publishing via OCC with DRAFT→PUBLISHED transition. ' +
      'storeDocumentWithOCC(schema, version, expectedVersion) ensures concurrent publishes prevented. ' +
      'Published schema.fields is immutable — no updates to published version allowed. ' +
      'All field validation rules must exist before publish (empty rules blocks publish, emit SchemaPublishFailed). ' +
      'New schema versions created as separate documents (version=N+1, DRAFT state). ' +
      'IFormSchemaRepository (F1569): OCC support for schema publish. ' +
      'Violation: Updating published schema fields (schema drift, client confusion); ' +
      'no OCC (concurrent publish race conditions); publishing without field validation rules.',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
  {
    ruleId: 'CF-21-2',
    flowId: 'FLOW-21',
    description:
      'T630 FormSubmissionProcessor: BOLA (Broken Object Level Authorization) check at ORDER 1. ' +
      'submitterTenantId = cls.get(TENANT_CONTEXT_KEY).tenantId. ' +
      'submitterTenantId !== form.tenantId → emit SubmissionRejected with UNAUTHORIZED, do not proceed. ' +
      'Validate submission against published (immutable) schema version only — never cached version. ' +
      'Each submission field must match schema field definition: type, required, constraints. ' +
      'Validation failures returned as DataProcessResult.success({valid: false, errors: [...]}) — never failure(). ' +
      'Store submission before emitting events (outbox pattern, DNA-8). ' +
      'IFormSchemaRepository (F1570): fetch published schema. ' +
      'IFormSubmissionRepository (F1571): store validated submission. ' +
      'Violation: No BOLA check (cross-tenant form submission); validating against cached/draft schema ' +
      '(outdated validation rules); validation failures thrown as exceptions; emitting events before submission stored.',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
  {
    ruleId: 'CF-21-3',
    flowId: 'FLOW-21',
    description:
      'T631 AutomationDispatcher: Automation rule dispatch with atomicity via SETNX(rule-exec-lock:{submissionId}:{ruleId}). ' +
      'Lock acquired → execute rule to completion. Lock held → return idempotency response (rule already executed). ' +
      'Rule condition evaluated against submission data (field, operator, value). Condition true → action-A; false → action-B (multi-path branching). ' +
      'Rule actions: emit event, call webhook, transform data, store record. Actions queued; execution per rule definition. ' +
      'Store submission before dispatching rules (outbox pattern, DNA-8). Rule.tenantId must match submitterTenantId (from ALS). ' +
      'IRuleEngineRepository (F1572): fetch rules for formId. ' +
      'IRedisLockService (F1573): SETNX for rule execution locks. ' +
      'Violation: No execution locks (duplicate rule dispatch on concurrent submissions); ' +
      'no conditional branching (all automation paths execute); rules dispatched before submission stored; ' +
      'cross-tenant rule dispatch (rule.tenantId mismatch).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
  // P11 (CF-969..CF-972) — edge-case coverage from docs/flow-coverage/dynamic-forms-workflows/P10-server-specs.md
  {
    ruleId: 'CF-969',
    flowId: 'FLOW-21',
    type: 'CONCURRENCY_CONSTRAINT',
    description:
      'EC-5 Optimistic concurrency on POST /api/dynamic/dynamic-forms-workflows — winner 201, loser 409 {code:CONCURRENT_UPDATE}. Client retries (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
  {
    ruleId: 'CF-970',
    flowId: 'FLOW-21',
    type: 'IDEMPOTENCY_CONSTRAINT',
    description:
      'EC-6 X-Idempotency-Key replay — first call 201+stores; retries return 200 cached response; no duplicate side effects (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
  {
    ruleId: 'CF-971',
    flowId: 'FLOW-21',
    type: 'ORDERING_CONSTRAINT',
    description:
      'EC-8 Boundary validation — empty/null/zero primary field → 400 {code:VALIDATION_FAILED, details:[{field,reason}]}; no partial write (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
  {
    ruleId: 'CF-972',
    flowId: 'FLOW-21',
    type: 'DNA8_ORDERING',
    description:
      'EC-9 Fabric timeout — 504 {code:TIMEOUT, retryAfterMs}; outbox row retained; queue consumer retries deduplicatively (DNA-8) (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
  {
    ruleId: 'CF-21-4',
    flowId: 'FLOW-21',
    description:
      'T632 SubmissionAnalyticsCollector: Append-only analytics aggregation with PII exclusion and tenant scope. ' +
      'Insert analytics records (never update). Partition by tenantId, formId, dateWindow (daily, hourly). ' +
      'PII NEVER indexed: email, phone, ssn, password, creditCard. Only analytics-safe fields: status, fieldCount, validationErrors, submittedAt. ' +
      'Tenant-scoped aggregation: all queries filtered by tenantId from ALS. Cross-tenant visibility blocked. ' +
      'Aggregate metrics: count submissions per formId per day, avg field count, error rate %. ' +
      'Date partitioning: xiigen-submission-analytics-{DATE}. Query windows (TODAY, WEEK, MONTH) map to date ranges. ' +
      'IAnalyticsRepository (F1574): append-only storage with date partitioning. ' +
      'IAggregateMetricsService (F1575): aggregate metric fetch + update. ' +
      'Violation: Updating analytics records (lost immutability); storing PII in analytics (privacy breach); ' +
      'cross-tenant queries (no tenantId filter); no date partitioning (slow time-series queries).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
];

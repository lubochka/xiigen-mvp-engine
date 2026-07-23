export const CMS_PUBLISHING_BFA_RULES = [
  {
    ruleId: 'CF-22-1',
    flowId: 'FLOW-22',
    flowName: 'CMS Publishing',
    taskTypeId: 'T633',
    taskName: 'ContentVersionPublisher',
    category: 'STATE_MACHINE',
    title: 'OCC DRAFT→PUBLISHED State Machine with Version Immutability',
    description:
      'Content transitions DRAFT → PENDING_REVIEW → PUBLISHED → ARCHIVED. After PUBLISHED, version is immutable.',
    rule: 'T633 MUST implement OCC via versionNumber. Update query MUST include WHERE versionNumber = old. Conflict MUST return failure.',
    checkCommand:
      'grep -A 10 "versionNumber" server/src/engine/flows/cms-publishing/content-version-publisher.service.ts',
    blockConditions: [
      'OCC not implemented',
      'Conflict throws exception',
      'Published version has update path',
    ],
    passConditions: [
      'WHERE versionNumber = old in OCC update query',
      'No updateDocument for PUBLISHED versions',
    ],
  },
  {
    ruleId: 'CF-22-2',
    flowId: 'FLOW-22',
    flowName: 'CMS Publishing',
    taskTypeId: 'T634',
    taskName: 'ContentApprovalWorkflow',
    category: 'ORCHESTRATION',
    title: 'Sequential Approval Stages with Role-Based Gates',
    description:
      'Stages execute sequentially. All assigned reviewers per stage must approve unanimously.',
    rule: 'T634 MUST orchestrate stages sequentially. Role-to-stage mapping MUST be loaded from FREEDOM.',
    checkCommand:
      'grep -n "for.*stage" server/src/engine/flows/cms-publishing/content-approval-workflow.service.ts',
    blockConditions: ['Stages run in parallel', 'Role assignments hardcoded'],
    passConditions: ['Stages execute via await loop', 'Roles loaded from FREEDOM config'],
  },
  {
    ruleId: 'CF-22-3',
    flowId: 'FLOW-22',
    flowName: 'CMS Publishing',
    taskTypeId: 'T635',
    taskName: 'ContentScheduleDispatcher',
    category: 'IDEMPOTENCY',
    title: 'SETNX Idempotency Lock with Durable Timer Retries',
    description:
      'SETNX lock guarantees exactly-once semantics. Lock key: publish-schedule:{contentId}:{timestamp}.',
    rule: 'T635 MUST use SETNX at ORDER 1. Lock held → return cached result. Lock TTL from FREEDOM.',
    checkCommand:
      'grep -n "SETNX|setnx" server/src/engine/flows/cms-publishing/content-schedule-dispatcher.service.ts',
    blockConditions: ['SETNX lock not used', 'Lock TTL hardcoded'],
    passConditions: ['SETNX lock checked at ORDER 1', 'Lock TTL from FREEDOM config'],
  },
  // P11 (CF-973..CF-976) — edge-case coverage from docs/flow-coverage/cms-publishing/P10-server-specs.md
  {
    ruleId: 'CF-973',
    flowId: 'FLOW-22',
    type: 'CONCURRENCY_CONSTRAINT',
    description:
      'EC-7 Optimistic concurrency on POST /api/dynamic/cms-publishing — winner 201, loser 409 {code:CONCURRENT_UPDATE}. Client retries (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
  {
    ruleId: 'CF-974',
    flowId: 'FLOW-22',
    type: 'IDEMPOTENCY_CONSTRAINT',
    description:
      'EC-8 X-Idempotency-Key replay — first call 201+stores; retries return 200 cached response; no duplicate side effects (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
  {
    ruleId: 'CF-975',
    flowId: 'FLOW-22',
    type: 'ORDERING_CONSTRAINT',
    description:
      'EC-10 Boundary validation — empty/null/zero primary field → 400 {code:VALIDATION_FAILED, details:[{field,reason}]}; no partial write (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
  {
    ruleId: 'CF-976',
    flowId: 'FLOW-22',
    type: 'DNA8_ORDERING',
    description:
      'EC-11 Fabric timeout — 504 {code:TIMEOUT, retryAfterMs}; outbox row retained; queue consumer retries deduplicatively (DNA-8) (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
  {
    ruleId: 'CF-22-4',
    flowId: 'FLOW-22',
    flowName: 'CMS Publishing',
    taskTypeId: 'T636',
    taskName: 'ContentAnalyticsAggregator',
    category: 'DATA_PIPELINE',
    title: 'Append-Only Analytics with GDPR PII Masking',
    description:
      'Metrics recorded append-only. User deletion flips piiScrubbed flag, never deletes records.',
    rule: 'T636 MUST implement append-only storage. User deletion MUST set piiScrubbed: true. userId MUST be hashed (SHA256).',
    checkCommand:
      'grep -n "updateDocument|deleteDocument" server/src/engine/flows/cms-publishing/content-analytics-aggregator.service.ts',
    blockConditions: [
      'updateDocument on metrics',
      'User deletion deletes records',
      'Raw userId storage',
    ],
    passConditions: [
      'Append-only: storeDocument only',
      'User deletion flips piiScrubbed flag',
      'userId hashed with SHA256',
    ],
  },
];

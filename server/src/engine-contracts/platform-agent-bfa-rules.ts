/**
 * FLOW-46: Platform Agent (Super Engine Assistant)
 * BFA rules: CF-839, CF-840, CF-841
 *
 * Rule 16: file uses semantic slug "platform-agent" — never "flow-46"
 *
 * CF-839: TENANT_ISOLATION — T651 TenantScopeGateway MUST write the xiigen-agent-actions audit
 *         record BEFORE cls.run executes. Audit inside cls.run writes under the target tenant scope,
 *         making the audit invisible to platform admin in MASTER scope.
 *
 * CF-840: COST_GATE — T653 SuperJudgeArbiter MUST emit DEFER_TO_AF9 with zero LLM call when
 *         input.platformPatternsMatched === 0. Hallucinated verdicts on zero evidence degrade the
 *         training pipeline downstream.
 *
 * CF-841: PRIVACY — T655 PatternContributor sanitizer failure (Path B) MUST abort the contribution.
 *         status=SANITIZATION_FAILED is written; xiigen-rag-patterns receives NO write; no retry.
 */

export const FLOW_46_BFA_RULES: Array<Record<string, unknown>> = [
  {
    ruleId: 'CF-839',
    flowId: 'FLOW-46',
    flowName: 'Platform Agent',
    taskTypeId: 'T651',
    taskName: 'TenantScopeGateway',
    category: 'TENANT_ISOLATION',
    title: 'Audit Before Scope Switch (DNA-8)',
    description:
      'TenantScopeGateway MUST write the xiigen-agent-actions audit record BEFORE the cls.run ' +
      'scope switch executes. Audit inside cls.run writes under the target tenant scope, ' +
      'making the audit invisible to platform admin in the MASTER scope.',
    rule: 'T651 MUST call db.storeDocument(xiigen-agent-actions, auditRec, id) BEFORE this.cls.run(...).',
    checkCommand:
      'grep -n "storeDocument\\|cls.run" server/src/engine/flows/platform-agent/tenant-scope-gateway.service.ts',
    blockConditions: [
      'storeDocument(xiigen-agent-actions) not called before cls.run',
      'Audit write happens inside cls.run callback',
    ],
    passConditions: [
      'storeDocument(xiigen-agent-actions, ...) on a line earlier than this.cls.run(...)',
      'Audit record has tenantId=MASTER_TENANT_ID, not targetTenantId',
    ],
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
  {
    ruleId: 'CF-840',
    flowId: 'FLOW-46',
    flowName: 'Platform Agent',
    taskTypeId: 'T653',
    taskName: 'SuperJudgeArbiter',
    category: 'COST_GATE',
    title: 'DEFER_TO_AF9 on Zero Evidence — Zero LLM Cost',
    description:
      'When platformPatternsMatched === 0, SuperJudgeArbiter MUST emit DEFER_TO_AF9 without ' +
      'invoking any LLM. A verdict with zero evidence is hallucination; hallucinated verdicts ' +
      'degrade the training pipeline downstream.',
    rule: 'T653 MUST short-circuit with return DataProcessResult.success({ verdict:"DEFER_TO_AF9", cost:0, llmCalls:0 }) when input.platformPatternsMatched === 0.',
    checkCommand:
      'grep -n "platformPatternsMatched" server/src/engine/flows/platform-agent/super-judge-arbiter.service.ts',
    blockConditions: [
      'LLM call executed when platformPatternsMatched === 0',
      'DPO triple written on DEFER_TO_AF9 path',
    ],
    passConditions: [
      'Zero-evidence check fires before LLM invocation',
      'cost: 0 + llmCalls: 0 in the DEFER_TO_AF9 response',
    ],
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
  // P11 (CF-1082..CF-1095) — edge-case coverage from docs/flow-coverage/platform-agent/P10-server-specs.md
  {
    ruleId: 'CF-1082',
    flowId: 'FLOW-46',
    type: 'CONCURRENCY_CONSTRAINT',
    description:
      'EC-4 Optimistic concurrency on POST /api/dynamic/platform-agent — winner 201, loser 409 {code:CONCURRENT_UPDATE}. Client retries (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
  {
    ruleId: 'CF-1083',
    flowId: 'FLOW-46',
    type: 'IDEMPOTENCY_CONSTRAINT',
    description:
      'EC-5 X-Idempotency-Key replay — first call 201+stores; retries return 200 cached response; no duplicate side effects (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
  {
    ruleId: 'CF-1084',
    flowId: 'FLOW-46',
    type: 'ORDERING_CONSTRAINT',
    description:
      'EC-7 Boundary validation — empty/null/zero primary field → 400 {code:VALIDATION_FAILED, details:[{field,reason}]}; no partial write (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
  {
    ruleId: 'CF-1085',
    flowId: 'FLOW-46',
    type: 'DNA8_ORDERING',
    description:
      'EC-8 Fabric timeout — 504 {code:TIMEOUT, retryAfterMs}; outbox row retained; queue consumer retries deduplicatively (DNA-8) (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
  {
    ruleId: 'CF-1086',
    flowId: 'FLOW-46',
    type: 'CONCURRENCY_CONSTRAINT',
    description:
      'EC-9 Optimistic concurrency on POST /api/dynamic/platform-agent — winner 201, loser 409 {code:CONCURRENT_UPDATE}. Client retries (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
  {
    ruleId: 'CF-1087',
    flowId: 'FLOW-46',
    type: 'IDEMPOTENCY_CONSTRAINT',
    description:
      'EC-10 X-Idempotency-Key replay — first call 201+stores; retries return 200 cached response; no duplicate side effects (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
  {
    ruleId: 'CF-1088',
    flowId: 'FLOW-46',
    type: 'ORDERING_CONSTRAINT',
    description:
      'EC-12 Boundary validation — empty/null/zero primary field → 400 {code:VALIDATION_FAILED, details:[{field,reason}]}; no partial write (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
  {
    ruleId: 'CF-1089',
    flowId: 'FLOW-46',
    type: 'DNA8_ORDERING',
    description:
      'EC-13 Fabric timeout — 504 {code:TIMEOUT, retryAfterMs}; outbox row retained; queue consumer retries deduplicatively (DNA-8) (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
  {
    ruleId: 'CF-1090',
    flowId: 'FLOW-46',
    type: 'CONCURRENCY_CONSTRAINT',
    description:
      'EC-14 Optimistic concurrency on POST /api/dynamic/platform-agent — winner 201, loser 409 {code:CONCURRENT_UPDATE}. Client retries (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
  {
    ruleId: 'CF-1091',
    flowId: 'FLOW-46',
    type: 'IDEMPOTENCY_CONSTRAINT',
    description:
      'EC-15 X-Idempotency-Key replay — first call 201+stores; retries return 200 cached response; no duplicate side effects (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
  {
    ruleId: 'CF-1092',
    flowId: 'FLOW-46',
    type: 'ORDERING_CONSTRAINT',
    description:
      'EC-17 Boundary validation — empty/null/zero primary field → 400 {code:VALIDATION_FAILED, details:[{field,reason}]}; no partial write (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
  {
    ruleId: 'CF-1093',
    flowId: 'FLOW-46',
    type: 'DNA8_ORDERING',
    description:
      'EC-18 Fabric timeout — 504 {code:TIMEOUT, retryAfterMs}; outbox row retained; queue consumer retries deduplicatively (DNA-8) (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
  {
    ruleId: 'CF-1094',
    flowId: 'FLOW-46',
    type: 'CONCURRENCY_CONSTRAINT',
    description:
      'EC-19 Optimistic concurrency on POST /api/dynamic/platform-agent — winner 201, loser 409 {code:CONCURRENT_UPDATE}. Client retries (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
  {
    ruleId: 'CF-1095',
    flowId: 'FLOW-46',
    type: 'IDEMPOTENCY_CONSTRAINT',
    description:
      'EC-20 X-Idempotency-Key replay — first call 201+stores; retries return 200 cached response; no duplicate side effects (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
  {
    ruleId: 'CF-841',
    flowId: 'FLOW-46',
    flowName: 'Platform Agent',
    taskTypeId: 'T655',
    taskName: 'PatternContributor',
    category: 'PRIVACY',
    title: 'Sanitizer Failure Aborts Contribution',
    description:
      'PatternSanitizer failure in Path B MUST abort the contribution. xiigen-agent-contributions ' +
      'receives status=SANITIZATION_FAILED; xiigen-rag-patterns receives NO write; no retry is ' +
      'attempted (retry reproduces the same failure).',
    rule: 'T655 MUST NOT write to xiigen-rag-patterns when sanitize() throws or returns unableToStripField=true.',
    checkCommand:
      'grep -n "sanitize\\|SANITIZATION_FAILED" server/src/engine/flows/platform-agent/pattern-contributor.service.ts',
    blockConditions: [
      'xiigen-rag-patterns write proceeds after sanitizer throw',
      'Retry on SANITIZATION_FAILED status',
    ],
    passConditions: [
      'status:"SANITIZATION_FAILED" written to xiigen-agent-contributions',
      'No xiigen-rag-patterns write in same session',
      'No automatic retry',
    ],
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
];

/**
 * Context builders for arbiter-panel evaluators.
 * Each builder produces ISOLATED context for a specific arbiter role.
 * P20: key_principles arbiter context must contain ONLY principles text + code — no domain context.
 */

export interface ArbiterContext {
  role: string;
  context: string;
  code: string;
}

/** business_logic arbiter: iron rules + domain events + BFA CF rules only */
export function buildBusinessLogicContext(params: {
  code: string;
  ironRules?: string[];
  domainEvents?: string[];
  bfaRules?: string[];
}): ArbiterContext {
  const contextParts: string[] = [];
  if (params.ironRules?.length) {
    contextParts.push(`IRON RULES:\n${params.ironRules.join('\n')}`);
  }
  if (params.domainEvents?.length) {
    contextParts.push(`DOMAIN EVENTS:\n${params.domainEvents.join('\n')}`);
  }
  if (params.bfaRules?.length) {
    contextParts.push(`BFA RULES:\n${params.bfaRules.join('\n')}`);
  }
  return {
    role: 'business_logic',
    context: contextParts.join('\n\n'),
    code: params.code,
  };
}

/** security arbiter: DNA-3/5/8 compliance + failure modes only */
export function buildSecurityContext(params: {
  code: string;
  failureModes?: string[];
}): ArbiterContext {
  const dnaRules = [
    'DNA-3: All service methods return DataProcessResult<T>. Never throw for business logic.',
    'DNA-5: Tenant scope is automatic via AsyncLocalStorage. Never pass tenantId as parameter.',
    'DNA-8: storeDocument() MUST happen BEFORE enqueue(). Outbox pattern enforced.',
  ];
  const contextParts = [`DNA COMPLIANCE RULES:\n${dnaRules.join('\n')}`];
  if (params.failureModes?.length) {
    contextParts.push(`KNOWN FAILURE MODES:\n${params.failureModes.join('\n')}`);
  }
  return {
    role: 'security',
    context: contextParts.join('\n\n'),
    code: params.code,
  };
}

/** skills_and_patterns arbiter: RAG patterns only */
export function buildSkillsContext(params: {
  code: string;
  ragPatterns?: string[];
}): ArbiterContext {
  return {
    role: 'skills_and_patterns',
    context: params.ragPatterns?.length
      ? `RETRIEVED RAG PATTERNS:\n${params.ragPatterns.join('\n')}`
      : 'No RAG patterns available for this task type.',
    code: params.code,
  };
}

/** prompts_compliance arbiter: genesis prompt text + output format only */
export function buildPromptsContext(params: {
  code: string;
  genesisPrompt?: string;
  outputFormat?: string;
}): ArbiterContext {
  const parts: string[] = [];
  if (params.genesisPrompt) parts.push(`GENESIS PROMPT:\n${params.genesisPrompt}`);
  if (params.outputFormat) parts.push(`EXPECTED OUTPUT FORMAT:\n${params.outputFormat}`);
  return {
    role: 'prompts_compliance',
    context: parts.join('\n\n') || 'No genesis prompt available.',
    code: params.code,
  };
}

/** key_principles arbiter: ONLY principles text + generated code — NO domain context (P20 isolation) */
export function buildKeyPrinciplesContext(params: { code: string }): ArbiterContext {
  // P20: context contains ONLY principlesText + generatedCode
  // NO iron rules, NO RAG patterns, NO domain events, NO archetype/flow ID
  const principlesText = `
MISSION PRINCIPLES (M1-M5):
M1: Every code generation run must produce DPO training data (chosen/rejected pair).
M2: Training data quality improves with each flow iteration (TEACH → IMPROVE → REPLACE).
M3: OSS model graduation threshold tracks real quality, not vanity metrics.
M4: No DPO triple counts toward threshold unless chosen.model !== rejected.model.
M5: Every MACHINE constant is a security invariant — never make it FREEDOM config.

DNA PATTERNS (DNA-1 through DNA-9):
DNA-1: ALL business data uses Record<string, unknown>. No typed models.
DNA-2: ALL queries use BuildSearchFilter. Empty/null fields auto-skipped.
DNA-3: ALL service methods return DataProcessResult<T>. Never throw for business logic.
DNA-4: ALL services extend MicroserviceBase. No exceptions.
DNA-5: Tenant scope automatic via AsyncLocalStorage. Never pass tenantId as parameter.
DNA-6: One DynamicController for all CRUD via /api/dynamic/{indexName}.
DNA-7: All queue consumers must deduplicate using idempotency keys.
DNA-8: storeDocument() MUST happen BEFORE enqueue(). Outbox pattern.
DNA-9: All inter-service events use CloudEvents envelope via createCloudEvent().

IMPLEMENTATION PRINCIPLES (P1-P22 summary):
P1-P8: Fabric-first, no direct HTTP, factory resolution, BFA before ship, config over code.
P9-P11: Client architecture required for UI flows, stack coupling awareness.
P12-P16: NODE-first design, INCOMPATIBLE must be challenged, wave assignment deliberate.
P17: Multi-model blind generation — minimum 2 providers for valid DPO triple.
P18: CurriculumTier must be set — ROUTING=1, DATA_PIPELINE=2, VALIDATION=2, TRANSACTION=3, ORCHESTRATION=4, SCHEDULED=5.
P19: Zero known defects gate — failures === 0 absolute (not delta).
P20: Principles arbiter runs AFTER all other arbiters. Context contains ONLY principles text.
P21: Gap score tracks delta between paid model and OSS model on same task.
P22: ENGINE PROGRESS section mandatory before every ⛔ STOP.
`.trim();

  return {
    role: 'key_principles',
    context: principlesText,
    code: params.code,
  };
}

/**
 * scope_isolation arbiter: three-tier scoping model compliance only.
 * FC-32: mandatory 8th panel member on every node regardless of archetype.
 * IR-SCOPE-01..05 — BLOCK on unfiltered mixed-scope reads or missing tenantId writes.
 * ADVISORY (not BLOCK) on unnecessary tenantId on platform-global indices.
 */
export function buildScopeIsolationContext(params: { code: string }): ArbiterContext {
  const scopingRules = `
THREE-TIER SCOPING MODEL (CF-POLICY-01 — iron rule):

Scope tiers:
  PRIVATE — owner tenant only. Read: knowledgeScope === 'PRIVATE' AND tenantId === caller.
             Default when knowledgeScope field is absent (CF-POLICY-01).
  MODULE  — any tenant may read. No tenantId filter required on read.
  GLOBAL  — platform knowledge. Any tenant may read.

Mixed-scope indices (scope filter REQUIRED on every read):
  xiigen-training-data, xiigen-rag-patterns, xiigen-knowledge-policy,
  xiigen-training-data-pending, xiigen-training-data-review, xiigen-freedom-config

Per-tenant indices (tenantId field REQUIRED on every write):
  spend-events, security-violations, xiigen-arbiter-verdicts,
  xiigen-oss-curriculum-runs, xiigen-shadow-runs, xiigen-run-traces

Platform-global indices (no scope filter — correct to omit):
  xiigen-flow-lifecycle, xiigen-flow-registry, xiigen-engine-contracts,
  xiigen-calibration-baseline

Violation rules:
  IR-SCOPE-01 (BLOCK):    unfiltered read on a mixed-scope index
  IR-SCOPE-02 (BLOCK):    write to a per-tenant index without tenantId field
  IR-SCOPE-03 (ADVISORY): unnecessary tenantId filter on a platform-global index
  IR-SCOPE-04 (BLOCK):    knowledgeScope field absent from DpoTriple or training data interface
  IR-SCOPE-05 (BLOCK):    ClsService not injected but mixed-scope read is performed

Fail-open rule: when CLS is unavailable or throws, continue without filter (admin path).
Do NOT BLOCK for fail-open — the absence of CLS on the admin path is intentional.
`.trim();

  return {
    role: 'scope_isolation',
    context: scopingRules,
    code: params.code,
  };
}

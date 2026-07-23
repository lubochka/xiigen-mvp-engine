/**
 * FLOW-46 — Platform Agent (Super Engine Assistant)
 * Task types: T650-T656
 * Factories: F1601-F1605
 * BFA rules: CF-839-CF-841
 *
 * Rule 16: file uses semantic slug "platform-agent" — never "flow-46"
 *
 * DNA compliance:
 *   DNA-1: all data Record<string, unknown>
 *   DNA-3: DataProcessResult returned; never throw
 *   DNA-5: tenantId from CLS only (except T651 which is the authorized exception)
 *   DNA-8: storeDocument BEFORE enqueue on every event emission
 *
 * Architecture decisions: see docs/sessions/FLOW-46/FLOW-46-PLAN-STATE.json
 *   identity:    MASTER_TENANT_ID (no parallel identity space)
 *   access:      TenantScopeGateway via CLS (audit-before-switch)
 *   approval:    pendingActions reuse (confirmationEvent / rollbackEvent)
 *   scope:       PRIVATE / GLOBAL only (existing two-scope model)
 *   contribution: DD-323 logic-only (Path A immediate, Path B consent-gated)
 */

export const T650_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T650',
  name: 'AgentRunOrchestrator',
  family: 210,
  flowId: 'FLOW-46',
  archetype: 'orchestration',
  version: 'v1',
  executionModel: 'async',
  description:
    'Entry orchestrator for platform agent runs. Sets MASTER_TENANT_ID CLS, invokes AF-1..AF-11 ' +
    'with T652 + T653 inserted, branches by actionType to T654, triggers T655 on contribution, ' +
    'emits AgentSessionCompleted. Pure orchestration — writes only the final session record.',
  requiredFactories: ['F1601'],
  bfaRules: [],
  ironRules: [
    'IR-1: tenantId in CLS MUST equal MASTER_TENANT_ID before AF-1 invocation',
    'IR-2: AgentSessionCompleted emitted EXACTLY once per session (idempotent on sessionId)',
    'IR-3: T650 does NOT write business records — only the AgentSessionCompleted summary row',
  ],
  arbiterConfig: {
    evaluatorArbiters: {
      goal_delivery: {
        model: 'AI_GOAL_DELIVERY_ARBITER',
        blind: true,
        isolated: true,
        runsFirst: true,
        governedBy: 'SK-534',
      },
      scope_isolation: { model: 'AI_SCOPE_ARBITER', blind: true, governedBy: 'SK-526' },
      business_logic: {
        model: 'AI_DOMAIN_ARBITER',
        expertise: 'iron rules + domain events + BFA',
      },
      security: { model: 'AI_SECURITY_ARBITER', expertise: 'DNA-3/5/8 + failure modes' },
      skills_patterns: {
        model: 'AI_SKILLS_ARBITER',
        expertise: 'RAG-retrieved archetype patterns',
      },
      prompts_compliance: {
        model: 'AI_PROMPTS_ARBITER',
        expertise: 'genesis prompt text + format spec',
      },
      key_principles: {
        model: 'AI_PRINCIPLES_ARBITER',
        expertise: 'M1-M5 + P1-P22 + DNA-1..9',
        isolated: true,
      },
      iron_rules: { model: 'AI_IRON_RULES_ARBITER', expertise: 'contract.ironRules[]' },
      completeness: { model: 'AI_COMPLETENESS_ARBITER', expertise: 'node.structure' },
      super_judge_meta: {
        model: 'AI_SUPER_JUDGE_ARBITER',
        expertise: 'platform-aggregate verdict',
        governedBy: 'CF-840',
      },
    },
    blockSemanticsBehavior: 'ANY_BLOCK_CLASS_REJECTS',
    tieBreak: 'alphabetical-label',
    minimumProviders: 2,
    undecidedIndex: 'xiigen-training-data-review',
  },
};

export const T651_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T651',
  name: 'TenantScopeGateway',
  family: 210,
  flowId: 'FLOW-46',
  archetype: 'governance',
  version: 'v1',
  executionModel: 'inline',
  description:
    'Audited cross-tenant CLS scope switch. Callers invoke with targetTenantId + reason + inner ' +
    'callback. Writes xiigen-agent-actions audit BEFORE cls.run executes (CF-839). Returns result ' +
    'of inner; outer MASTER context restored by cls.run.',
  requiredFactories: ['F1601'],
  bfaRules: ['CF-839'],
  ironRules: [
    'IR-1: caller CLS context MUST equal MASTER_TENANT_ID at entry (NOT_ADMIN on mismatch)',
    'IR-2: xiigen-agent-actions audit written BEFORE cls.run (CF-839, DNA-8)',
    'IR-3: targetTenantId !== MASTER_TENANT_ID (no-op switch forbidden)',
  ],
  arbiterConfig: {
    evaluatorArbiters: {
      scope_isolation: { model: 'AI_SCOPE_ARBITER', blind: true, governedBy: 'SK-526' },
      security: { model: 'AI_SECURITY_ARBITER', expertise: 'CLS scope switch + audit ordering' },
      business_logic: { model: 'AI_DOMAIN_ARBITER', expertise: 'CF-839 audit-before-switch' },
      key_principles: { model: 'AI_PRINCIPLES_ARBITER', expertise: 'DNA-5/8' },
      iron_rules: { model: 'AI_IRON_RULES_ARBITER', expertise: 'contract.ironRules[]' },
    },
    blockSemanticsBehavior: 'ANY_BLOCK_CLASS_REJECTS',
    tieBreak: 'alphabetical-label',
    minimumProviders: 2,
  },
};

export const T652_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T652',
  name: 'PlatformContextEnricher',
  family: 210,
  flowId: 'FLOW-46',
  archetype: 'data_pipeline',
  version: 'v1',
  executionModel: 'inline',
  description:
    'Reads GLOBAL patterns from xiigen-rag-patterns (filter: knowledgeScope=GLOBAL, ' +
    'tenantId=MASTER_TENANT_ID, tags matching keywords). Augments AF-4 patterns[] and ' +
    'linkedModules[] non-destructively. Returns enrichedContext + platformPatternsMatched count ' +
    'for T653 CF-840 decision.',
  requiredFactories: ['F1602'],
  bfaRules: [],
  ironRules: [
    'IR-1: read-only; no writes',
    'IR-2: augment-not-replace — existing AF-4 fields preserved',
    'IR-3: platformPatternsMatched count returned in output for CF-840 downstream',
  ],
  arbiterConfig: {
    evaluatorArbiters: {
      scope_isolation: { model: 'AI_SCOPE_ARBITER', blind: true, governedBy: 'SK-526' },
      business_logic: { model: 'AI_DOMAIN_ARBITER', expertise: 'GLOBAL pattern filter semantics' },
      security: { model: 'AI_SECURITY_ARBITER', expertise: 'read-only invariant' },
      skills_patterns: { model: 'AI_SKILLS_ARBITER', expertise: 'RAG retrieval shape' },
      key_principles: { model: 'AI_PRINCIPLES_ARBITER', expertise: 'augment-not-replace' },
      iron_rules: { model: 'AI_IRON_RULES_ARBITER', expertise: 'contract.ironRules[]' },
    },
    blockSemanticsBehavior: 'ANY_BLOCK_CLASS_REJECTS',
    tieBreak: 'alphabetical-label',
    minimumProviders: 2,
  },
};

export const T653_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T653',
  name: 'SuperJudgeArbiter',
  family: 210,
  flowId: 'FLOW-46',
  archetype: 'validation',
  version: 'v1',
  executionModel: 'inline',
  description:
    'Post-AF-9 platform-quality gate. CF-840: platformPatternsMatched === 0 → DEFER_TO_AF9 with ' +
    'zero LLM call. Otherwise: LLM call via superJudge.model (FREEDOM) → one of ' +
    'OVERRIDE_PASS / OVERRIDE_BLOCK / DEFER_TO_AF9. Every OVERRIDE writes a DPO triple to ' +
    'xiigen-training-data BEFORE emit.',
  requiredFactories: ['F1603'],
  bfaRules: ['CF-840'],
  ironRules: [
    'IR-1: CF-840 zero-LLM path on platformPatternsMatched === 0',
    'IR-2: superJudge.model from FREEDOM config; no hardcoded literal',
    'IR-3: DPO triple discriminating_constraint is NON-EMPTY on every OVERRIDE',
  ],
  arbiterConfig: {
    evaluatorArbiters: {
      scope_isolation: { model: 'AI_SCOPE_ARBITER', blind: true, governedBy: 'SK-526' },
      business_logic: { model: 'AI_DOMAIN_ARBITER', expertise: 'CF-840 zero-evidence path' },
      security: { model: 'AI_SECURITY_ARBITER', expertise: 'cost gate + LLM invocation' },
      skills_patterns: { model: 'AI_SKILLS_ARBITER', expertise: 'platform pattern evidence' },
      key_principles: { model: 'AI_PRINCIPLES_ARBITER', expertise: 'FREEDOM model selection' },
      iron_rules: { model: 'AI_IRON_RULES_ARBITER', expertise: 'contract.ironRules[]' },
    },
    blockSemanticsBehavior: 'ANY_BLOCK_CLASS_REJECTS',
    tieBreak: 'alphabetical-label',
    minimumProviders: 2,
  },
};

export const T654_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T654',
  name: 'AgentActionPublisher',
  family: 210,
  flowId: 'FLOW-46',
  archetype: 'transaction',
  version: 'v1',
  executionModel: 'async',
  description:
    'Branches by actionType. ADVISE: PRIVATE TenantTopology under MASTER. ' +
    'PROPOSE_EDIT: via T651, forkToPrivate + updateDraft on target tenant. ' +
    'CREATE_FLOW: via T651, storePrivate new DRAFT on target tenant. ' +
    'APPLY_GLOBAL: pre-check MASTER_TENANT, storeGlobalTemplate. ' +
    'All branches: storeDocument(xiigen-agent-actions) BEFORE emit AgentActionProposed.',
  requiredFactories: ['F1604'],
  bfaRules: [],
  ironRules: [
    'IR-1: DNA-8 — storeDocument BEFORE enqueue on every branch',
    'IR-2: APPLY_GLOBAL pre-checks CLS=MASTER_TENANT_ID at branch entry',
    'IR-3: PROPOSE_EDIT uses forkToPrivate + updateDraft, never direct storePrivate',
  ],
  arbiterConfig: {
    evaluatorArbiters: {
      scope_isolation: { model: 'AI_SCOPE_ARBITER', blind: true, governedBy: 'SK-526' },
      business_logic: { model: 'AI_DOMAIN_ARBITER', expertise: 'actionType branching + DRAFT/PUBLISHED state machine' },
      security: { model: 'AI_SECURITY_ARBITER', expertise: 'APPLY_GLOBAL pre-check + DNA-8 outbox' },
      skills_patterns: { model: 'AI_SKILLS_ARBITER', expertise: 'forkToPrivate + updateDraft pattern' },
      prompts_compliance: { model: 'AI_PROMPTS_ARBITER', expertise: 'pendingActions protocol' },
      key_principles: { model: 'AI_PRINCIPLES_ARBITER', expertise: 'DNA-5/8 + DD-323' },
      iron_rules: { model: 'AI_IRON_RULES_ARBITER', expertise: 'contract.ironRules[]' },
      completeness: { model: 'AI_COMPLETENESS_ARBITER', expertise: 'all 4 actionType branches present' },
      consent_protocol: { model: 'AI_CONSENT_ARBITER', expertise: 'pendingActions + confirmationEvent + rollbackEvent' },
    },
    blockSemanticsBehavior: 'ANY_BLOCK_CLASS_REJECTS',
    tieBreak: 'alphabetical-label',
    minimumProviders: 2,
  },
};

export const T655_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T655',
  name: 'PatternContributor',
  family: 210,
  flowId: 'FLOW-46',
  archetype: 'data_pipeline',
  version: 'v1',
  executionModel: 'async',
  description:
    'Path A (agent-pure): direct write to xiigen-rag-patterns + xiigen-planning-decisions + ' +
    'xiigen-prompts (GLOBAL+MASTER). Path B (tenant-derived): internal PatternSanitizer strips ' +
    'tenant-identifying fields → consent gate (chat) → Share writes shared, KeepPrivate writes ' +
    'tenant-private only. CF-841: sanitizer failure → abort + status=SANITIZATION_FAILED + no retry.',
  requiredFactories: ['F1605'],
  bfaRules: ['CF-841'],
  ironRules: [
    'IR-1: Path A no consent; Path B requires consent before GLOBAL write',
    'IR-2: CF-841 sanitizer failure = abort + log + no retry',
    'IR-3: PatternSanitizer is internal to T655; no separate service class',
  ],
  arbiterConfig: {
    evaluatorArbiters: {
      scope_isolation: { model: 'AI_SCOPE_ARBITER', blind: true, governedBy: 'SK-526' },
      business_logic: { model: 'AI_DOMAIN_ARBITER', expertise: 'Path A vs Path B provenance + DD-323' },
      security: { model: 'AI_SECURITY_ARBITER', expertise: 'CF-841 sanitizer abort + no retry' },
      skills_patterns: { model: 'AI_SKILLS_ARBITER', expertise: 'sanitization stripping fields' },
      key_principles: { model: 'AI_PRINCIPLES_ARBITER', expertise: 'DD-323 logic-only' },
      iron_rules: { model: 'AI_IRON_RULES_ARBITER', expertise: 'contract.ironRules[]' },
    },
    blockSemanticsBehavior: 'ANY_BLOCK_CLASS_REJECTS',
    tieBreak: 'alphabetical-label',
    minimumProviders: 2,
  },
};

export const T656_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T656',
  name: 'AgentChatClient',
  family: 210,
  flowId: 'FLOW-46',
  archetype: 'routing',
  version: 'v1',
  executionModel: 'client',
  description:
    'Client /chat page. POST /api/agent/run → renders textResponse + actionsProposed[]. Uses ' +
    'existing pendingActions protocol (CLIENT-ARCHITECTURE-SPEC lines 163-166). ActionCard is ' +
    'the ONE new React component; FlowLibraryPage row + TopologyViewer + tab pattern reused.',
  requiredFactories: [],
  bfaRules: [],
  ironRules: [
    'IR-1: POST /api/agent/run payload mirrors CycleChainController.run shape',
    'IR-2: only ActionCard is new; no other new React components',
    'IR-3: /chat route in NAV_ITEMS with section:"engine"',
  ],
  arbiterConfig: {
    evaluatorArbiters: {
      scope_isolation: { model: 'AI_SCOPE_ARBITER', blind: true, governedBy: 'SK-526' },
      business_logic: { model: 'AI_DOMAIN_ARBITER', expertise: 'pendingActions protocol' },
      key_principles: { model: 'AI_PRINCIPLES_ARBITER', expertise: 'client architecture reuse' },
      iron_rules: { model: 'AI_IRON_RULES_ARBITER', expertise: 'contract.ironRules[]' },
      completeness: { model: 'AI_COMPLETENESS_ARBITER', expertise: 'NAV_ITEMS + ActionCard + textResponse' },
    },
    blockSemanticsBehavior: 'ANY_BLOCK_CLASS_REJECTS',
    tieBreak: 'alphabetical-label',
    minimumProviders: 2,
  },
};

export const PLATFORM_AGENT_CONTRACTS: Array<Record<string, unknown>> = [
  T650_CONTRACT,
  T651_CONTRACT,
  T652_CONTRACT,
  T653_CONTRACT,
  T654_CONTRACT,
  T655_CONTRACT,
  T656_CONTRACT,
];

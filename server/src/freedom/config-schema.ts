/**
 * FREEDOM Config Schema — defines the shape of admin-configurable values.
 *
 * These are the FREEDOM layer: what admins can change without code changes.
 * Stored as Record<string, unknown> documents (DNA-1: no typed models).
 *
 * Phase 7.3: FREEDOM foundation.
 */

import { DataProcessResult } from '../kernel/data-process-result';

/** Valid value types for FREEDOM config entries. */
export const VALID_VALUE_TYPES = new Set(['string', 'int', 'float', 'bool', 'list', 'dict']);

/**
 * Validate a FREEDOM config document.
 * Uses dict, not typed models (DNA-1).
 * DNA-3: returns DataProcessResult.
 */
export function validateConfigDoc(doc: Record<string, unknown>): DataProcessResult<boolean> {
  const errors: string[] = [];

  if (!doc.config_key) {
    errors.push('config_key is required');
  } else if (typeof doc.config_key !== 'string') {
    errors.push('config_key must be a string');
  }

  if (!doc.task_type) {
    errors.push('task_type is required');
  }

  if (!('value' in doc)) {
    errors.push('value is required (can be any type)');
  }

  const valueType = (doc.value_type as string) ?? 'string';
  if (!VALID_VALUE_TYPES.has(valueType)) {
    errors.push(
      `value_type must be one of [${[...VALID_VALUE_TYPES].join(', ')}], got '${valueType}'`,
    );
  }

  if (errors.length > 0) {
    return DataProcessResult.failure('INVALID_CONFIG', errors.join('; '));
  }
  return DataProcessResult.success(true);
}

// ── XIIGen FREEDOM Config Keys ────────────────────────────────────────────────
// Canonical list of all xiigen.* FREEDOM config keys.
// Read via FreedomConfigManager.getConfig(XIIGEN_FREEDOM_KEYS.JUDGE_MODEL).
// Written to 'freedom_configs' (same as FREEDOM_INDEX in config-manager.ts).
// Source of truth for D-EXT-009 (no hardcoded model names in schemas).

export const XIIGEN_FREEDOM_KEYS = {
  /**
   * D-EXT-009: The model used for blind judging in the AF pipeline.
   * Read by: fabrics.module.ts AI_JUDGE_PROVIDER factory
   * Default: 'claude-sonnet-4-5'
   */
  JUDGE_MODEL: 'xiigen.judge_model',

  /**
   * P18/P21: OSS model family for DPO triple targetModelFamily field.
   * Read by: feedback.handler.ts (SESSION-G1 wires this)
   * Default: 'deepseek-coder-v2'
   */
  OSS_TARGET_MODEL: 'xiigen.oss_target_model',

  /**
   * P18: Instruction format for OSS fine-tuning.
   * Read by: feedback.handler.ts (SESSION-G1 wires this)
   * Default: 'deepseek-coder'
   */
  OSS_INSTRUCTION_FORMAT: 'xiigen.oss_instruction_format',

  /**
   * P21: Gap score threshold below which model switch is considered.
   * Default: 0.05 (5% gap between expensive model and OSS model scores)
   */
  SWITCH_GAP_THRESHOLD: 'xiigen.switch_gap_threshold',

  // ── T583: Context arbiter config keys ──────────────────────────────────────
  /** T583: Enable/disable context arbiter enrichment globally. Default: true */
  CONTEXT_ARBITER_ENABLED: 'xiigen.context_arbiter_enabled',
  /** T583: Min arbiter aggregate score to activate context search. Default: 0.70 */
  CONTEXT_ACTIVATION_THRESHOLD: 'xiigen.context_activation_threshold',
  /** T583: Score delta below which context is considered sufficient. Default: 0.02 */
  CONTEXT_SUFFICIENCY_THRESHOLD: 'xiigen.context_sufficiency_threshold',
  /** T583: Max enrichment iterations per arbiter per run. Default: 5 */
  CONTEXT_ARBITER_MAX_ITER_PER_ARBITER: 'xiigen.context_arbiter_max_iter_per_arbiter',
  /** T582/T583: Total AI calls budget per run for context enrichment. Default: 20 */
  CONTEXT_ARBITER_BUDGET_PER_RUN: 'xiigen.context_arbiter_budget_per_run',
  /** T583: Context search mode — 'pool_only' | 'pool_and_rag'. Default: 'pool_only' */
  CONTEXT_SEARCH_MODE: 'xiigen.context_search_mode',
  /** T583: Gap signal keywords (JSON array string). Comma-separated for FREEDOM config. */
  CONTEXT_GAP_SIGNAL_KEYWORDS: 'xiigen.context_gap_signal_keywords',
  /** T583: Hours to keep pool entries before archival. Default: 48 */
  POOL_ARCHIVE_GRACE_HOURS: 'xiigen.pool_archive_grace_hours',

  // ── FC-31: Model hint keys — no hardcoded model names in contracts ──────────
  /** FC-31: Model hint for BFA conflict arbitration generator. Default: FREEDOM_MODEL_HINT */
  BFA_GENERATOR_MODEL: 'xiigen.bfa_generator_model',
  /** FC-31: Model hint for BFA conflict arbitration judge. Default: FREEDOM_MODEL_HINT */
  BFA_JUDGE_MODEL: 'xiigen.bfa_judge_model',
  /** FC-31: Model hint for Feature Registry tasks. Default: FREEDOM_MODEL_HINT */
  FEATURE_REGISTRY_MODEL: 'xiigen.feature_registry_model',

  // ── B-3: Shadow run graduation thresholds (per tier) ────────────────────────
  /** B-3: Shadow run graduation threshold for Tier 1 archetypes. Default: 0.05 */
  SHADOW_RUN_GRADUATION_THRESHOLD_TIER1: 'shadowRun.graduationThreshold.tier1',
  /** B-3: Shadow run graduation threshold for Tier 2 archetypes. Default: 0.05 */
  SHADOW_RUN_GRADUATION_THRESHOLD_TIER2: 'shadowRun.graduationThreshold.tier2',
  /** B-3: Shadow run graduation threshold for Tier 3 archetypes. Default: 0.08 */
  SHADOW_RUN_GRADUATION_THRESHOLD_TIER3: 'shadowRun.graduationThreshold.tier3',
  /** B-3: Shadow run graduation threshold for Tier 4 archetypes. Default: 0.10 */
  SHADOW_RUN_GRADUATION_THRESHOLD_TIER4: 'shadowRun.graduationThreshold.tier4',
  /** B-3: Shadow run graduation threshold for Tier 5 archetypes. Default: 0.12 */
  SHADOW_RUN_GRADUATION_THRESHOLD_TIER5: 'shadowRun.graduationThreshold.tier5',
  /** B-3: Number of shadow runs required per tier before graduation is evaluated. Default: 20 */
  SHADOW_RUN_TRIPLE_TARGET_PER_TIER: 'shadowRun.tripleTargetPerTier',
  /** B-3: Consecutive below-threshold failures before regression reversion. Default: 2 */
  SHADOW_RUN_REGRESSION_CONSECUTIVE_FAILURES: 'shadowRun.regressionConsecutiveFailures',
  /** B-3: Number of flows without progress before marking tier as stalled. Default: 4 */
  SHADOW_RUN_STALLED_AFTER_FLOWS: 'shadowRun.stalledAfterFlows',

  // ── Model tier overrides (FLOW-38 foundation) ────────────────────────────────
  // Set these per-tenant at runtime via FREEDOM config to override env var defaults.
  // FLOW-38 auto-calibration writes to these keys when tier sufficiency is confirmed.
  GEMINI_MODEL_ECONOMY: 'xiigen.models.gemini.economy',
  GEMINI_MODEL_BALANCED: 'xiigen.models.gemini.balanced',
  GEMINI_MODEL_PREMIUM: 'xiigen.models.gemini.premium',
  OPENAI_MODEL_ECONOMY: 'xiigen.models.openai.economy',
  OPENAI_MODEL_BALANCED: 'xiigen.models.openai.balanced',
  OPENAI_MODEL_PREMIUM: 'xiigen.models.openai.premium',
  ANTHROPIC_MODEL_ECONOMY: 'xiigen.models.anthropic.economy',
  ANTHROPIC_MODEL_BALANCED: 'xiigen.models.anthropic.balanced',
  ANTHROPIC_MODEL_PREMIUM: 'xiigen.models.anthropic.premium',

  // ── Convergence round control (TeachingRoundService) ─────────────────────────
  CONVERGENCE_MIN_ROUNDS: 'xiigen.convergence.minRounds',
  CONVERGENCE_MAX_ROUNDS: 'xiigen.convergence.maxRounds',
  CONVERGENCE_QUALITY_THRESHOLD: 'xiigen.convergence.qualityThreshold',
  CONVERGENCE_STAGNATION_DRIFT: 'xiigen.convergence.stagnationDrift',
  /** G1: Enrich Model B prompt with previous cycle summaries. Default: false */
  CONVERGENCE_MODEL_B_ENRICHED: 'xiigen.convergence.modelBEnriched',
  /** G4: Enable dynamic arbiter expansion for uncovered constraints. Default: false */
  CONVERGENCE_DYNAMIC_ARBITERS: 'xiigen.convergence.dynamicArbiters',
  /** G3: Enable post-retrieval RAG applicability evaluation. Default: false */
  RAG_EVALUATION_ENABLED: 'xiigen.rag.evaluationEnabled',
  /** G5: GraphRAG sync mode — 'disabled' | 'per-triple'. Default: 'disabled' */
  GRAPHRAG_SYNC_MODE: 'xiigen.graphrag.syncMode',
  /** G5: Batch size for GraphRAG sync. Default: 10 */
  GRAPHRAG_BATCH_SIZE: 'xiigen.graphrag.batchSize',
  /** G5: Minimum quality threshold for GraphRAG sync. Default: 0.85 */
  GRAPHRAG_MIN_QUALITY_THRESHOLD: 'xiigen.graphrag.minQualityThreshold',
  /** G5: GraphRAG service endpoint. Default: 'http://localhost:8080' */
  GRAPHRAG_ENDPOINT: 'xiigen.graphrag.endpoint',
  /** G6: Enable pre-retrieval RAG query reformulation. Default: false */
  RAG_QUERY_REFORMULATION_ENABLED: 'xiigen.rag.queryReformulationEnabled',

  // ── FLOW-01: User Registration & Onboarding ──────────────────────────────────
  /** CF-3: Rate limit window for ResendVerificationRequested. Rule is MACHINE; window is FREEDOM. */
  FLOW01_RESEND_RATE_LIMIT_MINUTES: 'flow01_resend_rate_limit_minutes',
  /** T49/C3: Sender name on community invitation email. 'That an invitation exists' is MACHINE. */
  FLOW01_INVITATION_INVITER_NAME: 'flow01_invitation_inviter_name',
  /** T49/C3: Community name used in invitation email body. */
  FLOW01_INVITATION_COMMUNITY_NAME: 'flow01_invitation_community_name',
  // GAP-09 (Fix Plan v4.9 Tier 2 A78) — 4 additional FLOW-01 FREEDOM keys:
  /** T48: Email verification link TTL in seconds. Security engineering decides per abuse profile. */
  FLOW01_EMAIL_VERIFICATION_TTL_SECONDS: 'flow01_email_verification_ttl_seconds',
  /** T47: Failed registration attempts per IP per hour before CAPTCHA required. */
  FLOW01_CAPTCHA_TRIGGER_THRESHOLD: 'flow01_captcha_trigger_threshold',
  /** T47: Tenant-level max successful registrations per hour (tenant-level cap vs per-user resend). */
  FLOW01_REGISTRATION_RATE_LIMIT_PER_TENANT_HOUR: 'flow01_registration_rate_limit_per_tenant_hour',
  /** T49: Days after registration before reminder sent to verified-but-not-onboarded users. */
  FLOW01_ONBOARDING_REMINDER_DAYS: 'flow01_onboarding_reminder_days',

  // FLOW-06: User Groups & Communities
  /** T89: Engagement scoring weights for group feed population. */
  FLOW06_GROUP_FEED_WEIGHTS: 'flow06_group_feed_weights',

  // FLOW-07: Friend Request Social Feed
  /** T76: Maximum generated feed items per accepted connection activity. */
  FLOW07_FEED_ITEMS_PER_CONNECTION: 'flow07_feed_items_per_connection',
  /** T77: Feed personalization scoring weights. */
  FLOW07_FEED_SCORING_WEIGHTS: 'flow07_feed_scoring_weights',
  /** T78: Minimum score required before a feed item is delivered. */
  FLOW07_DELIVERY_SCORE_THRESHOLD: 'flow07_delivery_score_threshold',
  /** T78: Maximum delivery fan-out per connection activity. */
  FLOW07_MAX_FEED_INSERTS_PER_CONNECTION: 'flow07_max_feed_inserts_per_connection',
  /** T79: Allowed notification channels for social-feed notifications. */
  FLOW07_NOTIFICATION_CHANNELS: 'flow07_notification_channels',

  // FLOW-10: Reviews & Reputation
  /** T170: Confidence at or above this value publishes a moderated review. */
  FLOW10_MODERATION_PASS_THRESHOLD: 'flow10_moderation_pass_threshold',
  /** T170: Confidence below this value rejects a review for content policy. */
  FLOW10_MODERATION_REJECT_THRESHOLD: 'flow10_moderation_reject_threshold',
  /** T171: Per-position weights for published reviews sorted newest first. */
  FLOW10_REPUTATION_RECENCY_WEIGHTS: 'flow10_reputation_recency_weights',

  // FLOW-11: Schema Registry & DAG
  /** T202: Approval window before unresolved breaking schema changes expire. */
  FLOW11_SCHEMA_APPROVAL_WINDOW_MS: 'flow11_schema_registry_approval_window_ms',
  /** T202: Safe default decision for approvals without explicit operator input. */
  FLOW11_SCHEMA_DEFAULT_APPROVAL_DECISION: 'flow11_schema_registry_default_approval_decision',
  /** T200: Time between deprecation request and archive eligibility. */
  FLOW11_SCHEMA_DEPRECATION_TTL_MS: 'flow11_schema_registry_deprecation_ttl_ms',
  /** T208: Cache TTL for rendered DAG visualization responses. */
  FLOW11_SCHEMA_VISUALIZATION_CACHE_TTL_MS:
    'flow11_schema_registry_visualization_cache_ttl_ms',

  // FORK-FLOW-ENGINE-PLAN-v1.1 (FLOW-47 fork infrastructure) — PER-TENANT keys:
  /** Vault server address — tenants running their own Vault override this default. Profile-2. */
  VAULT_ADDRESS: 'vault_address',
  /** Vault authentication token for this tenant — set during onboarding, never in env. Profile-1. */
  VAULT_TOKEN: 'vault_token',
  /** Tenant's GitHub PAT with repo scope — stored in Vault under this key. Profile-1. */
  TENANT_GITHUB_TOKEN: 'tenant_github_token',
  /** Tenant's GitHub username or org — repos created at github.com/{this}/... Profile-1. */
  TENANT_GITHUB_USERNAME: 'tenant_github_username',

  // ── FLOW-02: Business Onboarding Intelligence ────────────────────────────
  /** FLOW-02: Debounce window in seconds for QuestionnaireCompleted deduplication. Default: 300 */
  FLOW02_DEBOUNCE_WINDOW_SECONDS: 'flow02_debounce_window_seconds',
  /** FLOW-02: Timeout for compatibility scoring (B1) in seconds. Default: 30 */
  FLOW02_MATCH_TIMEOUT_SECONDS: 'flow02_match_timeout_seconds',
  /** FLOW-02: Weight for industry_code in compatibility scoring algorithm. Default: 0.4 */
  FLOW02_MATCH_WEIGHT_INDUSTRY: 'flow02_match_weight_industry',
  /** FLOW-02: Weight for business_stage in compatibility scoring algorithm. Default: 0.3 */
  FLOW02_MATCH_WEIGHT_STAGE: 'flow02_match_weight_stage',
  /** FLOW-02: Weight for location_proximity in compatibility scoring algorithm. Default: 0.2 */
  FLOW02_MATCH_WEIGHT_LOCATION: 'flow02_match_weight_location',
  /** FLOW-02: Weight for team_size_tier in compatibility scoring algorithm. Default: 0.1 */
  FLOW02_MATCH_WEIGHT_TEAM: 'flow02_match_weight_team',
} as const;

export const XIIGEN_FREEDOM_DEFAULTS: Record<string, unknown> = {
  [XIIGEN_FREEDOM_KEYS.JUDGE_MODEL]: 'claude-sonnet-4-5',
  [XIIGEN_FREEDOM_KEYS.OSS_TARGET_MODEL]: 'deepseek-coder-v2',
  [XIIGEN_FREEDOM_KEYS.OSS_INSTRUCTION_FORMAT]: 'deepseek-coder',
  [XIIGEN_FREEDOM_KEYS.SWITCH_GAP_THRESHOLD]: 0.05,
  // T583: context arbiter defaults
  [XIIGEN_FREEDOM_KEYS.CONTEXT_ARBITER_ENABLED]: true,
  [XIIGEN_FREEDOM_KEYS.CONTEXT_ACTIVATION_THRESHOLD]: 0.7,
  [XIIGEN_FREEDOM_KEYS.CONTEXT_SUFFICIENCY_THRESHOLD]: 0.02,
  [XIIGEN_FREEDOM_KEYS.CONTEXT_ARBITER_MAX_ITER_PER_ARBITER]: 5,
  [XIIGEN_FREEDOM_KEYS.CONTEXT_ARBITER_BUDGET_PER_RUN]: 20,
  [XIIGEN_FREEDOM_KEYS.CONTEXT_SEARCH_MODE]: 'pool_only',
  [XIIGEN_FREEDOM_KEYS.CONTEXT_GAP_SIGNAL_KEYWORDS]:
    'insufficient information,cannot determine,unclear from the code,missing,no context,contradicts,unknown constraint,incomplete specification,missing requirement',
  [XIIGEN_FREEDOM_KEYS.POOL_ARCHIVE_GRACE_HOURS]: 48,
  // FC-31: model hint defaults — signal to runtime to use provider default
  [XIIGEN_FREEDOM_KEYS.BFA_GENERATOR_MODEL]: 'FREEDOM_MODEL_HINT',
  [XIIGEN_FREEDOM_KEYS.BFA_JUDGE_MODEL]: 'FREEDOM_MODEL_HINT',
  [XIIGEN_FREEDOM_KEYS.FEATURE_REGISTRY_MODEL]: 'FREEDOM_MODEL_HINT',
  // B-3: shadow run graduation threshold defaults (per tier)
  [XIIGEN_FREEDOM_KEYS.SHADOW_RUN_GRADUATION_THRESHOLD_TIER1]: 0.05,
  [XIIGEN_FREEDOM_KEYS.SHADOW_RUN_GRADUATION_THRESHOLD_TIER2]: 0.05,
  [XIIGEN_FREEDOM_KEYS.SHADOW_RUN_GRADUATION_THRESHOLD_TIER3]: 0.08,
  [XIIGEN_FREEDOM_KEYS.SHADOW_RUN_GRADUATION_THRESHOLD_TIER4]: 0.1,
  [XIIGEN_FREEDOM_KEYS.SHADOW_RUN_GRADUATION_THRESHOLD_TIER5]: 0.12,
  [XIIGEN_FREEDOM_KEYS.SHADOW_RUN_TRIPLE_TARGET_PER_TIER]: 20,
  [XIIGEN_FREEDOM_KEYS.SHADOW_RUN_REGRESSION_CONSECUTIVE_FAILURES]: 2,
  [XIIGEN_FREEDOM_KEYS.SHADOW_RUN_STALLED_AFTER_FLOWS]: 4,
  // ── Convergence round control ─────────────────────────────────────────────────
  [XIIGEN_FREEDOM_KEYS.CONVERGENCE_MIN_ROUNDS]: 10,
  [XIIGEN_FREEDOM_KEYS.CONVERGENCE_MAX_ROUNDS]: 20,
  [XIIGEN_FREEDOM_KEYS.CONVERGENCE_QUALITY_THRESHOLD]: 9.5,
  [XIIGEN_FREEDOM_KEYS.CONVERGENCE_STAGNATION_DRIFT]: 0.1,
  [XIIGEN_FREEDOM_KEYS.CONVERGENCE_MODEL_B_ENRICHED]: false,
  [XIIGEN_FREEDOM_KEYS.CONVERGENCE_DYNAMIC_ARBITERS]: false,
  [XIIGEN_FREEDOM_KEYS.RAG_EVALUATION_ENABLED]: false,
  [XIIGEN_FREEDOM_KEYS.GRAPHRAG_SYNC_MODE]: 'disabled',
  [XIIGEN_FREEDOM_KEYS.GRAPHRAG_BATCH_SIZE]: 10,
  [XIIGEN_FREEDOM_KEYS.GRAPHRAG_MIN_QUALITY_THRESHOLD]: 0.85,
  [XIIGEN_FREEDOM_KEYS.GRAPHRAG_ENDPOINT]: 'http://localhost:8080',
  [XIIGEN_FREEDOM_KEYS.RAG_QUERY_REFORMULATION_ENABLED]: false,
  // ── FLOW-01: User Registration & Onboarding ───────────────────────────────────
  [XIIGEN_FREEDOM_KEYS.FLOW01_RESEND_RATE_LIMIT_MINUTES]: 60,
  [XIIGEN_FREEDOM_KEYS.FLOW01_INVITATION_INVITER_NAME]: 'The XIIGen Team',
  [XIIGEN_FREEDOM_KEYS.FLOW01_INVITATION_COMMUNITY_NAME]: 'XIIGen Community',
  // GAP-09 defaults (A78 Tier 2) — 4 new FLOW-01 keys:
  [XIIGEN_FREEDOM_KEYS.FLOW01_EMAIL_VERIFICATION_TTL_SECONDS]: 86400, // 24h
  [XIIGEN_FREEDOM_KEYS.FLOW01_CAPTCHA_TRIGGER_THRESHOLD]: 5,
  [XIIGEN_FREEDOM_KEYS.FLOW01_REGISTRATION_RATE_LIMIT_PER_TENANT_HOUR]: 1000,
  [XIIGEN_FREEDOM_KEYS.FLOW01_ONBOARDING_REMINDER_DAYS]: 3,
  [XIIGEN_FREEDOM_KEYS.FLOW06_GROUP_FEED_WEIGHTS]: {
    recencyWeight: 0.6,
    popularityWeight: 0.4,
  },
  [XIIGEN_FREEDOM_KEYS.FLOW07_FEED_ITEMS_PER_CONNECTION]: 10,
  [XIIGEN_FREEDOM_KEYS.FLOW07_FEED_SCORING_WEIGHTS]: {
    recencyWeight: 0.5,
    relationshipStrengthWeight: 0.3,
    activityTypeWeight: 0.2,
  },
  [XIIGEN_FREEDOM_KEYS.FLOW07_DELIVERY_SCORE_THRESHOLD]: 0.1,
  [XIIGEN_FREEDOM_KEYS.FLOW07_MAX_FEED_INSERTS_PER_CONNECTION]: 25,
  [XIIGEN_FREEDOM_KEYS.FLOW07_NOTIFICATION_CHANNELS]: ['push'],
  [XIIGEN_FREEDOM_KEYS.FLOW10_MODERATION_PASS_THRESHOLD]: 0.85,
  [XIIGEN_FREEDOM_KEYS.FLOW10_MODERATION_REJECT_THRESHOLD]: 0.3,
  [XIIGEN_FREEDOM_KEYS.FLOW10_REPUTATION_RECENCY_WEIGHTS]: [1.0, 0.9, 0.8, 0.7, 0.6],
  [XIIGEN_FREEDOM_KEYS.FLOW11_SCHEMA_APPROVAL_WINDOW_MS]: 72 * 60 * 60 * 1000,
  [XIIGEN_FREEDOM_KEYS.FLOW11_SCHEMA_DEFAULT_APPROVAL_DECISION]: 'DEFER',
  [XIIGEN_FREEDOM_KEYS.FLOW11_SCHEMA_DEPRECATION_TTL_MS]: 30 * 24 * 60 * 60 * 1000,
  [XIIGEN_FREEDOM_KEYS.FLOW11_SCHEMA_VISUALIZATION_CACHE_TTL_MS]: 5 * 60 * 1000,
  // FORK-FLOW-ENGINE-PLAN-v1.1 defaults — ONLY vault_address has a default
  // (platform Vault for tenants not running their own). Other three are profile-1
  // per-tenant keys with NO defaults — onboarding must set them explicitly.
  [XIIGEN_FREEDOM_KEYS.VAULT_ADDRESS]: 'http://vault:8200',
  // ── FLOW-02: Business Onboarding Intelligence ─────────────────────────────────
  [XIIGEN_FREEDOM_KEYS.FLOW02_DEBOUNCE_WINDOW_SECONDS]: 300,
  [XIIGEN_FREEDOM_KEYS.FLOW02_MATCH_TIMEOUT_SECONDS]: 30,
  [XIIGEN_FREEDOM_KEYS.FLOW02_MATCH_WEIGHT_INDUSTRY]: 0.4,
  [XIIGEN_FREEDOM_KEYS.FLOW02_MATCH_WEIGHT_STAGE]: 0.3,
  [XIIGEN_FREEDOM_KEYS.FLOW02_MATCH_WEIGHT_LOCATION]: 0.2,
  [XIIGEN_FREEDOM_KEYS.FLOW02_MATCH_WEIGHT_TEAM]: 0.1,
};

/**
 * FC-31: Use this placeholder in contract modelHint fields instead of hardcoded names.
 * The AI provider reads FREEDOM config to determine the actual model.
 * CF-31-GUARD: contracts must not contain literal model names.
 */
export const MODEL_HINT_FROM_FREEDOM = 'FREEDOM_MODEL_HINT';

/**
 * Create a FREEDOM config document.
 * Returns a dict (DNA-1: no typed models).
 */
export function makeConfigDoc(params: {
  configKey: string;
  taskType: string;
  value: unknown;
  valueType?: string;
  description?: string;
  editableBy?: string;
  tenantId?: string;
}): Record<string, unknown> {
  return {
    config_key: params.configKey,
    task_type: params.taskType,
    value: params.value,
    value_type: params.valueType ?? 'string',
    description: params.description ?? '',
    editable_by: params.editableBy ?? 'admin',
    tenant_id: params.tenantId ?? '',
  };
}

/**
 * Produce the 4 FREEDOM config documents to seed for XIIGen engine.
 * Written to 'freedom_configs' (FREEDOM_INDEX in config-manager.ts).
 * Idempotent — skip if key already exists before calling storeDocument.
 */
export function makeXiigenFreedomConfigDocs(): Record<string, unknown>[] {
  return Object.entries(XIIGEN_FREEDOM_DEFAULTS).map(([key, value]) =>
    makeConfigDoc({
      configKey: key,
      taskType: 'xiigen-engine',
      value,
      valueType: typeof value === 'number' ? 'float' : 'string',
      description: `XIIGen engine FREEDOM config: ${key}`,
      editableBy: 'admin',
    }),
  );
}

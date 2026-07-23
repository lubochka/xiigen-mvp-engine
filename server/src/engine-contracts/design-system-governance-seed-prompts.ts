/**
 * FLOW-31 Genesis Seed Prompts — Design Intelligence Engine.
 * T489–T515 — 27 prompts, all FLOW_SCOPED.
 */

export interface Flow31GenesisPrompt {
  taskType: string;
  promptText: string;
  connection_type: 'FLOW_SCOPED';
  flow_id: 'FLOW-31';
  version: string;
}

const BASE = {
  connection_type: 'FLOW_SCOPED' as const,
  flow_id: 'FLOW-31' as const,
  version: '1.0.0',
};

export const DESIGN_SYSTEM_GOVERNANCE_SEED_PROMPTS: Flow31GenesisPrompt[] = [
  {
    ...BASE,
    taskType: 'T489',
    promptText:
      'Generate a NestJS DesignSpecIngester service (T489) that ingests and normalizes raw design spec documents (Figma exports, JSON/YAML) into canonical DesignSpecDocuments. Must be insert-only, idempotent by specId, store via IDatabaseService BEFORE emitting design.spec.ingested via IQueueService. Return DataProcessResult<DesignSpecIngestResult>. UNSCOPED_QUERY on empty tenantId.',
  },
  {
    ...BASE,
    taskType: 'T490',
    promptText:
      'Generate a NestJS ComponentMapParser service (T490) that parses component hierarchy maps from ingested design specs. Extract component trees, parent-child relationships, and component props. Store parsed component map via IDatabaseService BEFORE emitting design.components.parsed. Return DataProcessResult<ComponentMapResult>. All DNA patterns required.',
  },
  {
    ...BASE,
    taskType: 'T491',
    promptText:
      'Generate a NestJS DesignTokenExtractor service (T491) that extracts design tokens (colors, spacing scales, typography, shadows, border radii) from design specs. Normalize to token registry format. Store extracted tokens via IDatabaseService BEFORE emitting design.tokens.extracted. Return DataProcessResult<TokenExtractionResult> with tokenCount field.',
  },
  {
    ...BASE,
    taskType: 'T492',
    promptText:
      'Generate a NestJS DesignContextBuilder service (T492) that builds contextual metadata for design assets: usage context, design system version, team ownership, accessibility annotations. Store context document via IDatabaseService BEFORE emitting design.context.built. Return DataProcessResult<DesignContextResult>. DNA-8 outbox ordering required.',
  },
  {
    ...BASE,
    taskType: 'T493',
    promptText:
      'Generate a NestJS DesignPatternParser service (T493) that parses and catalogs reusable design patterns (layout grids, card patterns, navigation patterns, modal patterns) from design specs. Store pattern catalog entry via IDatabaseService BEFORE emitting design.patterns.parsed. Return DataProcessResult<DesignPatternResult> with patternCount field.',
  },
  {
    ...BASE,
    taskType: 'T494',
    promptText:
      'Generate a NestJS DesignConflictDetector service (T494, ARBITRATION). Query existing design pattern registry via IDatabaseService. If structural conflicts found, return DataProcessResult.failure("DESIGN_CONFLICT_DETECTED") — hard stop, no bypass. On clear: store scan result BEFORE emitting design.conflict.clear. Idempotent pattern scanning.',
  },
  {
    ...BASE,
    taskType: 'T495',
    promptText:
      'Generate a NestJS ComponentCompatibilityChecker service (T495, ARBITRATION). Check new components against existing component catalog for prop interface compatibility, slot contracts, and style contracts. On incompatibility: return DataProcessResult.failure("COMPONENT_INCOMPATIBLE"). On pass: store result BEFORE emitting design.components.compatible.',
  },
  {
    ...BASE,
    taskType: 'T496',
    promptText:
      'Generate a NestJS DesignRuleValidator service (T496, ARBITRATION). Read validation rules from FREEDOM config key "flow31_design_rules" (never hardcode rules). Validate spec against accessibility (WCAG), spacing scales, color contrast rules. Store result BEFORE emitting design.rules.validated or design.rules.violated. DNA-8 required.',
  },
  {
    ...BASE,
    taskType: 'T497',
    promptText:
      'Generate a NestJS TokenConflictScanner service (T497, ARBITRATION). Scan for token naming conflicts between incoming tokens and existing token library. Hard stop: DataProcessResult.failure("TOKEN_CONFLICT_DETECTED") on any conflict — no bypass. On clear: store scan result BEFORE emitting design.tokens.clear.',
  },
  {
    ...BASE,
    taskType: 'T498',
    promptText:
      'Generate a NestJS DesignDebtAnalyzer service (T498, IMPACT_ANALYSIS). Analyze accumulated design debt: inconsistencies, deprecated patterns, accessibility violations, orphaned tokens. Read debt thresholds from FREEDOM config "flow31_debt_thresholds". Store debt report BEFORE emitting design.debt.analyzed. Return debtScore (0.0–1.0).',
  },
  {
    ...BASE,
    taskType: 'T499',
    promptText:
      'Generate a NestJS DesignQualityGate service (T499, GUARD). Read thresholds from FREEDOM config "flow31_quality_thresholds". If any metric below threshold: DataProcessResult.failure("DESIGN_QUALITY_GATE_FAILED") — hard stop, no bypass. On pass: store gate result BEFORE emitting design.quality.passed. Return passed score.',
  },
  {
    ...BASE,
    taskType: 'T500',
    promptText:
      'Generate a NestJS ComponentSchemaGate service (T500, GUARD). Validate all new components conform to component schema (required props, slot definitions, event contracts). DataProcessResult.failure("COMPONENT_SCHEMA_INVALID") hard stop on violations. On pass: store validation result BEFORE emitting design.schema.valid.',
  },
  {
    ...BASE,
    taskType: 'T501',
    promptText:
      'Generate a NestJS TokenConsistencyGate service (T501, GUARD). Verify all token references in components point to valid tokens in the token library. DataProcessResult.failure("TOKEN_REFERENCE_BROKEN") hard stop on broken references. On pass: store consistency check BEFORE emitting design.tokens.consistent.',
  },
  {
    ...BASE,
    taskType: 'T502',
    promptText:
      'Generate a NestJS DesignComplexityAnalyzer service (T502, EVALUATION). Score design complexity from component tree depth, prop count, token usage breadth, pattern reuse ratio. Produce complexityScore 0.0–1.0. Store score document BEFORE emitting design.complexity.scored. Return DataProcessResult<DesignComplexityResult>.',
  },
  {
    ...BASE,
    taskType: 'T503',
    promptText:
      'Generate a NestJS ArchitectureScorer service (T503, EVALUATION). Score overall design system architecture quality: consistency, reusability, accessibility compliance, pattern adherence. Classify STRONG/ADEQUATE/WEAK (≥0.8/≥0.5/<0.5). Store score BEFORE emitting design.architecture.scored. Return architectureScore and classification.',
  },
  {
    ...BASE,
    taskType: 'T504',
    promptText:
      'Generate a NestJS DesignDecisionLogger service (T504, GOVERNANCE). INSERT-ONLY: log design decisions with rationale, trade-offs, rejected alternatives, stakeholder approvals. Never update or delete decisions. Store decision BEFORE emitting design.decision.logged. Return DataProcessResult<DesignDecisionResult> with decisionId.',
  },
  {
    ...BASE,
    taskType: 'T505',
    promptText:
      'Generate a NestJS TokenLibraryUpdater service (T505, BUILD). Idempotent by (tenantId, specId): if already updated, return existing without re-storing. Merge new tokens into shared token library registry. Store updated library BEFORE emitting design.tokens.library.updated. Return tokenCount in result.',
  },
  {
    ...BASE,
    taskType: 'T506',
    promptText:
      'Generate a NestJS ComponentCatalogUpdater service (T506, BUILD). Idempotent by (tenantId, specId): if already updated, return existing without re-storing. Merge new components into shared component catalog. Store updated catalog BEFORE emitting design.catalog.updated. Return componentCount in result.',
  },
  {
    ...BASE,
    taskType: 'T507',
    promptText:
      'Generate a NestJS DesignVersionTracker service (T507, GOVERNANCE). INSERT-ONLY version history for design system evolution. Records version string, changeset summary, author, and ISO timestamp. Never update or delete entries. Store version entry BEFORE emitting design.version.tracked. Return entryId and version.',
  },
  {
    ...BASE,
    taskType: 'T508',
    promptText:
      'Generate a NestJS DesignChangeEmitter service (T508, BUILD). Emit structured CloudEvents (DNA-9) for design changes: token updates, component changes, pattern changes. Store change event record BEFORE emitting design.change.emitted. CloudEvents envelope required on all events. Return changeId in result.',
  },
  {
    ...BASE,
    taskType: 'T509',
    promptText:
      'Generate a NestJS DesignHealthScorer service (T509, EVALUATION). Score design system health from: errorRate, tokenAdoptionRate, componentReuseRate, accessibilityComplianceRate. Classify HEALTHY (≥0.8) / DEGRADED (≥0.5) / UNHEALTHY (<0.5). Store score BEFORE emitting design.health.scored. Validate metric ranges 0–1.',
  },
  {
    ...BASE,
    taskType: 'T510',
    promptText:
      'Generate a NestJS DesignFeedbackLearner service (T510, LEARNING). SCORE-0 ASYNC-ONLY: must never run on live request path. Learn from design deployment outcomes to update pattern confidence scores. Store SCORE-0 flagged learning signal BEFORE emitting design.feedback.learned. Return signalId and queued:true.',
  },
  {
    ...BASE,
    taskType: 'T511',
    promptText:
      'Generate a NestJS CrossDesignImpactAnalyzer service (T511, IMPACT_ANALYSIS). Query existing design registry via IDatabaseService.searchDocuments to find affected components. Score impact 0.0–1.0, classify NONE/LOW/MEDIUM/HIGH/CRITICAL. Store impact report BEFORE emitting design.impact.analyzed. Return affectedComponents list.',
  },
  {
    ...BASE,
    taskType: 'T512',
    promptText:
      'Generate a NestJS DesignEvolutionTracker service (T512, GOVERNANCE). INSERT-ONLY track design system evolution across major versions. Records architectural shifts, technology migrations, paradigm changes with ISO timestamp. Never update or delete. Store evolution entry BEFORE emitting design.evolution.tracked. Return entryId.',
  },
  {
    ...BASE,
    taskType: 'T513',
    promptText:
      'Generate a NestJS DesignPublishOrchestrator service (T513, ORCHESTRATION). Idempotent by (tenantId, specId): searchDocuments first, return existing if already published. Orchestrate token library + component catalog + pattern library publication. Store publish run BEFORE emitting design.published. Return status PUBLISHED.',
  },
  {
    ...BASE,
    taskType: 'T514',
    promptText:
      'Generate a NestJS DesignDeploymentGate service (T514, GUARD). Validate all required phases complete: ["ingested","analyzed","quality_passed","schema_valid","tokens_consistent","published"]. DataProcessResult.failure("DESIGN_DEPLOYMENT_BLOCKED") hard stop on missing phases. On pass: store gate result BEFORE emitting design.deployment.approved.',
  },
  {
    ...BASE,
    taskType: 'T515',
    promptText:
      'Generate a NestJS MetaDesignOrchestrator service (T515, ORCHESTRATION). Top-level orchestrator for full Design Intelligence Engine lifecycle. Idempotent by (tenantId, specId): searchDocuments first, return existing if already initiated. Store run doc with status INITIATED BEFORE emitting metadesign.orchestration.initiated. Return runId and status.',
  },
];

/**
 * SemanticImpactAnalyzer — T378 IMPACT_ANALYSIS service for FLOW-25.
 *
 * AI-advisory semantic analysis: runs AFTER T377 (StaticConflictDetector) completes.
 * Uses IAiProvider via AI_ENGINE FABRIC — NEVER imports AI SDK directly.
 * AI result is advisory only — static CRITICAL from T377 always takes precedence.
 *
 * Iron rules (enforced — not configurable):
 *   IR-378-1:  Runs AFTER T377 (static) completes — ordering enforced by caller
 *   IR-378-2:  AI result is advisory — static CRITICAL always wins
 *   CF-481:    AI HIGH/CRITICAL without evidence_links MUST be downgraded to LOW
 *   Rule 1:    NEVER import AI SDK — only IAiProvider via AI_ENGINE FABRIC
 *   DNA-3:     All methods return DataProcessResult<T> — never throw
 */

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { IAiProvider } from '../../../fabrics/interfaces/ai-provider.interface';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { DependencyNode, DependencySeverity } from './dependency-index-query.service';
import { StaticConflictReport } from './static-conflict-detector.service';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';

// ── Shapes ────────────────────────────────────────────────────────────────

export interface EvidenceLink {
  readonly docId: string;
  readonly indexName: string;
  readonly relevanceScore: number;
  readonly excerpt: string;
}

export interface SemanticNodeResult {
  readonly nodeId: string;
  readonly entityId: string;
  /** Raw AI-scored severity (before CF-481 downgrade). */
  readonly rawSeverity: DependencySeverity;
  /** Final severity after CF-481 downgrade (HIGH/CRITICAL without evidence → LOW). */
  readonly severity: DependencySeverity;
  readonly confidenceScore: number; // 0.0–1.0
  readonly evidenceLinks: EvidenceLink[];
  /** True when CF-481 downgrade was applied. */
  readonly wasDowngraded: boolean;
  readonly reasoning: string;
  /** Advisory flag — always true for T378 results (IR-378-2). */
  readonly isAdvisory: true;
}

export interface SemanticAnalysisResult {
  readonly changeType: string;
  readonly entityId: string;
  readonly nodeResults: SemanticNodeResult[];
  /** Advisory max severity (before static override). */
  readonly advisoryMaxSeverity: DependencySeverity;
  readonly totalAnalyzed: number;
  readonly downgradedCount: number;
  /** Always 'advisory' — marks this result as T378 output (IR-378-2). */
  readonly resultType: 'advisory';
}

// ── Constants ─────────────────────────────────────────────────────────────

const SEMANTIC_RESULTS_INDEX = 'bfa-semantic-results';

/** Severities that require evidence_links under CF-481. */
const HIGH_CRITICAL_SEVERITIES = new Set<DependencySeverity>([
  DependencySeverity.HIGH,
  DependencySeverity.CRITICAL,
]);

// ── AI prompt builder ─────────────────────────────────────────────────────

function buildSemanticPrompt(changeType: string, entityId: string, node: DependencyNode): string {
  return [
    `You are a BFA impact analysis engine. Assess the semantic impact of the following change.`,
    ``,
    `Change type: ${changeType}`,
    `Changed entity: ${entityId}`,
    `Affected node: ${node.entityId} (${node.entityClass}, access: ${node.accessType})`,
    `Node depends on: ${node.dependsOn}`,
    ``,
    `Respond with a JSON object only (no markdown, no explanation):`,
    `{`,
    `  "severity": "NONE|LOW|MEDIUM|HIGH|CRITICAL",`,
    `  "confidence": 0.0-1.0,`,
    `  "evidence_doc_ids": ["<doc-id>", ...],`,
    `  "reasoning": "<brief explanation>"`,
    `}`,
  ].join('\n');
}

// ── Service ───────────────────────────────────────────────────────────────

@Injectable()
export class SemanticImpactAnalyzer extends MicroserviceBase {
  constructor(
    private readonly ai: IAiProvider, // AI_ENGINE FABRIC — never SDK directly (Rule 1)
    private readonly dbService: IDatabaseService, // DATABASE FABRIC
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T378',
        serviceName: 'SemanticImpactAnalyzer',
        flowId: 'FLOW-25',
      }),
    });
  }

  /**
   * Run AI advisory semantic analysis for each dependency node.
   *
   * IR-378-1: Must be called AFTER T377 StaticConflictDetector completes.
   * IR-378-2: Result is always advisory — static CRITICAL from T377 wins.
   * CF-481: AI HIGH/CRITICAL without evidence_links is downgraded to LOW.
   */
  async analyzeImpact(
    changeType: string,
    entityId: string,
    nodes: DependencyNode[],
    staticReport: StaticConflictReport,
  ): Promise<DataProcessResult<SemanticAnalysisResult>> {
    if (!changeType || changeType.trim() === '') {
      return DataProcessResult.failure(
        'MISSING_CHANGE_TYPE',
        'changeType is required for semantic analysis',
      );
    }

    if (!entityId || entityId.trim() === '') {
      return DataProcessResult.failure(
        'MISSING_ENTITY_ID',
        'entityId is required for semantic analysis',
      );
    }

    // IR-378-1: static report must be provided (confirms T377 ran first)
    if (!staticReport) {
      return DataProcessResult.failure(
        'STATIC_REPORT_REQUIRED',
        'IR-378-1: SemanticImpactAnalyzer requires StaticConflictReport from T377. T377 must complete first.',
      );
    }

    const nodeResults: SemanticNodeResult[] = [];
    let downgradedCount = 0;

    for (const node of nodes) {
      const nodeResult = await this.analyzeNode(changeType, entityId, node);
      if (!nodeResult.isSuccess) {
        // Non-fatal: log the failure as LOW advisory and continue (DNA-3 — never throw)
        nodeResults.push(
          this.makeFailedNodeResult(node, nodeResult.errorMessage ?? 'AI analysis failed'),
        );
        continue;
      }
      if (nodeResult.data!.wasDowngraded) downgradedCount++;
      nodeResults.push(nodeResult.data!);
    }

    const advisoryMaxSeverity = this.computeMaxSeverity(nodeResults.map((r) => r.severity));

    // Persist advisory results (advisory marker on stored doc — IR-378-2)
    const stored = await this.dbService.storeDocument(SEMANTIC_RESULTS_INDEX, {
      change_type: changeType,
      entity_id: entityId,
      node_results: nodeResults,
      advisory_max_severity: advisoryMaxSeverity,
      total_analyzed: nodes.length,
      downgraded_count: downgradedCount,
      result_type: 'advisory', // IR-378-2 marker
    });

    if (!stored.isSuccess) {
      return DataProcessResult.failure(
        stored.errorCode ?? 'STORAGE_FAILED',
        stored.errorMessage ?? 'Failed to store semantic analysis results',
      );
    }

    return DataProcessResult.success({
      changeType,
      entityId,
      nodeResults,
      advisoryMaxSeverity,
      totalAnalyzed: nodes.length,
      downgradedCount,
      resultType: 'advisory' as const,
    });
  }

  /**
   * Validate that a semantic result has evidence_links for any HIGH/CRITICAL nodes.
   * Returns the result with CF-481 downgrades applied.
   * Exported for use in T379 SeverityAggregator.
   */
  applyCf481Downgrade(result: SemanticNodeResult): SemanticNodeResult {
    if (HIGH_CRITICAL_SEVERITIES.has(result.rawSeverity) && result.evidenceLinks.length === 0) {
      // CF-481: AI HIGH/CRITICAL without evidence_links → downgrade to LOW
      return {
        ...result,
        severity: DependencySeverity.LOW,
        wasDowngraded: true,
      };
    }
    return result;
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  private async analyzeNode(
    changeType: string,
    entityId: string,
    node: DependencyNode,
  ): Promise<DataProcessResult<SemanticNodeResult>> {
    const prompt = buildSemanticPrompt(changeType, entityId, node);

    // Rule 1: NEVER import AI SDK — use IAiProvider.generate() via AI_ENGINE FABRIC
    const aiResult = await this.ai.generate(prompt, { maxTokens: 512 });
    if (!aiResult.isSuccess) {
      return DataProcessResult.failure(
        aiResult.errorCode ?? 'AI_FAILED',
        aiResult.errorMessage ?? 'AI generation failed',
      );
    }

    // IAiProvider.generate() returns Record<string,unknown> with { text, model, tokens_used, cost }
    const responseText = ((aiResult.data as Record<string, unknown>)['text'] as string) ?? '';

    // Parse AI JSON response
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      return DataProcessResult.failure('AI_PARSE_FAILED', 'Failed to parse AI JSON response');
    }

    const rawSeverity = (parsed['severity'] as DependencySeverity) ?? DependencySeverity.NONE;
    const confidenceScore = (parsed['confidence'] as number) ?? 0.0;
    const evidenceDocIds: string[] = (parsed['evidence_doc_ids'] as string[]) ?? [];
    const reasoning: string = (parsed['reasoning'] as string) ?? '';

    // Resolve evidence links against real ES docs
    const evidenceLinks = await this.resolveEvidenceLinks(evidenceDocIds);

    const rawResult: SemanticNodeResult = {
      nodeId: node.nodeId,
      entityId: node.entityId,
      rawSeverity,
      severity: rawSeverity, // will be updated by CF-481 below
      confidenceScore,
      evidenceLinks,
      wasDowngraded: false,
      reasoning,
      isAdvisory: true,
    };

    // CF-481: downgrade HIGH/CRITICAL without evidence_links
    const finalResult = this.applyCf481Downgrade(rawResult);

    return DataProcessResult.success(finalResult);
  }

  private async resolveEvidenceLinks(docIds: string[]): Promise<EvidenceLink[]> {
    if (docIds.length === 0) return [];

    const links: EvidenceLink[] = [];
    for (const docId of docIds) {
      // Check evidence doc exists in ES (IR-382-3 pattern — validate before referencing)
      const found = await this.dbService.searchDocuments('bfa-evidence', { _id: docId });
      if (found.isSuccess && found.data!.length > 0) {
        const doc = found.data![0];
        links.push({
          docId,
          indexName: (doc['_index'] as string) ?? 'bfa-evidence',
          relevanceScore: (doc['relevance_score'] as number) ?? 1.0,
          excerpt: (doc['excerpt'] as string) ?? '',
        });
      }
    }
    return links;
  }

  private makeFailedNodeResult(node: DependencyNode, reason: string): SemanticNodeResult {
    return {
      nodeId: node.nodeId,
      entityId: node.entityId,
      rawSeverity: DependencySeverity.NONE,
      severity: DependencySeverity.NONE,
      confidenceScore: 0.0,
      evidenceLinks: [],
      wasDowngraded: false,
      reasoning: `Analysis failed: ${reason}`,
      isAdvisory: true,
    };
  }

  private computeMaxSeverity(severities: DependencySeverity[]): DependencySeverity {
    const ORDER: Record<DependencySeverity, number> = {
      [DependencySeverity.NONE]: 0,
      [DependencySeverity.LOW]: 1,
      [DependencySeverity.MEDIUM]: 2,
      [DependencySeverity.HIGH]: 3,
      [DependencySeverity.CRITICAL]: 4,
    };
    return severities.reduce<DependencySeverity>(
      (max, s) => (ORDER[s] > ORDER[max] ? s : max),
      DependencySeverity.NONE,
    );
  }
}

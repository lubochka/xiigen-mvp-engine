/**
 * DpoTrainingDataService — stores DPO triples for fine-tuning.
 *
 * All 5 domain-context fields included from day one to prevent backfill:
 * domain, entityType, conflictType, ftId, productScope.
 * These default to null on write; labeled when DPO training conflicts exist.
 *
 * G-1 (P18): added 5 OSS teaching fields — curriculumTier, targetModelFamily,
 * instructionFormat, distillationReadiness, shadowRunId.
 */
import { Injectable, Inject } from '@nestjs/common';
import { IDatabaseService, DATABASE_SERVICE } from '../fabrics/interfaces/database.interface';
import { DataProcessResult } from '../kernel/data-process-result';
import { KnowledgeScope } from './scope/knowledge-policy.service';
import { randomUUID } from 'crypto';

export interface DpoTriple {
  tripleId: string;
  runId: string;
  flowId: string;
  taskTypeId: string;
  tenantId: string;
  prompt: { system: string | null; user: string };
  chosen: string;
  rejected: string;
  score: number;
  ragPatterns?: Record<string, unknown>[];
  planSteps?: string;
  runtimeContext?: { projectId: string | null; fabricProviders: Record<string, string> };
  modelComparison: {
    chosen: { model: string; score: number };
    rejected: { model: string; score: number } | null;
    discarded: { model: string; score: number } | null;
    judgeModel: string;
    shuffleWasApplied: boolean;
  } | null;
  tripleStatus: 'ACCEPTED' | 'UNDECIDED' | 'SINGLE_PROVIDER' | 'SAME_MODEL' | 'SHUFFLE_MISSING';
  // P18 OSS teaching fields — ALL required, never null except shadowRunId
  curriculumTier: 1 | 2 | 3 | 4 | 5;
  targetModelFamily: string;
  instructionFormat: string;
  distillationReadiness: 'READY' | 'TOO_COMPLEX' | 'PENDING_SIMPLIFICATION';
  shadowRunId: string | null;
  // Domain context — null on write
  domain: string | null;
  entityType: string | null;
  conflictType: string | null;
  ftId: string | null;
  productScope: string | null;
  /**
   * Extended DPO fields — optional for backward compatibility.
   *
   * domainContext enables routing DPO triples to domain-specific fine-tuning.
   * conflictsWith enables negative transfer learning — learning what NOT to do.
   *
   * @example
   * buildDpoTriple({
   *   tripleName: 'REVERSE_ETL_QUEUE_ONLY',
   *   taskTypeId: 'T199',
   *   flowId: 'FLOW-14',
   *   domainContext: 'ETL_PIPELINE',
   *   conflictsWith: ['direct_http_reverse_etl', 'dim_update_without_versioning', 'mart_write_before_pii_gate'],
   *   prompt: '...',
   *   chosen: { description: '...', code: '...' },
   *   rejected: { description: '...', code: '...' },
   * })
   */
  /** ETL domain context string (e.g., 'ETL_PIPELINE', 'AUTH_FLOW', 'BILLING'). */
  domainContext?: string;
  /** Patterns this chosen response deliberately avoids — for negative transfer learning. */
  conflictsWith?: string[];
  /** Quality classification for this training triple. Set by V9-002 gate after generation.
   *  INVALID_MISSING_DEPENDENCY: SS-02 RequiredProviderValidator — generated code references
   *  fabric providers not yet registered in xiigen-fabric-registry. countsTowardThreshold=false. */
  trainingDataQuality?:
    | 'CROSS_MODEL_VALID'
    | 'MONO_MODEL_CALIBRATION'
    | 'INVALID'
    | 'INVALID_MISSING_DEPENDENCY';
  /** Whether this triple counts toward the 80-triple graduation threshold. */
  countsTowardThreshold?: boolean;
  /** Scope: PRIVATE = owner tenant only; MODULE/GLOBAL = any tenant. Default PRIVATE. */
  knowledgeScope?: KnowledgeScope;
  createdAt: string;
}

export type DpoTripleInput = Omit<DpoTriple, 'tripleId' | 'createdAt'>;

@Injectable()
export class DpoTrainingDataService {
  constructor(@Inject(DATABASE_SERVICE) private readonly db: IDatabaseService) {}

  async storeTriple(input: DpoTripleInput): Promise<DataProcessResult<DpoTriple>> {
    const record: DpoTriple = {
      ...input,
      tripleId: randomUUID(),
      domain: input.domain ?? null,
      entityType: input.entityType ?? null,
      conflictType: input.conflictType ?? null,
      ftId: input.ftId ?? null,
      productScope: input.productScope ?? null,
      createdAt: new Date().toISOString(),
    };
    await this.db.storeDocument(
      'xiigen-training-data',
      record as unknown as Record<string, unknown>,
      record.tripleId,
    );
    return DataProcessResult.success(record);
  }

  async getTriplesByFlow(
    flowId: string,
    tenantId: string,
    scopeFilter?: KnowledgeScope | KnowledgeScope[],
  ): Promise<DataProcessResult<DpoTriple[]>> {
    const result = await this.db.searchDocuments('xiigen-training-data', { flowId });
    if (!result.isSuccess || !result.data) return DataProcessResult.success([]);
    const scopes = scopeFilter
      ? Array.isArray(scopeFilter)
        ? scopeFilter
        : [scopeFilter]
      : (['PRIVATE'] as KnowledgeScope[]);
    const filtered = (result.data as unknown as DpoTriple[]).filter((t) => {
      const scope: KnowledgeScope = t.knowledgeScope ?? 'PRIVATE';
      if (!scopes.includes(scope)) return false;
      if (scope === 'PRIVATE') return t.tenantId === tenantId;
      return true;
    });
    return DataProcessResult.success(filtered);
  }

  async getTripleCount(
    flowId: string,
    tenantId: string,
    scopeFilter?: KnowledgeScope | KnowledgeScope[],
  ): Promise<DataProcessResult<number>> {
    const result = await this.getTriplesByFlow(flowId, tenantId, scopeFilter);
    return DataProcessResult.success(result.isSuccess ? (result.data?.length ?? 0) : 0);
  }
}

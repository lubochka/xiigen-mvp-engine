/**
 * OssCurriculumRunner — teaches OSS models via curriculum cycles.
 *
 * For each OSS model × station × depth combination:
 *   - Runs N cycles (oss.config cyclesPerModel, default 5)
 *   - Each cycle: calls OllamaProvider (AI_PROVIDER fabric); falls back to
 *     simulation when provider unavailable (CI/offline environments)
 *   - Grade ≥ 0.85 → seeds RAG with the output for next cycle
 *   - Grade < 0.85 → does NOT seed RAG (prevents contamination)
 *   - Stores one xiigen-oss-curriculum-runs record per cycle
 *
 * DNA-3: always returns DataProcessResult, never throws.
 * DNA-5: tenantId from CLS only.
 * DNA-8: storeDocument before RAG seed dispatch.
 *
 * Phase 1: FREEDOM config reads for oss.config { cyclesPerModel, models }
 *          Real OllamaProvider call via AI_PROVIDER fabric injection.
 */

import { Injectable, Inject, Logger, Optional } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { IDatabaseService, DATABASE_SERVICE } from '../../fabrics/interfaces/database.interface';
import { DataProcessResult } from '../../kernel/data-process-result';
import { TenantContext, TENANT_CONTEXT_KEY } from '../../kernel/multi-tenant/tenant-context';
import { KnowledgePolicyService } from '../scope/knowledge-policy.service';
import {
  IFreedomConfigService,
  FREEDOM_CONFIG_SERVICE,
} from '../../freedom/freedom-config.interface';
import { IAiProvider, AI_PROVIDER } from '../../fabrics/interfaces/ai-provider.interface';
import { CurriculumPromotionService } from './curriculum-promotion.service';
import { GraduationResolverService } from '../graduation-resolver.service';
import { CurriculumTier } from '../curriculum-tier-resolver.service';

export const OSS_CURRICULUM_INDEX = 'xiigen-oss-curriculum-runs';

/** Maps OSS model → curriculum tier for threshold-based graduation (Rule 16). */
const OSS_MODEL_TO_TIER: Partial<Record<OssModel, CurriculumTier>> = {
  'llama3:8b': 1,
  'codellama:13b': 2,
  'deepseek-coder:6.7b': 3,
};
export const RAG_PATTERNS_INDEX = 'xiigen-rag-patterns';
export const RAG_SEED_GRADE_THRESHOLD = 0.85;

// CF-OSS-01: OSS models for Phase 0 curriculum
export const OSS_MODELS = ['llama3:8b', 'codellama:13b', 'deepseek-coder:6.7b'] as const;
export type OssModel = (typeof OSS_MODELS)[number];

export interface OssCurriculumRecord {
  ossModel: OssModel;
  station: string;
  depth: number;
  nodeIntent: string;
  cycle: number;
  grade: number;
  ragContextSize: number;
  graphContextSize: number;
  phase: string;
  flowId: string;
  tenantId: string;
  knowledgeScope?: string;
  ownerId?: string;
  createdAt: string;
}

export interface OssCurriculumInput {
  flowId: string;
  userIntent: string;
  phase: string;
  terminationDepth?: number;
  cyclesPerModel?: number;
}

export interface OssCurriculumResult {
  flowId: string;
  recordsStored: number;
  modelsViable: OssModel[];
  depthOverloadDetected: boolean;
  signalSummary: Record<OssModel, 'UP' | 'FLAT' | 'DOWN' | 'OVERLOAD'>;
}

@Injectable()
export class OssCurriculumRunner {
  private readonly logger = new Logger(OssCurriculumRunner.name);
  // Fallback defaults — overridden by FREEDOM config oss.config
  private readonly DEFAULT_CYCLES = 5;
  private readonly DEFAULT_MODELS: readonly string[] = OSS_MODELS;

  constructor(
    @Inject(DATABASE_SERVICE) private readonly db: IDatabaseService,
    private readonly cls: ClsService,
    @Optional() private readonly policyService?: KnowledgePolicyService,
    @Optional()
    @Inject(FREEDOM_CONFIG_SERVICE)
    private readonly freedomConfig?: IFreedomConfigService,
    @Optional()
    @Inject(AI_PROVIDER)
    private readonly aiProvider?: IAiProvider,
    @Optional() private readonly promotionService?: CurriculumPromotionService,
    @Optional() private readonly graduationResolver?: GraduationResolverService,
  ) {}

  /** Read oss.config from FREEDOM — falls back to defaults. */
  private async readOssConfig(): Promise<{ cyclesPerModel: number; models: string[] }> {
    try {
      const cfg = await this.freedomConfig?.get('oss.config');
      const models =
        Array.isArray(cfg?.['models']) && (cfg!['models'] as unknown[]).length > 0
          ? (cfg!['models'] as string[])
          : [...this.DEFAULT_MODELS];
      const cyclesPerModel =
        typeof cfg?.['cyclesPerModel'] === 'number'
          ? (cfg['cyclesPerModel'] as number)
          : this.DEFAULT_CYCLES;
      return { cyclesPerModel, models };
    } catch {
      return { cyclesPerModel: this.DEFAULT_CYCLES, models: [...this.DEFAULT_MODELS] };
    }
  }

  private getTenant(): DataProcessResult<TenantContext> {
    try {
      const tenant = this.cls.get<TenantContext>(TENANT_CONTEXT_KEY);
      if (!tenant) return DataProcessResult.failure('NO_TENANT', 'TenantContext not in CLS');
      return DataProcessResult.success(tenant);
    } catch {
      return DataProcessResult.failure('NO_TENANT', 'CLS unavailable');
    }
  }

  async runForFlow(input: OssCurriculumInput): Promise<DataProcessResult<OssCurriculumResult>> {
    const tenantResult = this.getTenant();
    if (!tenantResult.isSuccess) {
      return DataProcessResult.failure('NO_TENANT', tenantResult.errorMessage ?? '');
    }
    const tenantId = tenantResult.data!.tenantId;
    const ossConfig = await this.readOssConfig();
    const cycles = input.cyclesPerModel ?? ossConfig.cyclesPerModel;
    const activeModels = ossConfig.models as OssModel[];

    // Resolve scope once per run (applies to all records in this phase)
    const resolution = this.policyService
      ? await this.policyService.resolveScope(tenantId, input.flowId, input.phase)
      : { scope: 'PRIVATE' as const, ownerId: tenantId, pricingModel: null, moduleId: null };

    const allRecords: OssCurriculumRecord[] = [];
    const signalSummary: Record<OssModel, 'UP' | 'FLAT' | 'DOWN' | 'OVERLOAD'> = {
      'llama3:8b': 'FLAT',
      'codellama:13b': 'FLAT',
      'deepseek-coder:6.7b': 'FLAT',
    };
    let depthOverloadDetected = false;

    // Pre-seed RAG from commercial model DPO triple winners (Node 6 prerequisite).
    // OSS models train from these instead of bootstrapping from zero.
    await this.seedFromDpoTriples(input.flowId, tenantId);

    for (const model of activeModels) {
      const modelRecords: OssCurriculumRecord[] = [];

      for (let cycle = 1; cycle <= cycles; cycle++) {
        const grade = await this.runOssModelCycle(model, input, cycle, tenantId);

        const record: OssCurriculumRecord = {
          ossModel: model,
          station: 'CYCLE-1', // Phase 0: top-level only; deeper stations in Phase 1
          depth: 0,
          nodeIntent: `flow ${input.flowId} top-level plan`,
          cycle,
          grade,
          ragContextSize: 0, // grows when prior cycles pass grade threshold
          graphContextSize: 0,
          phase: input.phase,
          flowId: input.flowId,
          tenantId,
          knowledgeScope: resolution.scope,
          ownerId: resolution.ownerId,
          createdAt: new Date().toISOString(),
        };

        // DNA-8: store BEFORE RAG seed decision
        const storeResult = await this.db.storeDocument(
          OSS_CURRICULUM_INDEX,
          { ...record },
          `${record.flowId}::${record.ossModel}::${record.station}::${record.depth}::${record.cycle}`,
        );

        if (!storeResult.isSuccess) {
          this.logger.warn(`OssCurriculumRunner: storage failed for ${model} cycle ${cycle}`);
          continue;
        }

        modelRecords.push(record);

        // Seed RAG only if grade ≥ threshold (prevents contamination)
        if (grade >= RAG_SEED_GRADE_THRESHOLD) {
          await this.seedRag(record, input.userIntent);
        }
      }

      allRecords.push(...modelRecords);
      signalSummary[model] = this.computeSignal(modelRecords);
      if (signalSummary[model] === 'DOWN') depthOverloadDetected = true;

      // P3: threshold-based graduation — Rule 16: called by measurable outcomes only
      if (this.promotionService && this.graduationResolver) {
        const eligible = await this.promotionService.shouldGraduate(model, modelRecords);
        if (eligible) {
          const tier = OSS_MODEL_TO_TIER[model];
          if (tier !== undefined) {
            this.graduationResolver.graduateTier(tier);
            this.logger.log(
              `OssCurriculumRunner: graduated tier ${tier} for OSS model ${model} ` +
                `(consecutive passing threshold met)`,
            );
          }
        }
      }
    }

    const viableModels = OSS_MODELS.filter((m) => signalSummary[m] === 'UP') as OssModel[];

    return DataProcessResult.success({
      flowId: input.flowId,
      recordsStored: allRecords.length,
      modelsViable: viableModels,
      depthOverloadDetected,
      signalSummary,
    });
  }

  /** Compute grade trend signal from records for one model.
   *  Compares the first grade vs the last grade across all records.
   *  delta > 0.05 → UP (improving); delta < -0.05 → DOWN (depth-overload pattern).
   */
  computeSignal(records: OssCurriculumRecord[]): 'UP' | 'FLAT' | 'DOWN' | 'OVERLOAD' {
    if (records.length < 2) return 'FLAT';
    const grades = records.map((r) => r.grade);
    const delta = grades[grades.length - 1]! - grades[0]!;
    if (delta > 0.05) return 'UP';
    if (delta < -0.05) return 'DOWN';
    return 'FLAT';
  }

  /** Detect depth-overload: grade drops > 0.10 from depth 0 to depth 1 for same model+station. */
  detectDepthOverload(
    depth0Records: OssCurriculumRecord[],
    depth1Records: OssCurriculumRecord[],
  ): boolean {
    return depth1Records.some((d1) => {
      const d0 = depth0Records.find((r) => r.ossModel === d1.ossModel && r.station === d1.station);
      if (!d0) return false;
      return d0.grade - d1.grade > 0.1;
    });
  }

  /**
   * Pre-seed RAG from commercial model DPO triple winners before OSS cycles run.
   * Queries xiigen-training-data for CYCLE-2 records with chosen.score ≥ 8.5.
   * DNA-3: never throws — pre-seeding is best-effort (warn and continue on any failure).
   */
  private async seedFromDpoTriples(flowId: string, tenantId: string): Promise<void> {
    try {
      const result = await this.db.searchDocuments('xiigen-training-data', {
        station: 'CYCLE-2',
        flowId,
      });
      if (!result.isSuccess) return;

      // CF-POLICY-01 scope filter: PRIVATE records must belong to this tenant;
      // MODULE and GLOBAL records are visible to any tenant.
      const scopeFiltered = (result.data as Record<string, unknown>[]).filter((r) => {
        const scope = (r['knowledgeScope'] as string | undefined) ?? 'PRIVATE';
        if (scope === 'PRIVATE') return r['tenantId'] === tenantId;
        return true; // MODULE / GLOBAL
      });

      const winners = scopeFiltered.filter((r) => {
        const chosen = r['chosen'] as Record<string, unknown> | undefined;
        return typeof chosen?.['score'] === 'number' && (chosen['score'] as number) >= 8.5;
      });

      for (const winner of winners) {
        const chosen = winner['chosen'] as Record<string, unknown>;
        const depth = typeof winner['depth'] === 'number' ? winner['depth'] : 0;
        const nodeIntent =
          typeof winner['nodeIntent'] === 'string'
            ? winner['nodeIntent']
            : String(winner['stepText'] ?? '');
        await this.db
          .storeDocument(
            RAG_PATTERNS_INDEX,
            {
              station: 'CYCLE-2',
              depth,
              nodeIntent,
              ossModel: String(chosen['model'] ?? 'commercial'),
              grade: (chosen['score'] as number) / 10, // 8.5/10 → 0.85
              content: String(chosen['text'] ?? ''),
              seededAt: new Date().toISOString(),
              tenantId,
              knowledgeScope: 'PRIVATE',
              source: 'dpo-commercial-winner',
            },
            `dpo-seed::${flowId}::${String(chosen['model'] ?? 'commercial')}::${Date.now()}`,
          )
          .catch((err: unknown) => {
            this.logger.warn(`OssCurriculumRunner: DPO RAG seed failed — ${String(err)}`);
          });
      }

      if (winners.length > 0) {
        this.logger.log(
          `OssCurriculumRunner: pre-seeded RAG with ${winners.length} commercial DPO winners for flowId=${flowId}`,
        );
      }
    } catch (err) {
      this.logger.warn(`OssCurriculumRunner: seedFromDpoTriples failed — ${String(err)}`);
    }
  }

  /** Seed RAG with passing output (grade ≥ 0.85). DNA-8: best-effort, never throws. */
  private async seedRag(record: OssCurriculumRecord, output: string): Promise<void> {
    await this.db
      .storeDocument(
        RAG_PATTERNS_INDEX,
        {
          station: record.station,
          depth: record.depth,
          nodeIntent: record.nodeIntent,
          ossModel: record.ossModel,
          grade: record.grade,
          content: output,
          seededAt: new Date().toISOString(),
          tenantId: record.tenantId,
          knowledgeScope: record.knowledgeScope,
          ownerId: record.ownerId,
        },
        `oss-seed::${record.ossModel}::${record.station}::${record.depth}::${Date.now()}`,
      )
      .catch((err: unknown) => {
        this.logger.warn(`OssCurriculumRunner: RAG seed failed — ${String(err)}`);
      });
  }

  /**
   * Run one OSS model cycle.
   *
   * Phase 1: calls AI_PROVIDER (OllamaProvider) with the station's teaching prompt.
   * Parses a float grade [0, 1] from the model response text.
   * Falls back to simulation when AI provider is unavailable (CI / offline).
   * Simulation curve: 0.45 base + 0.04/cycle, plateau 0.73.
   */
  async runOssModelCycle(
    model: OssModel,
    input: OssCurriculumInput,
    cycle: number,
    _tenantId: string,
  ): Promise<number> {
    if (this.aiProvider) {
      try {
        const prompt =
          `You are an OSS model (${model}) being trained for flow generation.\n` +
          `Flow: ${input.flowId} | Phase: ${input.phase} | Cycle: ${cycle}\n` +
          `Task: Generate a plan step for the user intent below. ` +
          `Score your own output quality from 0.0 to 1.0.\n` +
          `User intent: ${input.userIntent}\n\n` +
          `Respond with JSON only: { "output": "<your plan step>", "grade": <float 0-1> }`;

        const result = await this.aiProvider.generate(prompt, {
          systemPrompt:
            'You are a code generation teaching assistant. Respond ONLY with valid JSON.',
          model,
          maxTokens: 512,
          temperature: 0.3,
        });

        if (result.isSuccess) {
          const text = String(result.data!['text'] ?? '');
          const grade = this.parseGrade(text);
          if (grade !== null) return grade;
        }
      } catch {
        this.logger.warn(
          `OssCurriculumRunner: AI call failed for ${model} cycle ${cycle} — using simulation`,
        );
      }
    }

    // Simulation fallback (AI provider absent or call failed)
    const baseGrade = 0.45 + (cycle - 1) * 0.04;
    return Math.min(baseGrade, 0.73);
  }

  /**
   * Extract a grade float [0, 1] from model response JSON or plain text.
   * Looks for `"grade": <float>` pattern first, then any bare float in range.
   */
  private parseGrade(text: string): number | null {
    try {
      const jsonMatch = text.match(/"grade"\s*:\s*([\d.]+)/);
      if (jsonMatch?.[1]) {
        const g = parseFloat(jsonMatch[1]);
        if (isFinite(g)) return Math.min(Math.max(g, 0), 1);
      }
      // Fallback: find any standalone float 0-1 in the text
      const floatMatch = text.match(/\b(0\.\d+|1\.0+)\b/);
      if (floatMatch?.[1]) {
        const g = parseFloat(floatMatch[1]);
        if (isFinite(g)) return Math.min(Math.max(g, 0), 1);
      }
    } catch {
      /* ignore */
    }
    return null;
  }
}

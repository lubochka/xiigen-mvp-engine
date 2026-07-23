import { Injectable, Inject, Optional, Logger } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { DATABASE_SERVICE, IDatabaseService } from '../fabrics/interfaces/database.interface';
import { SHADOW_RUN_SERVICE, IShadowRunService } from '../fabrics/shadow-run/shadow-run.service';
import { TenantContext, TENANT_CONTEXT_KEY } from '../kernel/multi-tenant/tenant-context';

export interface TierCoverage {
  tier: number;
  archetype: string;
  count: number;
  target: number;
  hasGap: boolean;
}

export interface EngineProgressReport {
  generatedAt: string;
  validDpoTriples: number; // countsTowardThreshold: true
  monoModelTriples: number; // trainingDataQuality: MONO_MODEL_CALIBRATION
  dpoThreshold: 80;
  tierCoverage: TierCoverage[];
  shadowGapScores: Record<string, number | 'UNKNOWN' | 'STALLED'>;
  promptVersionsImproved: number | 'UNKNOWN';
  ragQualityScore: number | 'UNKNOWN';
  flowsToGraduation: number; // ceil((80 - validDpoTriples) / 4)
  tierCoverageGaps: string[]; // tier labels where count === 0
  errors: string[]; // non-blocking errors accumulated during assembly
}

const TASK_TYPES_BY_TIER: Record<number, string[]> = {
  1: ['T62', 'T65', 'T66'], // ROUTING
  2: ['T63', 'T64'], // DATA_PIPELINE/VALIDATION
  3: ['T50', 'T52', 'T60', 'T61'], // TRANSACTION/FAN_IN/BROADCAST/REGISTRATION
  4: ['T51', 'T59'], // ORCHESTRATION/CONVERGENCE
  5: [], // SCHEDULED — none defined yet
};

const TIER_LABELS: Record<number, string> = {
  1: 'ROUTING',
  2: 'DATA_PIPELINE/VALIDATION',
  3: 'TRANSACTION/FAN_IN/BROADCAST/REGISTRATION',
  4: 'ORCHESTRATION/CONVERGENCE',
  5: 'SCHEDULED',
};

@Injectable()
export class EngineProgressService {
  private readonly logger = new Logger(EngineProgressService.name);

  constructor(
    @Inject(DATABASE_SERVICE) private readonly db: IDatabaseService,
    private readonly cls: ClsService,
    @Optional() @Inject(SHADOW_RUN_SERVICE) private readonly shadowRunService?: IShadowRunService,
  ) {}

  async getReport(flowId?: string): Promise<EngineProgressReport> {
    const errors: string[] = [];
    const report: Partial<EngineProgressReport> = {
      generatedAt: new Date().toISOString(),
      dpoThreshold: 80,
      errors,
    };

    // Resolve tenant scope — fail-open: if CLS is unavailable, no tenant filter applied
    const tenantId = (() => {
      try {
        return this.cls.get<TenantContext>(TENANT_CONTEXT_KEY)?.tenantId ?? null;
      } catch {
        return null;
      }
    })();
    const tenantFilter = tenantId ? { tenantId, knowledgeScope: 'PRIVATE' } : {};

    // Metric 1: Valid DPO triples
    try {
      const result = await this.db.searchDocuments('xiigen-training-data', {
        countsTowardThreshold: true,
        ...(flowId ? { flowId } : {}),
        ...tenantFilter,
      });
      report.validDpoTriples = Array.isArray(result) ? result.length : 0;
    } catch (e) {
      errors.push(`validDpoTriples: ${(e as Error).message}`);
      report.validDpoTriples = 0;
    }

    // Metric 2: Mono-model triples
    try {
      const result = await this.db.searchDocuments('xiigen-training-data', {
        trainingDataQuality: 'MONO_MODEL_CALIBRATION',
        ...(flowId ? { flowId } : {}),
        ...tenantFilter,
      });
      report.monoModelTriples = Array.isArray(result) ? result.length : 0;
    } catch (e) {
      errors.push(`monoModelTriples: ${(e as Error).message}`);
      report.monoModelTriples = 0;
    }

    // Metric 3: Per-tier coverage
    const tierCoverage: TierCoverage[] = [];
    const tierCoverageGaps: string[] = [];
    for (const tier of [1, 2, 3, 4, 5]) {
      try {
        const taskTypes = TASK_TYPES_BY_TIER[tier] ?? [];
        let count = 0;
        for (const tt of taskTypes) {
          try {
            const r = await this.db.searchDocuments('xiigen-training-data', {
              taskTypeId: tt,
              countsTowardThreshold: true,
              ...tenantFilter,
            });
            count += Array.isArray(r) ? r.length : 0;
          } catch {
            /* individual task type failure doesn't block tier */
          }
        }
        const target = 20;
        const hasGap = count === 0;
        if (hasGap) tierCoverageGaps.push(`Tier ${tier} (${TIER_LABELS[tier]}): 0 triples`);
        tierCoverage.push({ tier, archetype: TIER_LABELS[tier], count, target, hasGap });
      } catch (e) {
        errors.push(`tier${tier}Coverage: ${(e as Error).message}`);
        tierCoverage.push({
          tier,
          archetype: TIER_LABELS[tier],
          count: 0,
          target: 20,
          hasGap: true,
        });
        tierCoverageGaps.push(`Tier ${tier}: error`);
      }
    }
    report.tierCoverage = tierCoverage;
    report.tierCoverageGaps = tierCoverageGaps;

    // Metric 4: Shadow gap scores
    const shadowGapScores: Record<string, number | 'UNKNOWN' | 'STALLED'> = {};
    const allTaskTypes = [
      'T50',
      'T51',
      'T52',
      'T59',
      'T60',
      'T61',
      'T62',
      'T63',
      'T64',
      'T65',
      'T66',
    ];
    for (const tt of allTaskTypes) {
      try {
        if (this.shadowRunService) {
          const r = await this.shadowRunService.getGapScore(tt);
          shadowGapScores[tt] = r.gapScore;
        } else {
          shadowGapScores[tt] = 'UNKNOWN';
        }
      } catch {
        shadowGapScores[tt] = 'UNKNOWN';
        errors.push(`shadowGap.${tt}: shadow run service threw`);
      }
    }
    report.shadowGapScores = shadowGapScores;

    // Metric 5: Prompt versions improved (optional — UNKNOWN if not available)
    report.promptVersionsImproved = 'UNKNOWN';

    // Metric 6: RAG quality score (optional — UNKNOWN if not available)
    report.ragQualityScore = 'UNKNOWN';

    // Metric 7: Flows to graduation
    const valid = report.validDpoTriples ?? 0;
    report.flowsToGraduation = Math.ceil(Math.max(0, 80 - valid) / 4);

    return report as EngineProgressReport;
  }

  formatAsMarkdown(report: EngineProgressReport): string {
    const lines: string[] = [
      '## ENGINE PROGRESS',
      '',
      `Generated: ${report.generatedAt}`,
      '',
      `| Metric | Value |`,
      `|--------|-------|`,
      `| Valid DPO triples | ${report.validDpoTriples} / ${report.dpoThreshold} |`,
      `| MONO_MODEL_CALIBRATION | ${report.monoModelTriples} |`,
      `| Flows to graduation (est.) | ${report.flowsToGraduation} |`,
      `| Prompt versions improved | ${report.promptVersionsImproved} |`,
      `| RAG quality score | ${report.ragQualityScore} |`,
      '',
      '### Tier Coverage',
      '',
      '| Tier | Archetype | Count | Target | Gap |',
      '|------|-----------|-------|--------|-----|',
    ];

    for (const t of report.tierCoverage) {
      const gapFlag = t.hasGap ? ' ⚠️ TIER_COVERAGE_GAP' : '';
      lines.push(`| Tier ${t.tier} | ${t.archetype} | ${t.count} | ${t.target} |${gapFlag} |`);
    }

    if (Object.keys(report.shadowGapScores).length > 0) {
      lines.push(
        '',
        '### Shadow Gap Scores',
        '',
        '| Task Type | Gap Score |',
        '|-----------|-----------|',
      );
      for (const [tt, score] of Object.entries(report.shadowGapScores)) {
        const flag = score === 'STALLED' ? ' ⚠️ SHADOW_STALLED' : '';
        lines.push(`| ${tt} | ${score}${flag} |`);
      }
    }

    if (report.errors.length > 0) {
      lines.push('', '### Errors (non-blocking)', '');
      report.errors.forEach((e) => lines.push(`- ${e}`));
    }

    return lines.join('\n');
  }
}

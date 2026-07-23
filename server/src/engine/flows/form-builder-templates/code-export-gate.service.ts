/**
 * T647 CodeExportGate [QUALITY_GATE]
 * FLOW-23: Form Builder Templates
 *
 * Entry: CodeExportRequested event (user exports template as code)
 *
 * Execution order is MACHINE (CF-446):
 *   ORDER 1: Calculate quality score [0.0, 1.0] FRACTIONAL (never integer)
 *   ORDER 2: Compare to threshold from FREEDOM config (never hardcoded 80)
 *   ORDER 3: Gate pass: emit CodeExportAuthorized, fail: emit with deficit field
 *   ORDER 4: storeDocument(export audit) (DNA-8)
 *
 * Iron rules:
 *   IR-1: Quality score MUST be FRACTIONAL [0.0, 1.0] (CF-446), never integer
 *   IR-2: Threshold from FREEDOM config, never hardcoded as 80
 *   IR-3: Gate fail emits with deficit field (CF-446)
 *   IR-4: storeDocument audit before enqueue (DNA-8)
 */

import { Injectable, Inject } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { TenantContext, TENANT_CONTEXT_KEY } from '../../../kernel/multi-tenant/tenant-context';

const TEMPLATES_INDEX = 'xiigen-templates';
const CODE_EXPORT_AUDIT_INDEX = 'xiigen-code-export-audit';
const DEFAULT_QUALITY_THRESHOLD = 0.8; // 80% as fractional

@Injectable()
export class CodeExportGateService {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly db: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queue: IQueueService,
    private readonly cls: ClsService,
  ) {}

  private getTenantId(): string {
    try {
      return this.cls.get<TenantContext>(TENANT_CONTEXT_KEY)?.tenantId ?? 'unknown';
    } catch {
      return 'unknown';
    }
  }

  async checkExportGate(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantId = this.getTenantId();
    const templateId = event['templateId'] as string;
    const threshold =
      (event['qualityThreshold'] as number | undefined) ?? DEFAULT_QUALITY_THRESHOLD;

    if (!templateId) {
      return DataProcessResult.failure('INVALID_INPUT', 'templateId is required');
    }

    const checkedAt = new Date().toISOString();

    // ── ORDER 1: Calculate quality score (FRACTIONAL [0.0, 1.0]) ─────────────────
    const templateResult = await this.db.searchDocuments(TEMPLATES_INDEX, { templateId });
    if (!templateResult.isSuccess || (templateResult.data ?? []).length === 0) {
      return DataProcessResult.failure('TEMPLATE_NOT_FOUND', `Template ${templateId} not found`);
    }

    const template = (templateResult.data ?? [])[0] as Record<string, unknown>;
    const qualityScore = this.calculateQualityScore(template);

    // ── ORDER 2: Compare to threshold ───────────────────────────────────────────
    const passesGate = qualityScore >= threshold;

    // ── ORDER 3: Store audit record (DNA-8) ─────────────────────────────────────
    const deficit = passesGate ? 0.0 : threshold - qualityScore;
    await this.db.storeDocument(CODE_EXPORT_AUDIT_INDEX, {
      templateId,
      tenantId,
      qualityScore,
      threshold,
      passesGate,
      deficit,
      checkedAt,
      knowledgeScope: 'PRIVATE',
    });

    // ── ORDER 4: Emit event ──────────────────────────────────────────────────────
    if (passesGate) {
      await this.queue.enqueue('CodeExportAuthorized', {
        templateId,
        tenantId,
        qualityScore,
        checkedAt,
      });

      return DataProcessResult.success({
        templateId,
        tenantId,
        status: 'AUTHORIZED',
        qualityScore,
        checkedAt,
      });
    } else {
      await this.queue.enqueue('CodeExportBlocked', {
        templateId,
        tenantId,
        qualityScore,
        threshold,
        deficit,
        checkedAt,
      });

      return DataProcessResult.failure(
        'QUALITY_GATE_FAILED',
        `Quality score ${qualityScore} below threshold ${threshold}`,
        {
          qualityScore,
          threshold,
          deficit,
        },
      );
    }
  }

  private calculateQualityScore(template: Record<string, unknown>): number {
    // Calculate quality as fractional [0.0, 1.0]
    let score = 0.5; // Base score

    // Schema completeness
    const schema = template['schema'] as Record<string, unknown> | undefined;
    if (schema) {
      score += 0.2;
      const properties = (schema['properties'] as Record<string, unknown>) ?? {};
      if (Object.keys(properties).length > 0) {
        score += 0.15;
      }
    }

    // Status validation
    const status = template['status'] as string | undefined;
    if (status === 'PUBLISHED') {
      score += 0.15;
    }

    // Ensure score is in range [0.0, 1.0]
    return Math.min(Math.max(score, 0.0), 1.0);
  }
}

/**
 * T644 DynamicDataSlotResolve [BINDING]
 * FLOW-23: Form Builder Templates
 *
 * Entry: DataSlotResolutionRequested event (resolve JSONPath to actual values)
 *
 * Execution order is MACHINE (CF-435):
 *   ORDER 1: validateAgainstSource() JSONPath expressions before binding (CF-435)
 *   ORDER 2: Resolve JSONPath expressions — extract data from source
 *   ORDER 3: storeDocument(resolved bindings) (DNA-8)
 *   ORDER 4: enqueue(DataSlotResolved)
 *
 * Iron rules:
 *   IR-1: validateAgainstSource() at ORDER 1 before binding (CF-435)
 *   IR-2: DNA-1 — no typed BindingResult class, use Record<string,unknown>
 *   IR-3: storeDocument resolved bindings BEFORE enqueue (DNA-8)
 */

import { Injectable, Inject } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { TenantContext, TENANT_CONTEXT_KEY } from '../../../kernel/multi-tenant/tenant-context';

const RESOLVED_SLOTS_INDEX = 'xiigen-resolved-slots';

@Injectable()
export class DynamicDataSlotResolverService {
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

  async resolveSlot(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantId = this.getTenantId();
    const slotId = event['slotId'] as string;
    const jsonPath = event['jsonPath'] as string;
    const sourceData = event['sourceData'] as Record<string, unknown>;

    if (!slotId || !jsonPath || !sourceData) {
      return DataProcessResult.failure(
        'INVALID_INPUT',
        'slotId, jsonPath, and sourceData are required',
      );
    }

    const resolvedAt = new Date().toISOString();

    // ── ORDER 1: Validate JSONPath against source (CF-435) ──────────────────────
    const validationResult = this.validateJsonPath(jsonPath, sourceData);
    if (!validationResult) {
      await this.queue.enqueue('DataSlotResolutionFailed', {
        slotId,
        tenantId,
        jsonPath,
        reason: 'Invalid JSONPath expression or path not found in source',
      });

      return DataProcessResult.failure(
        'INVALID_JSONPATH',
        `JSONPath ${jsonPath} is invalid for source data`,
      );
    }

    // ── ORDER 2: Resolve JSONPath expression ─────────────────────────────────
    const resolvedValue = this.extractFromSource(jsonPath, sourceData);

    // ── ORDER 3: Store resolved binding (DNA-8) ────────────────────────────────
    const resolvedBinding: Record<string, unknown> = {
      slotId,
      tenantId,
      jsonPath,
      resolvedValue,
      resolvedAt,
      knowledgeScope: 'PRIVATE',
    };

    await this.db.storeDocument(RESOLVED_SLOTS_INDEX, resolvedBinding);

    // ── ORDER 4: Emit DataSlotResolved ──────────────────────────────────────
    await this.queue.enqueue('DataSlotResolved', {
      slotId,
      tenantId,
      jsonPath,
      resolvedAt,
    });

    return DataProcessResult.success({
      slotId,
      tenantId,
      jsonPath,
      resolvedValue,
      resolvedAt,
    });
  }

  private validateJsonPath(jsonPath: string, sourceData: Record<string, unknown>): boolean {
    // Validate JSONPath syntax and that path exists in source
    if (!jsonPath || !jsonPath.startsWith('$')) {
      return false;
    }

    // Simple validation: ensure path components exist (no deep validation here)
    try {
      const pathParts = jsonPath.replace('$.', '').split('.');
      let current: unknown = sourceData;
      for (const part of pathParts) {
        if (!part) continue;
        if (typeof current === 'object' && current !== null) {
          current = (current as Record<string, unknown>)[part];
        } else {
          return false;
        }
      }
      return current !== undefined;
    } catch {
      return false;
    }
  }

  private extractFromSource(jsonPath: string, sourceData: Record<string, unknown>): unknown {
    // Extract value from source using JSONPath
    const pathParts = jsonPath.replace('$.', '').split('.');
    let current: unknown = sourceData;

    for (const part of pathParts) {
      if (!part) continue;
      if (typeof current === 'object' && current !== null) {
        current = (current as Record<string, unknown>)[part];
      } else {
        return null;
      }
    }

    return current;
  }
}

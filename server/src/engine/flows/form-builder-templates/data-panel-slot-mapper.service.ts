/**
 * T645 DataPanelSlotMap [BINDING]
 * FLOW-23: Form Builder Templates
 *
 * Entry: DataPanelMappingRequested event (map data panel slots to template fields)
 *
 * Execution order is MACHINE (CF-434):
 *   ORDER 1: validateJsonPath() for each slot binding (CF-434)
 *   ORDER 2: Map slots to template fields via JSONPath
 *   ORDER 3: storeDocument(slot mappings) (DNA-8)
 *   ORDER 4: enqueue(DataPanelMapped)
 *
 * Iron rules:
 *   IR-1: JSONPath validation at ORDER 1 before mapping (CF-434/CF-435)
 *   IR-2: storeDocument slot mappings BEFORE enqueue (DNA-8)
 */

import { Injectable, Inject } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { TenantContext, TENANT_CONTEXT_KEY } from '../../../kernel/multi-tenant/tenant-context';

const SLOT_MAPPINGS_INDEX = 'xiigen-slot-mappings';

@Injectable()
export class DataPanelSlotMapperService {
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

  async mapDataPanelSlots(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantId = this.getTenantId();
    const panelId = event['panelId'] as string;
    const slots = event['slots'] as Record<string, unknown>[] | undefined;

    if (!panelId || !slots || slots.length === 0) {
      return DataProcessResult.failure(
        'INVALID_INPUT',
        'panelId and non-empty slots array are required',
      );
    }

    const mappedAt = new Date().toISOString();

    // ── ORDER 1: Validate JSONPath for each slot ────────────────────────────────
    const mappings: Record<string, unknown>[] = [];
    for (const slot of slots) {
      const slotId = slot['slotId'] as string;
      const jsonPath = slot['jsonPath'] as string;
      const targetField = slot['targetField'] as string;

      if (!slotId || !jsonPath || !targetField) {
        return DataProcessResult.failure(
          'INVALID_SLOT_CONFIG',
          'Each slot must have slotId, jsonPath, and targetField',
        );
      }

      // Validate JSONPath format
      if (!this.isValidJsonPath(jsonPath)) {
        return DataProcessResult.failure('INVALID_JSONPATH', `JSONPath ${jsonPath} is not valid`);
      }

      mappings.push({
        slotId,
        jsonPath,
        targetField,
        panelId,
        tenantId,
        mappedAt,
      });
    }

    // ── ORDER 2: Map slots to template fields ────────────────────────────────────
    // Validation complete; mappings ready

    // ── ORDER 3: Store slot mappings (DNA-8) ────────────────────────────────────
    for (const mapping of mappings) {
      await this.db.storeDocument(SLOT_MAPPINGS_INDEX, {
        ...mapping,
        knowledgeScope: 'PRIVATE',
      });
    }

    // Store audit entry
    await this.db.storeDocument('xiigen-mapping-audit', {
      panelId,
      tenantId,
      mappingCount: mappings.length,
      mappedAt,
      knowledgeScope: 'PRIVATE',
    });

    // ── ORDER 4: Emit DataPanelMapped ──────────────────────────────────────────
    await this.queue.enqueue('DataPanelMapped', {
      panelId,
      tenantId,
      mappingCount: mappings.length,
      mappedAt,
    });

    return DataProcessResult.success({
      panelId,
      tenantId,
      mappingCount: mappings.length,
      mappedAt,
    });
  }

  private isValidJsonPath(jsonPath: string): boolean {
    // JSONPath must start with $ and contain valid path components
    if (!jsonPath || !jsonPath.startsWith('$')) {
      return false;
    }

    // Basic validation: ensure no invalid characters
    const validPathPattern = /^\$(\.[a-zA-Z_][a-zA-Z0-9_]*)*$/;
    return validPathPattern.test(jsonPath);
  }
}

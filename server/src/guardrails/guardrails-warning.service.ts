/**
 * GuardrailsWarningService — GAP-21-07
 *
 * IGuardrailsService implementation for ENGINE_WARNING emission.
 * Stores warnings in Elasticsearch (xiigen-guardrails-warnings index).
 *
 * Used by FLOW-21 CF-401 check: warns when FLOW-14 DWH consumer is absent.
 * Non-blocking — form processing continues regardless.
 *
 * DNA-3: returns DataProcessResult, never throws
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import { IDatabaseService, DATABASE_SERVICE } from '../fabrics/interfaces/database.interface';
import { DataProcessResult } from '../kernel/data-process-result';

export interface GuardrailsWarning {
  rule: string;
  flowId: string;
  topic?: string;
  severity: 'ENGINE_WARNING' | 'BFA_VIOLATION' | 'TOPOLOGY_VIOLATION';
  message: string;
  impact: string;
  action: string;
  detectedAt: string;
  acknowledgedAt?: string;
}

export const GUARDRAILS_WARNING_SERVICE = 'GUARDRAILS_WARNING_SERVICE';

export interface IGuardrailsWarningService {
  warn(rule: string, warning: GuardrailsWarning): Promise<DataProcessResult<void>>;
  clearWarning(rule: string, flowId: string): Promise<DataProcessResult<void>>;
  getActiveWarnings(flowId?: string): Promise<DataProcessResult<GuardrailsWarning[]>>;
}

const WARNINGS_INDEX = 'xiigen-guardrails-warnings';

@Injectable()
export class GuardrailsWarningService implements IGuardrailsWarningService {
  private readonly logger = new Logger(GuardrailsWarningService.name);

  constructor(@Inject(DATABASE_SERVICE) private readonly db: IDatabaseService) {}

  async warn(rule: string, warning: GuardrailsWarning): Promise<DataProcessResult<void>> {
    const docId = `${rule}:${warning.flowId}`;

    const storeResult = await this.db.storeDocument(
      WARNINGS_INDEX,
      {
        ...warning,
        docId,
        updatedAt: new Date().toISOString(),
      },
      docId,
    );

    if (!storeResult.isSuccess) {
      this.logger.error(
        `GuardrailsWarning: failed to store warning ${rule} for flow ${warning.flowId}`,
        storeResult.errorMessage,
      );
      return DataProcessResult.failure(
        storeResult.errorCode ?? 'WARNING_STORE_FAILED',
        storeResult.errorMessage ?? 'Failed to store guardrails warning',
      );
    }

    this.logger.warn(`[${warning.severity}] ${rule} — ${warning.message}`);
    return DataProcessResult.success(undefined);
  }

  async clearWarning(rule: string, flowId: string): Promise<DataProcessResult<void>> {
    const docId = `${rule}:${flowId}`;
    const deleteResult = await this.db.deleteDocument(WARNINGS_INDEX, docId);

    if (!deleteResult.isSuccess) {
      // Not found is acceptable (warning may not exist)
      this.logger.debug(`GuardrailsWarning: no warning to clear for ${rule}:${flowId}`);
    } else {
      this.logger.log(`GuardrailsWarning: cleared ${rule} for flow ${flowId}`);
    }

    return DataProcessResult.success(undefined);
  }

  async getActiveWarnings(flowId?: string): Promise<DataProcessResult<GuardrailsWarning[]>> {
    const filters: Record<string, unknown> = {};
    if (flowId) filters['flowId'] = flowId;

    const result = await this.db.searchDocuments(WARNINGS_INDEX, filters);
    if (!result.isSuccess) {
      return DataProcessResult.failure(
        result.errorCode ?? 'WARNINGS_QUERY_FAILED',
        result.errorMessage ?? 'Failed to query guardrails warnings',
      );
    }

    return DataProcessResult.success(result.data as unknown as GuardrailsWarning[]);
  }
}

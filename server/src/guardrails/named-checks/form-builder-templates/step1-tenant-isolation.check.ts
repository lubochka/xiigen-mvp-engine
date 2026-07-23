/**
 * GAP-23-1: step1_tenant_isolation named check.
 * CF-447: T360 (TenantIsolationEnforcer) must be nodes[0] in all 6 DAG templates (70–75).
 * Severity: BUILD_FAILURE
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';

@Injectable()
export class Step1TenantIsolationCheck {
  readonly checkId = 'step1_tenant_isolation';
  readonly bfaRule = 'CF-447';
  readonly severity = 'BUILD_FAILURE';
  readonly flowId = 'FLOW-23';
  readonly description = 'T360 must be nodes[0] in all 6 DAG templates (70–75)';

  constructor(@Inject(DATABASE_SERVICE) private db: IDatabaseService) {}

  async evaluate(): Promise<DataProcessResult<{ passed: boolean; violations: number[] }>> {
    const templateIds = [70, 71, 72, 73, 74, 75];
    const violations: number[] = [];

    for (const templateId of templateIds) {
      const result = await this.db.searchDocuments('xiigen-flow-registry', {
        _id: `template-${templateId}`,
      });

      if (
        !result.isSuccess ||
        !result.data ||
        (result.data as Record<string, unknown>[]).length === 0
      ) {
        violations.push(templateId);
        continue;
      }

      const records = result.data as Record<string, unknown>[];
      const template = records[0];
      const nodes = (template['nodes'] as Record<string, unknown>[]) ?? [];
      const sortedNodes = [...nodes].sort(
        (a, b) => (a['position'] as number) - (b['position'] as number),
      );

      if (sortedNodes[0]?.['taskTypeId'] !== 'T360') {
        violations.push(templateId);
      }
    }

    if (violations.length > 0) {
      return DataProcessResult.failure(
        'CF-447_BUILD_FAILURE',
        `Templates ${violations.join(', ')} do not have T360 as position 0`,
      );
    }

    return DataProcessResult.success({ passed: true, violations: [] });
  }
}

/**
 * T526 BfaRevalidationService [VALIDATION]
 */
import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';

const MARKETPLACE_BFA_RULES_INDEX = 'xiigen-marketplace-bfa-rules';

@Injectable()
export class BfaRevalidationService extends MicroserviceBase {
  constructor(@Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T526',
        serviceName: 'BfaRevalidationService',
        flowId: 'FLOW-32',
      }),
    });
  }
  async revalidateBfaRules(
    input: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const packageId = input['packageId'] as string;
    const tenantId = input['tenantId'] as string;
    const ruleIds = input['ruleIds'] as string[];
    if (!packageId || !tenantId || !ruleIds || ruleIds.length === 0) {
      return DataProcessResult.failure('INVALID_INPUT', 'packageId, tenantId, ruleIds required');
    }
    const rulesResult = await this.dbFabric.searchDocuments(MARKETPLACE_BFA_RULES_INDEX, {
      ruleId: { $in: ruleIds },
    });
    const rules = (rulesResult.data ?? []) as Record<string, unknown>[];
    if (rules.length !== ruleIds.length) {
      return DataProcessResult.failure(
        'MISSING_RULES',
        `Expected ${ruleIds.length} rules, found ${rules.length}`,
      );
    }
    const validationResults: Record<string, boolean> = {};
    for (const rule of rules) {
      const ruleId = rule['ruleId'] as string;
      const hasCondition = rule['condition'] !== undefined && rule['condition'] !== null;
      const hasAction = rule['action'] !== undefined && rule['action'] !== null;
      const isValid = hasCondition && hasAction;
      validationResults[ruleId] = isValid;
      if (!isValid) {
        return DataProcessResult.failure(
          'BFA_VALIDATION_FAILED',
          `Rule ${ruleId} invalid for package ${packageId} (IR-2)`,
        );
      }
    }
    return DataProcessResult.success({
      packageId,
      tenantId,
      rulesValidated: ruleIds.length,
      allValid: true,
    });
  }
}

/**
 * T525 GovernanceMigrationOrchestrator [ORCHESTRATION]
 */
import { Injectable, Inject } from '@nestjs/common';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';

const MARKETPLACE_GOVERNANCE_INDEX = 'xiigen-marketplace-governance';

@Injectable()
export class GovernanceMigrationOrchestratorService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T525',
        serviceName: 'GovernanceMigrationOrchestratorService',
        flowId: 'FLOW-32',
      }),
    });
  }
  async migrateGovernance(
    input: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const packageId = input['packageId'] as string;
    const tenantId = input['tenantId'] as string;
    const newRules = input['newRules'] as Record<string, unknown>[];
    if (!packageId || !tenantId || !newRules) {
      return DataProcessResult.failure('INVALID_INPUT', 'packageId, tenantId, newRules required');
    }
    const existingResult = await this.dbFabric.searchDocuments(MARKETPLACE_GOVERNANCE_INDEX, {
      packageId,
      tenantId,
    });
    const existingRules = (existingResult.data ?? []) as Record<string, unknown>[];
    const customizedRuleIds = new Set(
      existingRules.filter((r) => r['isCustomized'] === true).map((r) => r['ruleId'] as string),
    );
    const rulesToMigrate = newRules.filter(
      (rule) => !customizedRuleIds.has(rule['ruleId'] as string),
    );
    for (const rule of rulesToMigrate) {
      await this.dbFabric.storeDocument(MARKETPLACE_GOVERNANCE_INDEX, {
        ...rule,
        packageId,
        tenantId,
        isMigrated: true,
        migratedAt: new Date().toISOString(),
      });
    }
    await this.queueFabric.enqueue('governance.migrated', {
      packageId,
      tenantId,
      rulesCount: rulesToMigrate.length,
      customizedPreserved: customizedRuleIds.size,
    });
    return DataProcessResult.success({
      packageId,
      tenantId,
      rulesMigrated: rulesToMigrate.length,
      customizedPreserved: customizedRuleIds.size,
    });
  }
}

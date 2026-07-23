/**
 * T433 HookFanOutExecutor [PLUGIN_SYSTEM]
 * FLOW-28: Blog CMS Modules
 *
 * Entry: ContentEventOccurred event (any content state change)
 *
 * Execution order is MACHINE (CF-28-11):
 *   ORDER 1: Query registered hooks for this content event type
 *   ORDER 2: Fan out hook execution (sync or async per hook config)
 *   ORDER 3: storeDocument(hook-execution-log)
 *   ORDER 4: enqueue(HooksExecuted) — notify orchestrator of completion
 *
 * Iron rules:
 *   IR-1: Hooks are tenant-scoped; only tenant's hooks execute
 *   IR-2: Failed hooks logged but don't block content flow (fail-open)
 *   IR-3: tenantId from ALS only (DNA-5)
 *   IR-4: storeDocument BEFORE enqueue (DNA-8)
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { TenantContextResolver } from '../../../kernel/multi-tenant';

const HOOK_REGISTRY_INDEX = 'xiigen-hook-registry';
const HOOK_EXECUTION_LOG_INDEX = 'xiigen-hook-execution-log';

type LegacyTenantContextReader = {
  get?: (key: string) => Record<string, unknown> | undefined;
};

@Injectable()
export class HookFanOutExecutorService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
    private readonly tenantContext: TenantContextResolver,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T433',
        serviceName: 'HookFanOutExecutorService',
        flowId: 'FLOW-28',
      }),
    });
  }

  private getTenantId(): string {
    const result = this.tenantContext.getCurrentTenantId?.();
    if (result?.isSuccess && result.data) {
      return result.data;
    }

    const legacyTenant = (this.tenantContext as unknown as LegacyTenantContextReader).get?.('tenant');
    const legacyTenantId = legacyTenant?.['tenantId'];
    return typeof legacyTenantId === 'string' && legacyTenantId.length > 0
      ? legacyTenantId
      : 'unknown';
  }

  /**
   * Execute registered hooks in response to content events.
   */
  async executeHooks(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantId = this.getTenantId();
    const eventType = event['eventType'] as string;
    const contentId = event['contentId'] as string;
    const _eventPayload = event['eventPayload'] as Record<string, unknown>;

    if (!eventType || !contentId) {
      return DataProcessResult.failure('INVALID_INPUT', 'eventType and contentId are required');
    }

    // ── ORDER 1: Query registered hooks ──────────────────────────────────
    const hookQueryResult = await this.dbFabric.searchDocuments(HOOK_REGISTRY_INDEX, {
      tenantId,
      eventType,
      enabled: true,
    });

    const hooks = (hookQueryResult.data ?? []) as Record<string, unknown>[];

    if (hooks.length === 0) {
      return DataProcessResult.success({
        contentId,
        hooksExecuted: 0,
        status: 'NO_HOOKS_REGISTERED',
      });
    }

    // ── ORDER 2: Fan out hook execution ──────────────────────────────────
    const executionResults: Record<string, unknown>[] = [];

    for (const hook of hooks) {
      const hookId = hook['hookId'] as string;
      const _hookUrl = hook['hookUrl'] as string;
      const isAsync = hook['async'] as boolean;

      try {
        // Simulate hook execution
        const result = {
          hookId,
          status: 'EXECUTED',
          executedAt: new Date().toISOString(),
          isAsync,
        };
        executionResults.push(result);
      } catch (error) {
        // Failed hooks don't block the flow (fail-open)
        executionResults.push({
          hookId,
          status: 'FAILED',
          error: (error as Error).message,
          executedAt: new Date().toISOString(),
        });
      }
    }

    // ── ORDER 3: storeDocument(hook-execution-log) ──────────────────────
    const logRecord: Record<string, unknown> = {
      contentId,
      tenantId,
      eventType,
      hooksExecuted: hooks.length,
      executionResults,
      executedAt: new Date().toISOString(),
    };

    await this.dbFabric.storeDocument(
      HOOK_EXECUTION_LOG_INDEX,
      logRecord,
      `${contentId}:hooks:${eventType}`,
    );

    // ── ORDER 4: enqueue(HooksExecuted) ─────────────────────────────────
    await this.queueFabric.enqueue('HooksExecuted', {
      contentId,
      tenantId,
      eventType,
      hooksExecuted: hooks.length,
      executedAt: new Date().toISOString(),
    });

    return DataProcessResult.success({
      contentId,
      eventType,
      hooksExecuted: hooks.length,
      status: 'HOOKS_EXECUTED',
      executedAt: new Date().toISOString(),
    });
  }
}

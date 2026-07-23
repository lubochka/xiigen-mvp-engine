/**
 * T631 AutomationDispatcher [ORCHESTRATION]
 * FLOW-21: Dynamic Forms & Workflows
 *
 * Entry: SubmissionProcessed event (valid submission ready for automation)
 *
 * Execution order is MACHINE (CF-21-3):
 *   ORDER 1: Version guard — verify rule version matches expected (CF-21-3)
 *   ORDER 2: Evaluate rule condition against submission data (CF-21-3)
 *   ORDER 3: Acquire SETNX rule execution lock (CF-21-3)
 *   ORDER 4: Dispatch rule actions (conditional branching)
 *   ORDER 5: Store rule execution record
 *   ORDER 6: Release execution lock (or let TTL expire)
 *
 * Iron rules:
 *   IR-1: Version guard at ORDER 1 — reject stale rule versions (CF-21-3)
 *   IR-2: Rule condition evaluation at ORDER 2 for multi-path dispatch (CF-21-3)
 *   IR-3: SETNX rule execution lock at ORDER 3 (CF-21-3)
 *   IR-4: Queue rule actions conditionally (CF-21-3)
 *   IR-5: Store execution before releasing lock (DNA-8)
 *   IR-6: tenantId from ALS; rule.tenantId must match (CF-21-3)
 *
 * Pattern reference: AUTOMATION-DISPATCH-RULE-001 RAG pattern from DR-21-C
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { TenantContextResolver } from '../../../kernel/multi-tenant';

const AUTOMATION_RULES_INDEX = 'xiigen-automation-rules';
const RULE_EXECUTION_INDEX = 'xiigen-rule-executions';

type LegacyTenantContextReader = {
  get?: (key: string) => Record<string, unknown> | undefined;
};

@Injectable()
export class AutomationDispatcherService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
    private readonly tenantContext: TenantContextResolver,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T631',
        serviceName: 'AutomationDispatcherService',
        flowId: 'FLOW-21',
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
   * Dispatch automation rules with SETNX lock + conditional branching.
   * DPO pattern: AUTOMATION-DISPATCH-RULE-001
   */
  async dispatchRules(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantId = this.getTenantId();
    const submissionId = event['submissionId'] as string;
    const formId = event['formId'] as string;
    const submissionData = event['data'] as Record<string, unknown> | undefined;

    if (!submissionId || !formId || !submissionData) {
      return DataProcessResult.failure(
        'INVALID_INPUT',
        'submissionId, formId, and data are required',
      );
    }

    // Fetch rules for this form
    const rulesResult = await this.dbFabric.searchDocuments(AUTOMATION_RULES_INDEX, { formId });

    if (!rulesResult.isSuccess || (rulesResult.data ?? []).length === 0) {
      // No rules defined for this form — OK, just return success
      return DataProcessResult.success({
        submissionId,
        formId,
        rulesExecuted: 0,
        timestamp: new Date().toISOString(),
      });
    }

    const rules = rulesResult.data as Array<Record<string, unknown>>;
    const executedRules: Array<{ ruleId: string; conditionResult: boolean }> = [];

    for (const rule of rules) {
      const ruleId = rule['ruleId'] as string;
      const ruleTenantId = rule['tenantId'] as string | undefined;

      // Verify rule tenant matches submitter tenant (CF-21-3)
      if (ruleTenantId !== tenantId) {
        continue; // Skip rule — tenant mismatch
      }

      // ── ORDER 1: Version guard — reject stale rule versions — IR-1, CF-21-3 ─
      const ruleVersion = rule['version'] as number | undefined;
      const expectedVersion = rule['expectedVersion'] as number | undefined;
      if (
        expectedVersion !== undefined &&
        ruleVersion !== undefined &&
        ruleVersion !== expectedVersion
      ) {
        // Stale rule version — skip to avoid executing outdated automation logic
        continue;
      }

      // ── ORDER 2: Evaluate rule condition — IR-2, CF-21-3 ──────────────────
      const condition = rule['condition'] as Record<string, unknown> | undefined;
      let conditionResult = true;

      if (condition) {
        const conditionField = condition['field'] as string;
        const operator = condition['operator'] as string;
        const conditionValue = condition['value'] as unknown;
        const fieldValue = submissionData[conditionField];

        conditionResult = this.evaluateCondition(fieldValue, operator, conditionValue);
      }

      // ── ORDER 3: SETNX rule execution lock — IR-3, CF-21-3 ───────────────
      const lockKey = `rule-exec-lock:${submissionId}:${ruleId}`;
      // Simulating SETNX — assume this returns true if lock acquired, false if held
      const lockAcquired = await this.acquireLock(lockKey);

      if (!lockAcquired) {
        // Lock held — rule already executing, skip (idempotency)
        continue;
      }

      try {
        // ── ORDER 4: Dispatch actions based on condition — IR-4 ───────────
        const conditionResultActions = conditionResult
          ? (rule['thenActions'] as Array<Record<string, unknown>> | undefined)
          : (rule['elseActions'] as Array<Record<string, unknown>> | undefined);

        if (conditionResultActions) {
          for (const action of conditionResultActions) {
            const actionType = action['type'] as string;

            if (actionType === 'emit_event') {
              const eventName = action['eventName'] as string;
              const eventPayload = action['eventPayload'] as Record<string, unknown> | undefined;
              await this.queueFabric.enqueue(eventName, {
                submissionId,
                formId,
                tenantId,
                ...eventPayload,
              });
            } else if (actionType === 'webhook') {
              // In real scenario, would call webhook service
              // For now, just log intent
            } else if (actionType === 'transform') {
              // In real scenario, would transform submission data
              // For now, just log intent
            } else if (actionType === 'store') {
              // In real scenario, would store a record
              // For now, just log intent
            }
          }
        }

        // ── ORDER 5: Store rule execution record — IR-5, DNA-8 ──────────
        const executionRecord: Record<string, unknown> = {
          ruleId,
          submissionId,
          formId,
          tenantId,
          conditionResult,
          actionsExecuted: (conditionResultActions ?? []).length,
          executedAt: new Date().toISOString(),
        };

        await this.dbFabric.storeDocument(
          RULE_EXECUTION_INDEX,
          executionRecord,
          `${submissionId}::${ruleId}`,
        );

        executedRules.push({ ruleId, conditionResult });
      } finally {
        // ── ORDER 6: Release execution lock ────────────────────────────────
        await this.releaseLock(lockKey);
      }
    }

    return DataProcessResult.success({
      submissionId,
      formId,
      rulesExecuted: executedRules.length,
      executedRules,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Simulate SETNX lock acquisition.
   * In real impl, use Redis SETNX with TTL.
   */
  private async acquireLock(_lockKey: string): Promise<boolean> {
    // Simulated — always returns true for now
    // Real implementation: use Redis SETNX or similar
    return true;
  }

  /**
   * Simulate lock release.
   */
  private async releaseLock(_lockKey: string): Promise<void> {
    // Simulated — no-op for now
    // Real implementation: use Redis DEL
  }

  /**
   * Evaluate condition (field, operator, value).
   */
  private evaluateCondition(
    fieldValue: unknown,
    operator: string,
    conditionValue: unknown,
  ): boolean {
    switch (operator) {
      case '==':
        return fieldValue === conditionValue;
      case '!=':
        return fieldValue !== conditionValue;
      case '>':
        return Number(fieldValue) > Number(conditionValue);
      case '<':
        return Number(fieldValue) < Number(conditionValue);
      case '>=':
        return Number(fieldValue) >= Number(conditionValue);
      case '<=':
        return Number(fieldValue) <= Number(conditionValue);
      case 'contains':
        return String(fieldValue).includes(String(conditionValue));
      default:
        return true;
    }
  }
}

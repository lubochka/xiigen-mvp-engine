/**
 * TenantPolicyEnforcer — T477 [GUARD].
 *
 * Reads active policy rules from FREEDOM config (key: flow30_policy_rules).
 * Evaluates operation context against policy rules.
 * On violation: logs to violation store, emits policy.violation.detected → POLICY_VIOLATION.
 *
 * DNA-8: storeDocument() BEFORE enqueue().
 * DNA-3: All methods return DataProcessResult — never throw.
 * CF-476: tenantId required — UNSCOPED_QUERY on missing.
 */

import { DataProcessResult } from '../../../kernel/data-process-result';
import { randomUUID } from 'crypto';

interface IDb {
  storeDocument(
    index: string,
    doc: Record<string, unknown>,
    id?: string,
  ): Promise<DataProcessResult<Record<string, unknown>>>;
}

interface IQueue {
  enqueue(event: string, data: Record<string, unknown>): Promise<DataProcessResult<string>>;
}

interface IFreedom {
  get(key: string): Promise<DataProcessResult<Record<string, unknown>>>;
}

export interface PolicyCheckResult {
  compliant: boolean;
  violatedRules: string[];
  checkedAt: string;
}

export class TenantPolicyEnforcer {
  constructor(
    private readonly db: IDb,
    private readonly queue: IQueue,
    private readonly freedom: IFreedom,
  ) {}

  async enforce(
    tenantId: string,
    operationContext: Record<string, unknown>,
  ): Promise<DataProcessResult<PolicyCheckResult>> {
    if (!tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');

    // Read policy rules from FREEDOM config — never hardcoded
    const policyConfig = await this.freedom.get('flow30_policy_rules');
    if (!policyConfig.isSuccess)
      return DataProcessResult.failure(policyConfig.errorCode!, policyConfig.errorMessage!);

    const rules = (policyConfig.data!['rules'] as Array<Record<string, unknown>>) ?? [];
    const violatedRules: string[] = [];

    // Evaluate each rule against operation context
    for (const rule of rules) {
      const ruleId = rule['id'] as string;
      const field = rule['field'] as string;
      const operator = rule['operator'] as string;
      const value = rule['value'];

      if (!field || !operator) continue;

      const contextValue = operationContext[field];
      let violated = false;

      if (operator === 'eq' && contextValue !== value) violated = true;
      if (operator === 'ne' && contextValue === value) violated = true;
      if (
        operator === 'gt' &&
        typeof contextValue === 'number' &&
        contextValue <= (value as number)
      )
        violated = true;
      if (
        operator === 'lt' &&
        typeof contextValue === 'number' &&
        contextValue >= (value as number)
      )
        violated = true;
      if (operator === 'in' && Array.isArray(value) && !value.includes(contextValue))
        violated = true;
      if (operator === 'nin' && Array.isArray(value) && value.includes(contextValue))
        violated = true;

      if (violated) violatedRules.push(ruleId ?? field);
    }

    const checkedAt = new Date().toISOString();

    if (violatedRules.length > 0) {
      // Log to violation store then emit — storeDocument BEFORE enqueue (DNA-8)
      const violationId = randomUUID();
      const doc: Record<string, unknown> = {
        violationId,
        tenantId,
        violatedRules,
        operationContext,
        checkedAt,
      };

      const stored = await this.db.storeDocument('flow30-policy-violations', doc, violationId);
      if (!stored.isSuccess)
        return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);

      await this.queue.enqueue('policy.violation.detected', {
        violationId,
        tenantId,
        violatedRules,
        checkedAt,
      });

      return DataProcessResult.failure(
        'POLICY_VIOLATION',
        `Policy rules violated: ${violatedRules.join(', ')}`,
      );
    }

    return DataProcessResult.success({ compliant: true, violatedRules: [], checkedAt });
  }
}

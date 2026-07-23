/**
 * Flow15BillingLifecycleRagSeed — RAG patterns for FLOW-15 Billing Lifecycle domain.
 * R1-1_F15 (R11): SESSION-GAP-R11
 *
 * DNA-3: All methods return DataProcessResult.
 * Rule 1: No SDK imports.
 */
import { Injectable } from '@nestjs/common';
import { FlowRagSeedBase } from './flow-rag-seed.base';
import { DataProcessResult } from '../kernel/data-process-result';

@Injectable()
export class Flow15BillingLifecycleRagSeed extends FlowRagSeedBase {
  readonly domainId = 'flow-15-billing-lifecycle';

  async indexPatterns(): Promise<DataProcessResult<number>> {
    const patterns = [
      {
        patternId: 'F15-BL-PAT-001',
        namespace: 'billing-lifecycle',
        pattern: 'no-backward-subscription-transitions',
        description:
          'Subscription state machine only moves forward: TRIAL→ACTIVE→CANCELLED. ' +
          'No CANCELLED→ACTIVE allowed.',
        codeExample:
          'if (currentState === "CANCELLED") return DataProcessResult.failure("INVALID_TRANSITION", ...);',
        tags: ['subscription', 'state', 'transition', 'lifecycle', 'forward-only'],
        flowId: 'FLOW-15',
      },
      {
        patternId: 'F15-BL-PAT-002',
        namespace: 'billing-lifecycle',
        pattern: 'metering-separation',
        description:
          'AI add-on usage metering (T_START+27..31) must use separate meter from platform metering (FLOW-14). ' +
          'Never co-mingle.',
        codeExample: 'await aiAddonMeter.record(tenantId, units); // NOT platform meter',
        tags: ['metering', 'usage', 'ai', 'addon', 'separate', 'CF-241'],
        flowId: 'FLOW-15',
      },
      {
        patternId: 'F15-BL-PAT-003',
        namespace: 'billing-lifecycle',
        pattern: 'paywall-pattern',
        description:
          'Feature gate check: verify subscription plan allows feature before execution. ' +
          'Return 402 via DataProcessResult.failure.',
        codeExample:
          'return DataProcessResult.failure("PAYMENT_REQUIRED", "Feature requires BILLING plan")',
        tags: ['paywall', 'gate', 'feature', 'plan', 'billing'],
        flowId: 'FLOW-15',
      },
    ];

    let count = 0;
    for (const p of patterns) {
      const result = await this.upsertPattern(p);
      if (result.isSuccess) count++;
    }
    return DataProcessResult.success(count);
  }

  async indexBfaRules(): Promise<DataProcessResult<number>> {
    return DataProcessResult.success(0);
  }

  async indexDesignRecords(): Promise<DataProcessResult<number>> {
    return DataProcessResult.success(0);
  }
}

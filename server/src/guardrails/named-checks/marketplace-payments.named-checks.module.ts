// file: server/src/guardrails/named-checks/marketplace-payments.named-checks.module.ts
// FLOW-16 named checks module — registers CF-256 through CF-269 check functions.

import { Injectable, OnModuleInit } from '@nestjs/common';
import { NamedCheckRegistry } from '../../engine/node-handlers/named-check.registry';
import {
  checkCF256_KycGatingRequired,
  checkCF257_BuyerKycNoBypas,
  checkCF258_SellerKycNoBypas,
  checkCF259_T221RequiresEP5AndDNA9,
  checkCF260_T221CompensationLifo,
  checkCF261_T221S5NoCompensation,
  checkCF262_DisputeTriggersSynchronousPayoutFreeze,
  checkCF263_DisputeNoAutoResolve,
  checkCF264_PaymentCaptureRequiresAuth,
  checkCF265_PayoutHoldNotificationSynchronous,
  checkCF266_PayoutRequiresSellerKyc,
  checkCF267_T226NoPublishedFilter,
  checkCF268_T226NoF234Import,
  checkCF269_T226ReadOnlyTopology,
} from './marketplace-payments.named-checks';
import { CheckContext } from './named-check.types';

export const FLOW_16_CHECK_MANIFEST = [
  { id: 'CF-256', fn: checkCF256_KycGatingRequired },
  { id: 'CF-257', fn: checkCF257_BuyerKycNoBypas },
  { id: 'CF-258', fn: checkCF258_SellerKycNoBypas },
  { id: 'CF-259', fn: checkCF259_T221RequiresEP5AndDNA9 },
  { id: 'CF-260', fn: checkCF260_T221CompensationLifo },
  { id: 'CF-261', fn: checkCF261_T221S5NoCompensation },
  { id: 'CF-262', fn: checkCF262_DisputeTriggersSynchronousPayoutFreeze },
  { id: 'CF-263', fn: checkCF263_DisputeNoAutoResolve },
  { id: 'CF-264', fn: checkCF264_PaymentCaptureRequiresAuth },
  { id: 'CF-265', fn: checkCF265_PayoutHoldNotificationSynchronous },
  { id: 'CF-266', fn: checkCF266_PayoutRequiresSellerKyc },
  { id: 'CF-267', fn: checkCF267_T226NoPublishedFilter },
  { id: 'CF-268', fn: checkCF268_T226NoF234Import },
  { id: 'CF-269', fn: checkCF269_T226ReadOnlyTopology },
] as const;

export const FLOW_16_CHECK_COUNT = FLOW_16_CHECK_MANIFEST.length; // 14

/**
 * Flow16NamedChecksRegistrar — registers CF-256 through CF-269 check evaluators
 * with the NamedCheckRegistry on module init.
 *
 * Evaluators are wrapped to adapt CheckContext (BFA context) to the engine's
 * EvaluatorFn signature (code: string, contract?: Record<string, unknown>).
 */
@Injectable()
export class Flow16NamedChecksRegistrar implements OnModuleInit {
  constructor(private readonly registry: NamedCheckRegistry) {}

  onModuleInit(): void {
    for (const { id, fn } of FLOW_16_CHECK_MANIFEST) {
      const checkId = id;
      const checkFn = fn;
      // Wrap CheckContext-based fn into EvaluatorFn signature
      this.registry.register(
        `flow16_${checkId.replace('-', '_').toLowerCase()}`,
        (_code: string, contract?: Record<string, unknown>) => {
          const ctx: CheckContext = {
            taskTypeId: (contract?.['taskTypeId'] as string) ?? '',
            flowId: 'FLOW-16',
            contractFields: contract,
            queryFilters: (contract?.['queryFilters'] as string[]) ?? [],
            importsList: (contract?.['importsList'] as string[]) ?? [],
          };
          const result = checkFn(ctx);
          return { pass: result.passed, reason: result.message };
        },
      );
    }
  }
}

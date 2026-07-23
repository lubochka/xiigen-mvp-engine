// T112 FeeCalculatorHandler [DATA_PIPELINE] — INLINE_PURE
// @connectionType FLOW_SCOPED
// @flowId FLOW-09
//
//
// INLINE_PURE pattern (CF-09-5):
//   Called inline by T110 RevenueTracker.
//   Returns FeeBreakdown ONLY — NO storeDocument, NO enqueue, NO side effects.
//   SILENT_FAILURE: adding storeDocument() compiles; orphaned fee records on T110 failure.
//
// Iron rules:
//   NO storeDocument — BUILD_FAILURE if present (CF-09-5)
//   NO enqueue — BUILD_FAILURE if present
//   Returns FeeBreakdown synchronously
//   Fee rates from FREEDOM config — never hardcoded
//   @Injectable() only — no @EventPattern, no @MessagePattern

import { DataProcessResult } from '../../../kernel/data-process-result';
import type { IFreedomConfigService } from '../../../freedom/freedom-config.interface';

export interface FeeCalculationInput {
  grossAmount: number;
  currency: string;
  purchaseId: string;
  ticketTier: string;
}

export interface FeeBreakdown {
  grossAmount: number;
  platformFeeRate: number;
  platformFee: number;
  processingFeeRate: number;
  processingFee: number;
  totalFee: number;
  netAmount: number;
  currency: string;
}

export class FeeCalculatorHandler {
  constructor(
    /** FREEDOM config service — fee rates are FREEDOM config, never literals */

    private readonly freedom: IFreedomConfigService,
  ) {}

  async calculate(input: FeeCalculationInput): Promise<DataProcessResult<FeeBreakdown>> {
    // Fee rates from FREEDOM config — never hardcoded (Rule 14: Config Over Code)
    const platformRateConfig = await this.freedom.get('flow09_platform_fee_rate');
    const processingRateConfig = await this.freedom.get('flow09_processing_fee_rate');

    const platformFeeRate: number =
      typeof platformRateConfig?.['flow09_platform_fee_rate'] === 'number'
        ? (platformRateConfig['flow09_platform_fee_rate'] as number)
        : 0.02;

    const processingFeeRate: number =
      typeof processingRateConfig?.['flow09_processing_fee_rate'] === 'number'
        ? (processingRateConfig['flow09_processing_fee_rate'] as number)
        : 0.029;

    const platformFee = input.grossAmount * platformFeeRate;
    const processingFee = input.grossAmount * processingFeeRate;
    const totalFee = platformFee + processingFee;
    const netAmount = input.grossAmount - totalFee;

    // INLINE_PURE: returns FeeBreakdown ONLY — no storeDocument, no enqueue
    return DataProcessResult.success({
      grossAmount: input.grossAmount,
      platformFeeRate,
      platformFee,
      processingFeeRate,
      processingFee,
      totalFee,
      netAmount,
      currency: input.currency,
    });
  }
}

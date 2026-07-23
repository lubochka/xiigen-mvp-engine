/**
 * GuardrailsModule — NestJS module for all guardrail services.
 *
 * Provides:
 *   - BusinessFlowArbiter (as IBfaValidator — replaces StubBfaValidator from P6.4)
 *   - DnaPatternValidator
 *   - DnaInterceptor
 *   - PromotionLadder
 *
 * Phase 7.5: Module wiring.
 */

import { Module } from '@nestjs/common';
import { IBfaValidator } from '../engine-contracts/bfa-validator.stub';
import { BusinessFlowArbiter } from './bfa';
import { DnaPatternValidator } from './dna-validator';
import { DnaInterceptor } from './dna.interceptor';
import { PromotionLadder } from './promotion-ladder';

@Module({
  providers: [
    BusinessFlowArbiter,
    {
      provide: IBfaValidator,
      useExisting: BusinessFlowArbiter,
    },
    DnaPatternValidator,
    DnaInterceptor,
    PromotionLadder,
  ],
  exports: [
    BusinessFlowArbiter,
    IBfaValidator,
    DnaPatternValidator,
    DnaInterceptor,
    PromotionLadder,
  ],
})
export class GuardrailsModule {}

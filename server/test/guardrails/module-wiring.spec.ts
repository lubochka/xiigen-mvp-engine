/**
 * P7.5 Tests — Module Wiring
 *
 * Verifies GuardrailsModule and FreedomModule exports are correct,
 * IBfaValidator → BusinessFlowArbiter, all services injectable.
 */

import { BusinessFlowArbiter } from '../../src/guardrails/bfa';
import { DnaPatternValidator } from '../../src/guardrails/dna-validator';
import { DnaInterceptor } from '../../src/guardrails/dna.interceptor';
import { PromotionLadder } from '../../src/guardrails/promotion-ladder';
import { FreedomConfigManager } from '../../src/freedom/config-manager';
import { ConfigBuilder } from '../../src/freedom/config-builder';
import { IBfaValidator } from '../../src/engine-contracts/bfa-validator.stub';

describe('GuardrailsModule wiring', () => {
  it('BusinessFlowArbiter extends IBfaValidator', () => {
    const bfa = new BusinessFlowArbiter();
    expect(bfa).toBeInstanceOf(IBfaValidator);
  });

  it('BusinessFlowArbiter has checkConflicts and registerFlow', () => {
    const bfa = new BusinessFlowArbiter();
    expect(typeof bfa.checkConflicts).toBe('function');
    expect(typeof bfa.registerFlow).toBe('function');
  });

  it('DnaPatternValidator is instantiable', () => {
    const v = new DnaPatternValidator();
    expect(typeof v.validate).toBe('function');
    expect(typeof v.isCompliant).toBe('function');
  });

  it('DnaInterceptor is instantiable', () => {
    const i = new DnaInterceptor();
    expect(typeof i.intercept).toBe('function');
    expect(i.getEnforceMode()).toBe('log');
  });

  it('PromotionLadder is instantiable', () => {
    const l = new PromotionLadder();
    expect(typeof l.promote).toBe('function');
    expect(typeof l.canDeploy).toBe('function');
  });
});

describe('FreedomModule wiring', () => {
  it('FreedomConfigManager is instantiable', () => {
    const m = new FreedomConfigManager();
    expect(typeof m.setConfig).toBe('function');
    expect(typeof m.getConfig).toBe('function');
    expect(typeof m.getValue).toBe('function');
  });

  it('ConfigBuilder is instantiable', () => {
    const b = new ConfigBuilder();
    expect(typeof b.resolve).toBe('function');
    expect(typeof b.invalidateCache).toBe('function');
  });
});

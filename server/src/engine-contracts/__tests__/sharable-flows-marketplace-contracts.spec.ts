/**
 * FLOW-32 engine contracts tests (T516–T535)
 * Verifies key contract fields for all 20 task types.
 */

import {
  FLOW_32_CONTRACTS,
  T518_CONTRACT,
  T522_CONTRACT,
  T523_CONTRACT,
  T526_CONTRACT,
  T528_CONTRACT,
  T529_CONTRACT,
  T530_CONTRACT,
  T531_CONTRACT,
  T532_CONTRACT,
  T534_CONTRACT,
} from '../sharable-flows-marketplace-contracts';

describe('FLOW_32_CONTRACTS', () => {
  it('exports exactly 20 task types (T516–T535)', () => {
    expect(FLOW_32_CONTRACTS).toHaveLength(20);
  });

  it('all contracts have taskTypeId, name, flowId fields', () => {
    for (const contract of FLOW_32_CONTRACTS) {
      expect(contract['taskTypeId']).toBeDefined();
      expect(contract['name']).toBeDefined();
      expect(contract['flowId']).toBe('FLOW-32');
    }
  });

  it('task type IDs are T516–T535', () => {
    const ids = FLOW_32_CONTRACTS.map((c) => c['taskTypeId']) as string[];
    for (let i = 516; i <= 535; i++) {
      expect(ids).toContain(`T${i}`);
    }
  });
});

describe('T518_CONTRACT — ArtifactPublisher (GAP-32-01 / CF-715)', () => {
  it('requires F1416, F1417, F1418 factories', () => {
    const factories = T518_CONTRACT['requiredFactories'] as string[];
    expect(factories).toContain('F1416');
    expect(factories).toContain('F1417');
    expect(factories).toContain('F1418');
  });

  it('requires supply_chain_tripartite_signing named check', () => {
    const checks = T518_CONTRACT['requiredNamedChecks'] as string[];
    expect(checks).toContain('supply_chain_tripartite_signing');
  });

  it('references CF-715 BFA rule', () => {
    const rules = T518_CONTRACT['bfaRules'] as string[];
    expect(rules).toContain('CF-715');
  });

  it('emits artifact.signed CloudEvent', () => {
    const events = T518_CONTRACT['emitsEvents'] as Array<{ event: string }>;
    const signedEvent = events.find((e) => e.event === 'artifact.signed');
    expect(signedEvent).toBeDefined();
  });
});

describe('T522_CONTRACT — MarketplaceInstaller (GAP-32-03 / CF-718)', () => {
  it('requires logic_data_plane_install_only named check', () => {
    const checks = T522_CONTRACT['requiredNamedChecks'] as string[];
    expect(checks).toContain('logic_data_plane_install_only');
  });

  it('references CF-718 BFA rule', () => {
    const rules = T522_CONTRACT['bfaRules'] as string[];
    expect(rules).toContain('CF-718');
  });

  it('installModel has planeRestriction LOGIC_ONLY', () => {
    const model = T522_CONTRACT['installModel'] as Record<string, unknown>;
    expect(model['planeRestriction']).toBe('LOGIC_ONLY');
  });
});

describe('T523_CONTRACT — BindingDocumentManager (GAP-32-04 / CF-726)', () => {
  it('requires secret_ref_indirection named check', () => {
    const checks = T523_CONTRACT['requiredNamedChecks'] as string[];
    expect(checks).toContain('secret_ref_indirection');
  });

  it('references CF-726 BFA rule', () => {
    const rules = T523_CONTRACT['bfaRules'] as string[];
    expect(rules).toContain('CF-726');
  });

  it('secretModel prohibits literal secrets', () => {
    const model = T523_CONTRACT['secretModel'] as Record<string, unknown>;
    expect(model['literalSecretsProhibited']).toBe(true);
    expect(model['storageType']).toBe('SECRET_REF_ONLY');
  });
});

describe('T526_CONTRACT — BFARevalidationService (GAP-32-07 / CF-729)', () => {
  it('requires bfa_revalidation_all_consumers named check', () => {
    const checks = T526_CONTRACT['requiredNamedChecks'] as string[];
    expect(checks).toContain('bfa_revalidation_all_consumers');
  });

  it('references CF-729 BFA rule', () => {
    const rules = T526_CONTRACT['bfaRules'] as string[];
    expect(rules).toContain('CF-729');
  });

  it('has DEGRADED_LOCAL_FALLBACK soft dependency on FLOW-25', () => {
    const deps = T526_CONTRACT['softDependencies'] as Array<Record<string, unknown>>;
    const flow25Dep = deps.find((d) => d['flowId'] === 'FLOW-25');
    expect(flow25Dep).toBeDefined();
    expect(flow25Dep!['onAbsent']).toBe('DEGRADED_LOCAL_FALLBACK');
  });

  it('revalidationModel prohibits sampling', () => {
    const model = T526_CONTRACT['revalidationModel'] as Record<string, unknown>;
    expect(model['samplingProhibited']).toBe(true);
    expect(model['iterationScope']).toBe('ALL_CONSUMERS');
  });
});

describe('T528/T529/T530 — RAG Blueprint sharing (GAP-32-03 / CF-718 / DD-323)', () => {
  for (const [label, contract] of [
    ['T528_CONTRACT', T528_CONTRACT],
    ['T529_CONTRACT', T529_CONTRACT],
    ['T530_CONTRACT', T530_CONTRACT],
  ] as [string, Record<string, unknown>][]) {
    describe(label, () => {
      it('requires logic_data_plane_separation named check', () => {
        const checks = contract['requiredNamedChecks'] as string[];
        expect(checks).toContain('logic_data_plane_separation');
      });

      it('references CF-718 BFA rule', () => {
        const rules = contract['bfaRules'] as string[];
        expect(rules).toContain('CF-718');
      });

      it('sharingModel restricts to LOGIC_ONLY plane', () => {
        const model = contract['sharingModel'] as Record<string, unknown>;
        expect(model['planeRestriction']).toBe('LOGIC_ONLY');
        expect(model['dataPlaneProhibited']).toBe(true);
      });
    });
  }
});

describe('T531_CONTRACT — UsageMeter (DNA-5 dual-tenant)', () => {
  it('has DUAL_WRITE storage strategy for two tenant IDs', () => {
    const event = T531_CONTRACT['dualTenantEvent'] as Record<string, unknown>;
    expect(event['storageStrategy']).toBe('DUAL_WRITE');
    const ids = event['tenantIds'] as string[];
    expect(ids).toContain('publisherTenantId');
    expect(ids).toContain('consumerTenantId');
  });
});

describe('T532_CONTRACT — RevenueSettlementEngine (GAP-32-05 / CF-734)', () => {
  it('requires integer_arithmetic_settlement named check', () => {
    const checks = T532_CONTRACT['requiredNamedChecks'] as string[];
    expect(checks).toContain('integer_arithmetic_settlement');
  });

  it('references CF-734 BFA rule', () => {
    const rules = T532_CONTRACT['bfaRules'] as string[];
    expect(rules).toContain('CF-734');
  });

  it('settlementModel prohibits float arithmetic and requires BIGINT_CENTS', () => {
    const model = T532_CONTRACT['settlementModel'] as Record<string, unknown>;
    expect(model['arithmeticType']).toBe('BIGINT_CENTS');
    expect(model['floatArithmeticProhibited']).toBe(true);
    expect(model['idempotencyRequired']).toBe(true);
  });
});

describe('T534_CONTRACT — FraudDetectionService (GAP-32-06 / CF-736)', () => {
  it('requires F1403 (IHumanReviewService)', () => {
    const factories = T534_CONTRACT['requiredFactories'] as string[];
    expect(factories).toContain('F1403');
  });

  it('requires fraud_human_review_required named check', () => {
    const checks = T534_CONTRACT['requiredNamedChecks'] as string[];
    expect(checks).toContain('fraud_human_review_required');
  });

  it('references CF-736 BFA rule', () => {
    const rules = T534_CONTRACT['bfaRules'] as string[];
    expect(rules).toContain('CF-736');
  });

  it('fraudModel prohibits automated account actions', () => {
    const model = T534_CONTRACT['fraudModel'] as Record<string, unknown>;
    expect(model['automatedActionsProhibited']).toBe(true);
    const prohibited = model['prohibitedAutomatedActions'] as string[];
    expect(prohibited).toContain('suspend');
    expect(prohibited).toContain('ban');
  });

  it('T534 has crossTaskReadDependency on T531 for self-install detection', () => {
    const deps = T534_CONTRACT['crossTaskReadDependencies'] as Array<Record<string, unknown>>;
    const t531Dep = deps.find((d) => d['taskTypeId'] === 'T531');
    expect(t531Dep).toBeDefined();
    expect(t531Dep!['readFor']).toBe('self_install_detection');
  });
});

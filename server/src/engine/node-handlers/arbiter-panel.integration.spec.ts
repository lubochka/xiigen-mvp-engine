/**
 * S2-03: ArbiterPanelHandler integration tests against real contracts.
 * Uses actual arbiterConfig from T47-T52 contracts.
 */
import { ArbiterPanelHandler } from './arbiter-panel.handler';
import { DATABASE_SERVICE } from '../../fabrics/interfaces/database.interface';
import {
  createT51Contract,
  createT52Contract,
} from '../../engine-contracts/profile-enrichment-matching-contracts';

describe('ArbiterPanelHandler integration', () => {
  let handler: ArbiterPanelHandler;
  const mockDb = {
    storeDocument: jest.fn().mockResolvedValue(undefined),
    searchDocuments: jest.fn().mockResolvedValue([]),
    getDocument: jest.fn(),
    deleteDocument: jest.fn(),
    bulkStore: jest.fn(),
    countDocuments: jest.fn(),
  };
  const mockAiProvider = {
    generate: jest.fn().mockResolvedValue({ text: '{"verdict":"ADVISORY","reason":"looks good"}' }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Direct instantiation — mirrors the pattern used in arbiter-panel.handler.spec.ts
    void DATABASE_SERVICE; // assert token is importable
    handler = new ArbiterPanelHandler(mockDb as never);
  });

  it('T51 convergence contract evaluates without throwing', async () => {
    const t51 = createT51Contract();
    const result = await handler.evaluate({
      candidates: [
        { providerId: 'claude', label: 'A', code: 'const x = 1;', model: 'claude-sonnet' },
      ],
      arbiterConfig: t51.arbiterConfig as any,
      contractContext: { ironRules: [...t51.ironRules] },
      aiProvider: mockAiProvider,
    });
    expect(result).toBeDefined();
    expect(result.chosen).toBeDefined();
    expect(result.escalatedToHuman).toBe(false);
  });

  it('T52 broadcast contract has key_principles arbiter with isolated:true', () => {
    const t52 = createT52Contract();
    const arbiterConfig = t52.arbiterConfig as any;
    expect(arbiterConfig).toBeDefined();
    expect(arbiterConfig.evaluatorArbiters?.key_principles).toBeDefined();
    expect(arbiterConfig.evaluatorArbiters.key_principles.isolated).toBe(true);
  });

  it('T51 and T52 contracts have blockSemanticsBehavior: ANY_BLOCK_CLASS_REJECTS', () => {
    const contracts = [createT51Contract(), createT52Contract()];
    for (const contract of contracts) {
      const ac = contract.arbiterConfig as any;
      expect(ac?.blockSemanticsBehavior).toBe('ANY_BLOCK_CLASS_REJECTS');
    }
  });

  it('T51 convergence contract has key_principles isolated:true', () => {
    const t51 = createT51Contract();
    const ac = t51.arbiterConfig as any;
    expect(ac?.evaluatorArbiters?.key_principles?.isolated).toBe(true);
  });
});

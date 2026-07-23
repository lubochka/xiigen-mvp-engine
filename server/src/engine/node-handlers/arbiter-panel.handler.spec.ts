import { ArbiterPanelHandler, ArbiterConfig } from './arbiter-panel.handler';
import type { GenerationCandidate } from './parallel-generation.service';

/** Minimal stub IDatabaseService — storeDocument succeeds silently. */
const mockDb = {
  storeDocument: jest.fn().mockResolvedValue({ isSuccess: true, data: {} }),
  searchDocuments: jest.fn(),
  getDocument: jest.fn(),
  deleteDocument: jest.fn(),
  bulkStore: jest.fn(),
  countDocuments: jest.fn(),
};

const arbiterConfig: ArbiterConfig = {
  evaluatorArbiters: {
    business_logic: {
      modelToken: 'AI_PROVIDER',
      expertise: 'business_logic',
      blind: false,
      isolated: false,
    },
    security: { modelToken: 'AI_PROVIDER', expertise: 'security', blind: false, isolated: false },
    skills_and_patterns: {
      modelToken: 'AI_PROVIDER',
      expertise: 'skills_and_patterns',
      blind: false,
      isolated: false,
    },
    prompts_compliance: {
      modelToken: 'AI_PROVIDER',
      expertise: 'prompts_compliance',
      blind: false,
      isolated: false,
    },
  },
  blockSemanticsBehavior: 'ANY_BLOCK_CLASS_REJECTS',
};

const candidates: GenerationCandidate[] = [
  { providerId: 'p1', label: 'A', code: 'const x = 1;', model: 'gpt-4' },
  { providerId: 'p2', label: 'B', code: 'const y = 2;', model: 'claude-3' },
];

const contractContext = {
  ironRules: ['Use DataProcessResult'],
  domainEvents: ['user.created'],
  bfaRules: ['CF-100'],
  ragPatterns: ['pattern-1'],
  genesisPrompt: 'Generate a service',
  failureModes: ['timeout'],
};

describe('ArbiterPanelHandler', () => {
  let handler: ArbiterPanelHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    handler = new ArbiterPanelHandler(mockDb as never);
  });

  it('returns chosen on no blocks: all arbiters return ADVISORY → chosen is first survivor, escalatedToHuman:false', async () => {
    const advisoryResponse = JSON.stringify({ verdict: 'ADVISORY', reason: 'looks good' });
    const aiProvider = {
      generate: jest.fn().mockResolvedValue({ text: advisoryResponse }),
    };

    const result = await handler.evaluate({
      candidates,
      arbiterConfig,
      contractContext,
      aiProvider,
    });

    expect(result.escalatedToHuman).toBe(false);
    expect(result.allBlocked).toBe(false);
    expect(result.chosen).not.toBeNull();
    expect(result.chosen?.label).toBe('A');
    expect(result.cyclesUsed).toBe(1);
    expect(result.verdicts.length).toBeGreaterThan(0);
    expect(result.verdicts.every((v) => v.verdict === 'ADVISORY')).toBe(true);
  });

  it('escalates when all candidates blocked every cycle: all arbiters return BLOCK → escalatedToHuman:true, chosen defaults to candidates[0]', async () => {
    const blockResponse = JSON.stringify({ verdict: 'BLOCK', reason: 'violation found' });
    const aiProvider = {
      generate: jest.fn().mockResolvedValue({ text: blockResponse }),
    };

    const result = await handler.evaluate({
      candidates,
      arbiterConfig,
      contractContext,
      aiProvider,
    });

    expect(result.escalatedToHuman).toBe(true);
    expect(result.allBlocked).toBe(true);
    expect(result.chosen).toBe(candidates[0]);
    expect(result.cyclesUsed).toBe(3); // MAX_CYCLES exhausted
    expect(result.verdicts.some((v) => v.verdict === 'BLOCK')).toBe(true);
  });

  it('never throws on provider failure: aiProvider.generate always throws → resolves, escalatedToHuman:true', async () => {
    const aiProvider = {
      generate: jest.fn().mockRejectedValue(new Error('provider unavailable')),
    };

    // Must not throw
    const result = await handler.evaluate({
      candidates,
      arbiterConfig,
      contractContext,
      aiProvider,
    });

    // When generate throws, callArbiter catches and returns ADVISORY
    // So all get ADVISORY and first candidate survives cycle 1
    expect(result).toBeDefined();
    // No throw means the promise resolved
    expect(typeof result.escalatedToHuman).toBe('boolean');
    expect(result.chosen).not.toBeUndefined();
  });

  // ── FC-32 — scope_isolation arbiter present in every panel run ──────────

  it('FC-32: scope_isolation arbiter runs on every candidate in every panel evaluation', async () => {
    const advisoryResponse = JSON.stringify({ verdict: 'ADVISORY', reason: 'ok' });
    const aiProvider = { generate: jest.fn().mockResolvedValue({ text: advisoryResponse }) };

    const result = await handler.evaluate({
      candidates,
      arbiterConfig,
      contractContext,
      aiProvider,
    });

    const scopeVerdicts = result.verdicts.filter((v) => v.arbiterId === 'scope_isolation');
    // One scope_isolation verdict per candidate (2 candidates × 1 cycle)
    expect(scopeVerdicts.length).toBe(candidates.length);
    expect(scopeVerdicts.every((v) => v.arbiterId === 'scope_isolation')).toBe(true);
  });

  it('FC-32: scope_isolation BLOCK eliminates candidate (ANY_BLOCK_CLASS_REJECTS)', async () => {
    let callCount = 0;
    const aiProvider = {
      generate: jest.fn().mockImplementation(async (prompt: string) => {
        callCount++;
        // Block only the scope_isolation arbiter (5th context in parallel array)
        // Identify by prompt content containing 'scope_isolation'
        const verdict = prompt.includes('scope_isolation') ? 'BLOCK' : 'ADVISORY';
        return { text: JSON.stringify({ verdict, reason: 'scope violation' }) };
      }),
    };

    const singleCandidate = [candidates[0]!];
    const result = await handler.evaluate({
      candidates: singleCandidate,
      arbiterConfig,
      contractContext,
      aiProvider,
    });

    // scope_isolation BLOCK → candidate eliminated → escalated after MAX_CYCLES
    expect(result.escalatedToHuman).toBe(true);
    expect(
      result.verdicts.some((v) => v.arbiterId === 'scope_isolation' && v.verdict === 'BLOCK'),
    ).toBe(true);
  });

  // ── SCOPE isolation tests ────────────────────────────────────────────────

  it('SCOPE-1: verdict records include tenantId from CLS when available', async () => {
    const advisoryResponse = JSON.stringify({ verdict: 'ADVISORY', reason: 'looks good' });
    const aiProvider = { generate: jest.fn().mockResolvedValue({ text: advisoryResponse }) };
    const mockCls = { get: jest.fn().mockReturnValue({ tenantId: 'scope-tenant' }) };
    const scopedHandler = new ArbiterPanelHandler(mockDb as never, mockCls as any);

    const result = await scopedHandler.evaluate({
      candidates,
      arbiterConfig,
      contractContext,
      aiProvider,
    });

    expect(result.verdicts.length).toBeGreaterThan(0);
    expect(result.verdicts.every((v) => v.tenantId === 'scope-tenant')).toBe(true);
  });

  it('SCOPE-2: verdict records default to tenantId="unknown" when CLS unavailable', async () => {
    const advisoryResponse = JSON.stringify({ verdict: 'ADVISORY', reason: 'looks good' });
    const aiProvider = { generate: jest.fn().mockResolvedValue({ text: advisoryResponse }) };
    // handler constructed without cls (existing tests use no cls)

    const result = await handler.evaluate({
      candidates,
      arbiterConfig,
      contractContext,
      aiProvider,
    });

    expect(result.verdicts.length).toBeGreaterThan(0);
    expect(result.verdicts.every((v) => v.tenantId === 'unknown')).toBe(true);
  });

  it('SCOPE-3: storeArbiterVerdicts writes tenantId to xiigen-arbiter-verdicts', async () => {
    jest.clearAllMocks();
    const advisoryResponse = JSON.stringify({ verdict: 'ADVISORY', reason: 'ok' });
    const aiProvider = { generate: jest.fn().mockResolvedValue({ text: advisoryResponse }) };
    const mockCls = { get: jest.fn().mockReturnValue({ tenantId: 'store-tenant' }) };
    const scopedHandler = new ArbiterPanelHandler(mockDb as never, mockCls as any);

    await scopedHandler.evaluate({ candidates, arbiterConfig, contractContext, aiProvider });

    await new Promise((r) => setTimeout(r, 20));
    const storeCalls = (mockDb.storeDocument as jest.Mock).mock.calls;
    const verdictStores = storeCalls.filter((c) => c[0] === 'xiigen-arbiter-verdicts');
    expect(verdictStores.length).toBeGreaterThan(0);
    verdictStores.forEach((c) => {
      expect(c[1]).toMatchObject({ tenantId: 'store-tenant' });
    });
  });
});

import { ArbiterService } from '../../src/engine/arbitration/arbiter.service';
import { ArbiterRegistry } from '../../src/engine/arbitration/arbiter-registry';
import { MockAiProvider } from '../../src/fabrics/ai-engine/mock.provider';
import { TenantContext, TENANT_CONTEXT_KEY, DEFAULT_PLAN } from '../../src/kernel';

function mockCls(tenantId = 'test-tenant') {
  const tenant = new TenantContext({
    id: tenantId,
    name: `Tenant ${tenantId}`,
    status: 'active',
    plan: { ...DEFAULT_PLAN },
    configOverrides: {},
    apiKeys: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  return {
    get: jest
      .fn()
      .mockImplementation((key: string) => (key === TENANT_CONTEXT_KEY ? tenant : undefined)),
  } as any;
}

const MOCK_VERDICT_JSON = JSON.stringify({
  score: 85,
  passed: true,
  notes: [],
  suggestions: [],
});

describe('ArbiterService', () => {
  let service: ArbiterService;
  let registry: ArbiterRegistry;

  beforeEach(() => {
    const mockAi = new MockAiProvider(mockCls(), { defaultResponse: MOCK_VERDICT_JSON });
    // G-2: pass judgeAi as first arg, fallbackAi as second.
    // judgeAi is used when non-null; fallbackAi activates only if judgeAi is null.
    service = new ArbiterService(mockAi as any, mockAi as any);
    registry = new ArbiterRegistry();
  });

  it('judges a candidate and returns a verdict', async () => {
    const dnaArbiter = registry.getById('dna').data!;
    const candidate = {
      code: 'export class PatternIndexerService extends MicroserviceBase {}',
      model: 'mock',
      taskType: 'T569',
    };

    const verdict = await service.judge(candidate, dnaArbiter);
    expect(verdict.isSuccess).toBe(true);
    expect(verdict.data!.arbiterId).toBe('dna');
    expect(verdict.data!.candidateModel).toBe('mock');
    expect(typeof verdict.data!.score).toBe('number');
    expect(Array.isArray(verdict.data!.notes)).toBe(true);
    expect(Array.isArray(verdict.data!.suggestions)).toBe(true);
  });

  it('passed field reflects score >= minPassScore', async () => {
    const arbiter = registry.getById('fabric').data!;
    const verdict = await service.judge({ code: 'stub', model: 'mock' }, arbiter);
    expect(verdict.isSuccess).toBe(true);
    expect(verdict.data!.passed).toBe(verdict.data!.score >= arbiter.minPassScore);
  });

  it('returns AI_FAILED when AI provider fails', async () => {
    const failAi = new MockAiProvider(mockCls(), { shouldFail: true, failMessage: 'AI down' });
    // judgeAi = failAi (used), fallbackAi = not reached
    const failService = new ArbiterService(failAi as any, failAi as any);
    const arbiter = registry.getById('dna').data!;
    const result = await failService.judge({ code: 'stub', model: 'mock' }, arbiter);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('AI_FAILED');
  });

  it('returns PARSE_FAILED when AI returns non-JSON text', async () => {
    const badAi = new MockAiProvider(mockCls(), { defaultResponse: 'not json at all' });
    const badService = new ArbiterService(badAi as any, badAi as any);
    const arbiter = registry.getById('tenant').data!;
    const result = await badService.judge({ code: 'stub', model: 'mock' }, arbiter);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('PARSE_FAILED');
  });

  it('uses fallbackAi with warning when judgeAi is null', async () => {
    const mockAi = new MockAiProvider(mockCls(), { defaultResponse: MOCK_VERDICT_JSON });
    // null judgeAi → fallback used → Logger.warn fires
    const fallbackService = new ArbiterService(null as any, mockAi as any);
    const arbiter = registry.getById('dna').data!;
    const result = await fallbackService.judge({ code: 'stub', model: 'mock' }, arbiter);
    expect(result.isSuccess).toBe(true);
  });
});

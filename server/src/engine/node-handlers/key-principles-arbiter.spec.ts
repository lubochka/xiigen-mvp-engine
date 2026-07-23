import { ArbiterPanelHandler, ArbiterConfig } from './arbiter-panel.handler';
import { buildKeyPrinciplesContext } from './arbiter-context-builders';
import type { GenerationCandidate } from './parallel-generation.service';

const mockDb = {
  storeDocument: jest.fn().mockResolvedValue({}),
};

function makeCandidate(label: string): GenerationCandidate {
  return {
    label,
    code: `// generated code for ${label}`,
    model: 'model-a',
    providerId: 'provider-test',
  };
}

const arbiterConfigWithKP: ArbiterConfig = {
  evaluatorArbiters: {
    business_logic: {
      modelToken: 'arbiter-a',
      expertise: 'business',
      blind: true,
      isolated: false,
    },
    security: { modelToken: 'arbiter-b', expertise: 'security', blind: true, isolated: false },
    skills_and_patterns: {
      modelToken: 'arbiter-c',
      expertise: 'skills',
      blind: true,
      isolated: false,
    },
    prompts_compliance: {
      modelToken: 'arbiter-d',
      expertise: 'prompts',
      blind: true,
      isolated: false,
    },
    key_principles: {
      modelToken: 'arbiter-e',
      expertise: 'principles',
      blind: true,
      isolated: true,
    },
  },
  blockSemanticsBehavior: 'ANY_BLOCK_CLASS_REJECTS',
};

describe('key_principles arbiter — S2-04', () => {
  let handler: ArbiterPanelHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    handler = new ArbiterPanelHandler(mockDb as never);
  });

  it('test 1: key_principles runs AFTER all 5 parallel arbiters (last call)', async () => {
    const callOrder: string[] = [];
    let callIndex = 0;

    const aiProvider = {
      generate: jest.fn().mockImplementation((prompt: string) => {
        callIndex++;
        // Identify which arbiter is calling by prompt content
        if (prompt.includes('key_principles')) {
          callOrder.push(`call-${callIndex}:key_principles`);
        } else {
          callOrder.push(`call-${callIndex}:parallel`);
        }
        return Promise.resolve({
          text: JSON.stringify({ verdict: 'ADVISORY', reason: 'looks good' }),
        });
      }),
    };

    const candidates = [makeCandidate('candidate-A')];
    await handler.evaluate({
      candidates,
      arbiterConfig: arbiterConfigWithKP,
      contractContext: {},
      aiProvider,
    });

    // Should have 6 total calls: 5 parallel (incl. scope_isolation FC-32) + 1 key_principles
    expect(aiProvider.generate).toHaveBeenCalledTimes(6);

    // The last call must be key_principles
    const lastCall = callOrder[callOrder.length - 1];
    expect(lastCall).toContain('key_principles');

    // The first 5 calls must all be parallel (not key_principles)
    const parallelCalls = callOrder.slice(0, 5);
    parallelCalls.forEach((c) => expect(c).toContain('parallel'));
  });

  it('test 2: blocks candidate that passes 4 parallel arbiters but violates key_principles', async () => {
    // Parallel arbiters return ADVISORY; key_principles returns BLOCK
    let callCount = 0;
    const aiProvider = {
      generate: jest.fn().mockImplementation((prompt: string) => {
        callCount++;
        if (prompt.includes('key_principles')) {
          return Promise.resolve({
            text: JSON.stringify({ verdict: 'BLOCK', reason: 'violates DNA-3 principle' }),
          });
        }
        // All 5 parallel arbiters (incl. scope_isolation): ADVISORY
        return Promise.resolve({
          text: JSON.stringify({ verdict: 'ADVISORY', reason: 'looks fine' }),
        });
      }),
    };

    const candidates = [makeCandidate('candidate-B')];
    const result = await handler.evaluate({
      candidates,
      arbiterConfig: arbiterConfigWithKP,
      contractContext: {},
      aiProvider,
    });

    // Candidate blocked by key_principles → no survivor in cycle 1
    // After MAX_CYCLES exhausted → escalatedToHuman=true, allBlocked=true
    expect(result.escalatedToHuman).toBe(true);
    expect(result.allBlocked).toBe(true);

    // key_principles BLOCK verdict must be in verdicts
    const kpVerdicts = result.verdicts.filter((v) => v.arbiterId === 'key_principles');
    expect(kpVerdicts.length).toBeGreaterThan(0);
    expect(kpVerdicts[0]!.verdict).toBe('BLOCK');
  });

  it('test 3: buildKeyPrinciplesContext produces isolated context — role, DNA-3, P20 present; ironRules/ragPatterns absent', () => {
    const ctx = buildKeyPrinciplesContext({ code: '// some generated code' });

    // role must be key_principles
    expect(ctx.role).toBe('key_principles');

    // context must contain DNA-3 and P20
    expect(ctx.context).toContain('DNA-3');
    expect(ctx.context).toContain('P20');

    // context must NOT contain domain-specific or other arbiter fields
    expect(ctx.context).not.toContain('ironRules');
    expect(ctx.context).not.toContain('ragPatterns');
    expect(ctx.context).not.toContain('IRON RULES');
    expect(ctx.context).not.toContain('RETRIEVED RAG PATTERNS');
    expect(ctx.context).not.toContain('DOMAIN EVENTS');

    // code must be passed through
    expect(ctx.code).toBe('// some generated code');
  });
});

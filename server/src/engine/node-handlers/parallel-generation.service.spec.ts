import { ParallelGenerationService, GeneratorConfig } from './parallel-generation.service';

describe('ParallelGenerationService', () => {
  let service: ParallelGenerationService;

  beforeEach(() => {
    service = new ParallelGenerationService();
  });

  it('runs both providers and shuffles when two active providers succeed', async () => {
    const generators: GeneratorConfig[] = [
      { providerId: 'anthropic', modelToken: 'claude-3' },
      { providerId: 'openai', modelToken: 'gpt-4' },
    ];
    const providerMap = {
      anthropic: {
        generate: jest.fn().mockResolvedValue({ code: 'const a = 1;', model: 'claude-3' }),
      },
      openai: { generate: jest.fn().mockResolvedValue({ code: 'const b = 2;', model: 'gpt-4' }) },
    };

    const result = await service.generate({ prompt: 'generate service', generators, providerMap });

    expect(result.candidates).toHaveLength(2);
    expect(result.shuffleWasApplied).toBe(true);
    expect(result.isSingleProviderFallback).toBe(false);
    expect(result.activeProviderCount).toBe(2);
    // Labels should be A and B
    const labels = result.candidates.map((c) => c.label).sort();
    expect(labels).toEqual(['A', 'B']);
  });

  it('uses single-provider fallback when only 1 provider is active', async () => {
    const generators: GeneratorConfig[] = [
      { providerId: 'anthropic', modelToken: 'claude-3' },
      { providerId: 'openai', modelToken: 'gpt-4' },
    ];
    // Only anthropic in providerMap — openai is absent
    const providerMap = {
      anthropic: {
        generate: jest.fn().mockResolvedValue({ code: 'const x = 1;', model: 'claude-3' }),
      },
    };

    const result = await service.generate({ prompt: 'generate service', generators, providerMap });

    expect(result.candidates).toHaveLength(1);
    expect(result.shuffleWasApplied).toBe(false);
    expect(result.isSingleProviderFallback).toBe(true);
    expect(result.activeProviderCount).toBe(1);
    expect(result.candidates[0]!.label).toBe('A');
  });

  it('never throws when all providers fail — returns empty candidates', async () => {
    const generators: GeneratorConfig[] = [
      { providerId: 'anthropic', modelToken: 'claude-3' },
      { providerId: 'openai', modelToken: 'gpt-4' },
    ];
    const providerMap = {
      anthropic: { generate: jest.fn().mockRejectedValue(new Error('anthropic down')) },
      openai: { generate: jest.fn().mockRejectedValue(new Error('openai down')) },
    };

    // Must not throw
    const result = await service.generate({ prompt: 'generate service', generators, providerMap });

    expect(result.candidates).toHaveLength(0);
    expect(result.isSingleProviderFallback).toBe(true);
    expect(result.shuffleWasApplied).toBe(false);
  });
});

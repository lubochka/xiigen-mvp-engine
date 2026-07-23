/**
 * P4.1 — AI Engine Base Types + Model Catalog Tests.
 *
 * Verifies: AiProviderType enum, ModelProfile helpers, cost estimation,
 * capability checks, model catalog completeness, AiConfig defaults.
 */

import {
  AiProviderType,
  estimateCost,
  supportsCapability,
  modelProfileToDict,
  CLAUDE_OPUS,
  CLAUDE_SONNET,
  GPT_5,
  GEMINI_2_5_PRO,
  GROK_4,
  DEFAULT_MODEL_CATALOG,
  defaultAiConfig,
  getModel,
  getDefaultModel,
  listModels,
  listModelIds,
} from '../../src/fabrics/ai-engine/base';
import { AiModelRole } from '../../src/fabrics/interfaces/ai-provider.interface';

describe('P4.1 — AiProviderType enum', () => {
  it('should have all 5 provider types', () => {
    expect(AiProviderType.MOCK).toBe('mock');
    expect(AiProviderType.ANTHROPIC).toBe('anthropic');
    expect(AiProviderType.OPENAI).toBe('openai');
    expect(AiProviderType.GOOGLE).toBe('google');
    expect(AiProviderType.GROK).toBe('grok');
  });
});

describe('P4.1 — ModelProfile helpers', () => {
  describe('estimateCost', () => {
    it('should calculate cost for Claude Opus', () => {
      const cost = estimateCost(CLAUDE_OPUS, 1000, 500);
      // 1000 * 0.000015 + 500 * 0.000075 = 0.015 + 0.0375 = 0.0525
      expect(cost).toBeCloseTo(0.0525, 4);
    });

    it('should calculate cost for Claude Sonnet (cheaper)', () => {
      const cost = estimateCost(CLAUDE_SONNET, 1000, 500);
      // 1000 * 0.000003 + 500 * 0.000015 = 0.003 + 0.0075 = 0.0105
      expect(cost).toBeCloseTo(0.0105, 4);
    });

    it('should return 0 for zero tokens', () => {
      expect(estimateCost(CLAUDE_OPUS, 0, 0)).toBe(0);
    });
  });

  describe('supportsCapability', () => {
    it('should return true for supported capability', () => {
      expect(supportsCapability(CLAUDE_OPUS, 'vision')).toBe(true);
      expect(supportsCapability(CLAUDE_OPUS, 'structured_output')).toBe(true);
    });

    it('should return false for unsupported capability', () => {
      expect(supportsCapability(GPT_5, 'vision')).toBe(false);
    });

    it('should return false for unknown capability', () => {
      expect(supportsCapability(CLAUDE_OPUS, 'teleportation')).toBe(false);
    });
  });

  describe('modelProfileToDict', () => {
    it('should serialize ModelProfile to dict (DNA-1)', () => {
      const dict = modelProfileToDict(CLAUDE_SONNET);
      expect(dict['provider']).toBe('anthropic');
      expect(dict['model_id']).toBe('claude-sonnet-4-5');
      expect(dict['display_name']).toBe('Claude Sonnet 4.5');
      expect(dict['max_tokens']).toBe(8192);
      expect(dict['context_window']).toBe(200_000);
      expect(dict['role']).toBe('fast');
      expect(dict['version']).toBe('4.5');
      expect((dict['capabilities'] as any)['vision']).toBe(true);
    });

    it('should return a plain object copy (mutations safe)', () => {
      const dict = modelProfileToDict(CLAUDE_OPUS);
      (dict['capabilities'] as any)['hacked'] = true;
      expect(supportsCapability(CLAUDE_OPUS, 'hacked')).toBe(false);
    });
  });
});

describe('P4.1 — Pre-configured Model Catalog', () => {
  it('should contain 9 models', () => {
    expect(Object.keys(DEFAULT_MODEL_CATALOG).length).toBe(9);
  });

  it('should have Claude Opus as PRIMARY', () => {
    expect(CLAUDE_OPUS.role).toBe(AiModelRole.PRIMARY);
    expect(CLAUDE_OPUS.provider).toBe(AiProviderType.ANTHROPIC);
  });

  it('should have Claude Sonnet as FAST', () => {
    expect(CLAUDE_SONNET.role).toBe(AiModelRole.FAST);
  });

  it('should have GPT-5.2, Gemini, Grok as CROSS_VALIDATE', () => {
    expect(GPT_5.role).toBe(AiModelRole.CROSS_VALIDATE);
    expect(GEMINI_2_5_PRO.role).toBe(AiModelRole.CROSS_VALIDATE);
    expect(GROK_4.role).toBe(AiModelRole.CROSS_VALIDATE);
  });

  it('Gemini should have 1M context window', () => {
    expect(GEMINI_2_5_PRO.contextWindow).toBe(1_000_000);
  });

  it('all models should be keyed by modelId', () => {
    for (const [key, profile] of Object.entries(DEFAULT_MODEL_CATALOG)) {
      expect(key).toBe(profile.modelId);
    }
  });
});

describe('P4.1 — AiConfig', () => {
  describe('defaultAiConfig', () => {
    it('should have sensible defaults', () => {
      const config = defaultAiConfig();
      expect(config.defaultModel).toBe('claude-sonnet-4-5');
      expect(config.timeoutSeconds).toBe(30);
      expect(config.maxRetries).toBe(2);
      expect(Object.keys(config.models).length).toBe(9);
    });

    it('should accept overrides', () => {
      const config = defaultAiConfig({
        defaultModel: 'gpt-5.2',
        timeoutSeconds: 60,
      });
      expect(config.defaultModel).toBe('gpt-5.2');
      expect(config.timeoutSeconds).toBe(60);
      expect(Object.keys(config.models).length).toBe(9); // preserved
    });
  });

  describe('getModel', () => {
    it('should return profile for known model', () => {
      const config = defaultAiConfig();
      const model = getModel(config, 'claude-opus-4-5');
      expect(model).toBeDefined();
      expect(model!.displayName).toBe('Claude Opus 4.5');
    });

    it('should return undefined for unknown model', () => {
      const config = defaultAiConfig();
      expect(getModel(config, 'nonexistent')).toBeUndefined();
    });
  });

  describe('getDefaultModel', () => {
    it('should return the default model profile', () => {
      const config = defaultAiConfig();
      const model = getDefaultModel(config);
      expect(model).toBeDefined();
      expect(model!.modelId).toBe('claude-sonnet-4-5');
    });
  });

  describe('listModels', () => {
    it('should list all models', () => {
      const config = defaultAiConfig();
      expect(listModels(config).length).toBe(9);
    });

    it('should filter by role', () => {
      const config = defaultAiConfig();
      const crossValidate = listModels(config, AiModelRole.CROSS_VALIDATE);
      expect(crossValidate.length).toBe(3); // GPT-5, Gemini-2.5-pro, Grok-4
    });

    it('should filter PRIMARY models', () => {
      const config = defaultAiConfig();
      const primary = listModels(config, AiModelRole.PRIMARY);
      expect(primary.length).toBe(3); // Claude Opus, GPT-4.1, Gemini-2.5-flash
      expect(primary.some((m) => m.modelId === 'claude-opus-4-5')).toBe(true);
      expect(primary.some((m) => m.modelId === 'gpt-4.1')).toBe(true);
      expect(primary.some((m) => m.modelId === 'gemini-2.5-flash')).toBe(true);
    });
  });

  describe('listModelIds', () => {
    it('should list all model IDs', () => {
      const config = defaultAiConfig();
      const ids = listModelIds(config);
      expect(ids).toContain('claude-opus-4-5');
      expect(ids).toContain('gpt-5');
      expect(ids).toContain('gpt-4.1');
      expect(ids).toContain('gemini-2.5-pro');
      expect(ids).toContain('gemini-2.5-flash');
      expect(ids).toContain('gemini-2.5-flash-lite');
      expect(ids).toContain('grok-4');
      expect(ids).toContain('claude-haiku-4-5');
      expect(ids.length).toBe(9);
    });
  });
});

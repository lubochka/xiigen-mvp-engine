/**
 * P4.1 — AI Provider Registry Tests.
 *
 * Verifies: register, lookup, not-found, list, model profiles,
 * metadata, count, getAllProfiles.
 */

import { AiProviderRegistry } from '../../src/fabrics/ai-engine/provider-registry';
import {
  AiProviderType,
  CLAUDE_OPUS,
  CLAUDE_SONNET,
  GPT_5,
} from '../../src/fabrics/ai-engine/base';
import { DataProcessResult } from '../../src/kernel/data-process-result';

describe('AiProviderRegistry', () => {
  let registry: AiProviderRegistry;
  const dummyFactory = async () => ({}) as any;

  beforeEach(() => {
    registry = new AiProviderRegistry();
  });

  describe('register', () => {
    it('should register a provider and return success', () => {
      const result = registry.register(AiProviderType.MOCK, dummyFactory);
      expect(result.isSuccess).toBe(true);
      expect(registry.count).toBe(1);
    });

    it('should register multiple providers', () => {
      registry.register(AiProviderType.MOCK, dummyFactory);
      registry.register(AiProviderType.ANTHROPIC, dummyFactory);
      registry.register(AiProviderType.OPENAI, dummyFactory);
      registry.register(AiProviderType.GOOGLE, dummyFactory);
      registry.register(AiProviderType.GROK, dummyFactory);
      expect(registry.count).toBe(5);
    });

    it('should overwrite on re-register (idempotent)', () => {
      const factory2 = async () => ({ marker: 'new' }) as any;
      registry.register(AiProviderType.MOCK, dummyFactory);
      registry.register(AiProviderType.MOCK, factory2);
      expect(registry.count).toBe(1);
      expect(registry.getFactory(AiProviderType.MOCK).data).toBe(factory2);
    });

    it('should store model profiles when provided', () => {
      registry.register(AiProviderType.ANTHROPIC, dummyFactory, [CLAUDE_OPUS, CLAUDE_SONNET]);
      const profiles = registry.getProfiles(AiProviderType.ANTHROPIC);
      expect(profiles.length).toBe(2);
      expect(profiles[0].modelId).toBe('claude-opus-4-5');
    });

    it('should store metadata when provided', () => {
      registry.register(AiProviderType.OPENAI, dummyFactory, [], {
        description: 'OpenAI GPT provider',
      });
      const meta = registry.getMetadata(AiProviderType.OPENAI);
      expect(meta['description']).toBe('OpenAI GPT provider');
    });
  });

  describe('getFactory', () => {
    it('should return the registered factory', () => {
      registry.register(AiProviderType.ANTHROPIC, dummyFactory);
      const result = registry.getFactory(AiProviderType.ANTHROPIC);
      expect(result.isSuccess).toBe(true);
      expect(result.data).toBe(dummyFactory);
    });

    it('should return failure for unregistered provider', () => {
      const result = registry.getFactory(AiProviderType.GROK);
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('PROVIDER_NOT_FOUND');
      expect(result.errorMessage).toContain('grok');
    });

    it('should return DataProcessResult (DNA-3)', () => {
      expect(registry.getFactory('nonexistent')).toBeInstanceOf(DataProcessResult);
    });
  });

  describe('getProfiles', () => {
    it('should return empty array for provider with no profiles', () => {
      registry.register(AiProviderType.MOCK, dummyFactory);
      expect(registry.getProfiles(AiProviderType.MOCK)).toEqual([]);
    });

    it('should return empty array for unregistered provider', () => {
      expect(registry.getProfiles('nonexistent')).toEqual([]);
    });
  });

  describe('getAllProfiles', () => {
    it('should return profiles from all providers', () => {
      registry.register(AiProviderType.ANTHROPIC, dummyFactory, [CLAUDE_OPUS, CLAUDE_SONNET]);
      registry.register(AiProviderType.OPENAI, dummyFactory, [GPT_5]);
      const all = registry.getAllProfiles();
      expect(all.length).toBe(3);
    });

    it('should return empty for no registrations', () => {
      expect(registry.getAllProfiles()).toEqual([]);
    });
  });

  describe('listProviders', () => {
    it('should return empty array initially', () => {
      expect(registry.listProviders()).toEqual([]);
    });

    it('should list all registered types', () => {
      registry.register(AiProviderType.MOCK, dummyFactory);
      registry.register(AiProviderType.ANTHROPIC, dummyFactory);
      const list = registry.listProviders();
      expect(list).toContain(AiProviderType.MOCK);
      expect(list).toContain(AiProviderType.ANTHROPIC);
    });
  });

  describe('isRegistered', () => {
    it('should return true for registered', () => {
      registry.register(AiProviderType.MOCK, dummyFactory);
      expect(registry.isRegistered(AiProviderType.MOCK)).toBe(true);
    });

    it('should return false for unregistered', () => {
      expect(registry.isRegistered(AiProviderType.GROK)).toBe(false);
    });
  });
});

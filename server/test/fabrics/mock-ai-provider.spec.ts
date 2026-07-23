/**
 * Tests for Mock AI Provider — deterministic AI responses for testing.
 */

import { MockAiProvider } from '../../src/fabrics/ai-engine/mock.provider';
import { TenantContext, TENANT_CONTEXT_KEY, DEFAULT_PLAN } from '../../src/kernel';

function mockCls(tenantId?: string) {
  const tenant = tenantId
    ? new TenantContext({
        id: tenantId,
        name: `T-${tenantId}`,
        status: 'active',
        plan: { ...DEFAULT_PLAN },
        configOverrides: {},
        apiKeys: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    : undefined;
  return {
    get: jest
      .fn()
      .mockImplementation((key: string) => (key === TENANT_CONTEXT_KEY ? tenant : undefined)),
  } as any;
}

describe('MockAiProvider', () => {
  describe('generate', () => {
    it('should return default response', async () => {
      const ai = new MockAiProvider(mockCls('t1'));
      const result = await ai.generate('Hello world');
      expect(result.isSuccess).toBe(true);
      expect(result.data!['text']).toBe('Mock AI response');
      expect(result.data!['model']).toBe('mock-model-v1');
      expect(result.data!['request_id']).toBeDefined();
    });

    it('should return custom response', async () => {
      const ai = new MockAiProvider(mockCls('t1'), { defaultResponse: 'Custom reply' });
      const result = await ai.generate('Test');
      expect(result.data!['text']).toBe('Custom reply');
    });

    it('should use specified model', async () => {
      const ai = new MockAiProvider(mockCls('t1'));
      const result = await ai.generate('Test', { model: 'claude-opus' });
      expect(result.data!['model']).toBe('claude-opus');
    });

    it('should track token usage', async () => {
      const ai = new MockAiProvider(mockCls('t1'), { tokensPerResponse: 100 });
      const result = await ai.generate('A moderately long prompt for testing');
      const tokens = result.data!['tokens_used'] as Record<string, number>;
      expect(tokens['input']).toBeGreaterThan(0);
      expect(tokens['output']).toBe(100);
    });

    it('should track cost', async () => {
      const ai = new MockAiProvider(mockCls('t1'), { costPerCall: 0.05 });
      const result = await ai.generate('Test');
      expect(result.data!['cost']).toBe(0.05);
    });

    it('should fail when configured to fail', async () => {
      const ai = new MockAiProvider(mockCls('t1'), {
        shouldFail: true,
        failMessage: 'Rate limited',
      });
      const result = await ai.generate('Test');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('PROVIDER_ERROR');
      expect(result.errorMessage).toBe('Rate limited');
    });

    it('should work without tenant context', async () => {
      const ai = new MockAiProvider(mockCls());
      const result = await ai.generate('Test');
      expect(result.isSuccess).toBe(true);
    });
  });

  describe('generateStructured', () => {
    it('should return structured response', async () => {
      const ai = new MockAiProvider(mockCls('t1'), {
        structuredResponse: { items: [1, 2, 3], valid: true },
      });
      const result = await ai.generateStructured('Generate list', { type: 'array' });
      expect(result.isSuccess).toBe(true);
      expect((result.data!['data'] as any).items).toEqual([1, 2, 3]);
    });

    it('should reject empty schema', async () => {
      const ai = new MockAiProvider(mockCls('t1'));
      const result = await ai.generateStructured('Test', {});
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('INVALID_SCHEMA');
    });

    it('should fail when configured to fail', async () => {
      const ai = new MockAiProvider(mockCls('t1'), { shouldFail: true });
      const result = await ai.generateStructured('Test', { type: 'obj' });
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('PROVIDER_ERROR');
    });
  });

  describe('getModelInfo', () => {
    it('should return model metadata', () => {
      const ai = new MockAiProvider(mockCls('t1'));
      const info = ai.getModelInfo();
      expect(info['provider']).toBe('mock');
      expect(info['model_id']).toBe('mock-model-v1');
      expect(info['max_tokens']).toBe(4096);
      expect((info['capabilities'] as any).mock).toBe(true);
    });
  });

  describe('call tracking', () => {
    it('should track call count', async () => {
      const ai = new MockAiProvider(mockCls('t1'));
      expect(ai.callCount).toBe(0);
      await ai.generate('One');
      await ai.generate('Two');
      await ai.generateStructured('Three', { type: 'x' });
      expect(ai.callCount).toBe(3);
    });

    it('should record call history', async () => {
      const ai = new MockAiProvider(mockCls('t1'));
      await ai.generate('Test prompt', { systemPrompt: 'Be helpful', temperature: 0.5 });
      const history = ai.callHistory;
      expect(history.length).toBe(1);
      expect(history[0]['method']).toBe('generate');
      expect(history[0]['prompt']).toBe('Test prompt');
      expect(history[0]['system_prompt']).toBe('Be helpful');
      expect(history[0]['temperature']).toBe(0.5);
    });

    it('should filter calls by tenant', async () => {
      const ai = new MockAiProvider(mockCls('t1'));
      await ai.generate('Call 1');
      await ai.generate('Call 2');

      const t1Calls = ai.getCallsForTenant('t1');
      expect(t1Calls.length).toBe(2);

      const t2Calls = ai.getCallsForTenant('t2');
      expect(t2Calls.length).toBe(0);
    });

    it('should reset call history', async () => {
      const ai = new MockAiProvider(mockCls('t1'));
      await ai.generate('Test');
      ai.reset();
      expect(ai.callCount).toBe(0);
    });
  });

  describe('runtime configuration', () => {
    it('should change response dynamically', async () => {
      const ai = new MockAiProvider(mockCls('t1'));
      ai.setResponse('New response');
      const result = await ai.generate('Test');
      expect(result.data!['text']).toBe('New response');
    });

    it('should toggle failure mode', async () => {
      const ai = new MockAiProvider(mockCls('t1'));
      ai.setShouldFail(true, 'Temporary error');
      expect((await ai.generate('Test')).isSuccess).toBe(false);
      ai.setShouldFail(false);
      expect((await ai.generate('Test')).isSuccess).toBe(true);
    });
  });
});

import 'reflect-metadata';
import { KeyStatusController } from './key-status.controller';
import { DataProcessResult } from '../kernel/data-process-result';

function makeByokStore(keys: Record<string, string> | null) {
  return {
    readKeys: jest
      .fn()
      .mockResolvedValue(
        keys !== null
          ? DataProcessResult.success(keys)
          : DataProcessResult.failure('NOT_FOUND', 'no keys'),
      ),
  };
}

describe('KeyStatusController', () => {
  it('returns configured for each key that exists', async () => {
    const ctrl = new KeyStatusController(
      makeByokStore({
        anthropic: 'sk-ant-test',
        openai: 'sk-oai-test',
        gemini: 'AIza-test',
      }) as any,
    );
    const result = await ctrl.getKeyStatus('tenant-1');
    expect(result.providers.anthropic).toBe('configured');
    expect(result.providers.openai).toBe('configured');
    expect(result.providers.gemini).toBe('configured');
    expect(result.allConfigured).toBe(true);
    expect(result.configuredCount).toBe(3);
  });

  it('returns missing for absent keys', async () => {
    const ctrl = new KeyStatusController(makeByokStore({ anthropic: 'sk-ant-test' }) as any);
    const result = await ctrl.getKeyStatus('tenant-1');
    expect(result.providers.openai).toBe('missing');
    expect(result.providers.gemini).toBe('missing');
    expect(result.allConfigured).toBe(false);
    expect(result.configuredCount).toBe(1);
  });

  it('SECURITY: response never contains key values', async () => {
    const ctrl = new KeyStatusController(
      makeByokStore({ anthropic: 'sk-ant-REAL-SECRET-KEY' }) as any,
    );
    const result = await ctrl.getKeyStatus('tenant-1');
    expect(JSON.stringify(result)).not.toContain('sk-ant-REAL-SECRET-KEY');
  });

  it('DNA-3: readKeys failure → all missing (graceful degradation, no throw)', async () => {
    const ctrl = new KeyStatusController(makeByokStore(null) as any);
    const result = await ctrl.getKeyStatus('tenant-1');
    expect(result.providers.anthropic).toBe('missing');
    expect(result.allConfigured).toBe(false);
    // Must not throw
  });
});

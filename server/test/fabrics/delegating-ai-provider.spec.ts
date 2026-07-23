/**
 * DelegatingAiProvider — resolveProvider() hint logic tests.
 *
 * Covers the 6 cases from the plan:
 *   1. AI_PROVIDER=gemini + gemini wired          → gemini (hint wins)
 *   2. AI_PROVIDER=gemini + gemini null            → key-based fallback (anthropic if key set)
 *   3. AI_PROVIDER=openai + openai wired           → openai (hint wins)
 *   4. AI_PROVIDER=anthropic + anthropic key set   → anthropic (key-based, same result)
 *   5. AI_PROVIDER=<unknown>                       → key-based ordering
 *   6. AI_PROVIDER=gemini + anthropic key ALSO set → gemini WINS (critical: hint beats key)
 */

import { DelegatingAiProvider } from '../../src/fabrics/ai-engine/delegating-ai-provider';
import { IAiProvider } from '../../src/fabrics/interfaces/ai-provider.interface';
import { DataProcessResult } from '../../src/kernel/data-process-result';

// ── Minimal IAiProvider stub ────────────────────────────────────────────────

function makeProvider(providerName: string): IAiProvider {
  return {
    generate: jest
      .fn()
      .mockResolvedValue(DataProcessResult.success({ text: `${providerName} text` })),
    generateStructured: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    getModelInfo: jest
      .fn()
      .mockReturnValue({ provider: providerName, model: `${providerName}-model` }),
  } as unknown as IAiProvider;
}

// ── TenantKeyResolver stub ──────────────────────────────────────────────────

function makeKeyResolver(keys: Record<string, string | undefined>) {
  return { getKey: (k: string) => keys[k] ?? null } as any;
}

// ── Helper: build delegating provider ──────────────────────────────────────

function build(opts: {
  anthropicKey?: string;
  openaiKey?: string;
  googleKey?: string;
  openai?: IAiProvider | null;
  gemini?: IAiProvider | null;
}) {
  const anthropic = makeProvider('anthropic');
  const openai = opts.openai !== undefined ? opts.openai : makeProvider('openai');
  const gemini = opts.gemini !== undefined ? opts.gemini : makeProvider('google');
  const mock = makeProvider('mock');

  const keys: Record<string, string | undefined> = {};
  if (opts.anthropicKey) keys['anthropic'] = opts.anthropicKey;
  if (opts.openaiKey) keys['openai'] = opts.openaiKey;
  if (opts.googleKey) keys['google'] = opts.googleKey;

  const keyResolver = makeKeyResolver(keys);
  const provider = new DelegatingAiProvider(keyResolver, anthropic, openai, gemini, mock);

  return { provider, anthropic, openai, gemini, mock };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('DelegatingAiProvider — resolveProvider() hint logic', () => {
  const originalEnv = process.env['AI_PROVIDER'];

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env['AI_PROVIDER'];
    } else {
      process.env['AI_PROVIDER'] = originalEnv;
    }
  });

  it('case 1: AI_PROVIDER=gemini + gemini wired → gemini wins', async () => {
    process.env['AI_PROVIDER'] = 'gemini';
    const { provider, gemini } = build({ googleKey: 'gkey' });

    await provider.generate('test');

    expect((gemini!.generate as jest.Mock).mock.calls.length).toBe(1);
  });

  it('case 2: AI_PROVIDER=gemini + gemini null → falls back to key-based (anthropic key set)', async () => {
    process.env['AI_PROVIDER'] = 'gemini';
    const { provider, anthropic } = build({ gemini: null, anthropicKey: 'akey' });

    await provider.generate('test');

    expect((anthropic.generate as jest.Mock).mock.calls.length).toBe(1);
  });

  it('case 3: AI_PROVIDER=openai + openai wired → openai wins', async () => {
    process.env['AI_PROVIDER'] = 'openai';
    const { provider, openai, anthropic } = build({ openaiKey: 'okey', anthropicKey: 'akey' });

    await provider.generate('test');

    expect((openai!.generate as jest.Mock).mock.calls.length).toBe(1);
    expect((anthropic.generate as jest.Mock).mock.calls.length).toBe(0);
  });

  it('case 4: AI_PROVIDER=anthropic + anthropic key set → anthropic (key-based, same result)', async () => {
    process.env['AI_PROVIDER'] = 'anthropic';
    const { provider, anthropic } = build({ anthropicKey: 'akey' });

    await provider.generate('test');

    expect((anthropic.generate as jest.Mock).mock.calls.length).toBe(1);
  });

  it('case 5: AI_PROVIDER=<unknown> → key-based ordering (anthropic key → anthropic)', async () => {
    process.env['AI_PROVIDER'] = 'unknown-provider';
    const { provider, anthropic, gemini } = build({ anthropicKey: 'akey', googleKey: 'gkey' });

    await provider.generate('test');

    expect((anthropic.generate as jest.Mock).mock.calls.length).toBe(1);
    expect((gemini!.generate as jest.Mock).mock.calls.length).toBe(0);
  });

  it('case 6 (CRITICAL): AI_PROVIDER=gemini + anthropic key ALSO set → gemini wins, not anthropic', async () => {
    process.env['AI_PROVIDER'] = 'gemini';
    // Both keys set — this is exactly the original bug condition
    const { provider, gemini, anthropic } = build({ anthropicKey: 'akey', googleKey: 'gkey' });

    await provider.generate('test');

    expect((gemini!.generate as jest.Mock).mock.calls.length).toBe(1);
    expect((anthropic.generate as jest.Mock).mock.calls.length).toBe(0);
  });

  it('AI_PROVIDER=mock → mock, regardless of keys', async () => {
    process.env['AI_PROVIDER'] = 'mock';
    const { provider, mock, anthropic, gemini } = build({
      anthropicKey: 'akey',
      googleKey: 'gkey',
    });

    await provider.generate('test');

    expect((mock.generate as jest.Mock).mock.calls.length).toBe(1);
    expect((anthropic.generate as jest.Mock).mock.calls.length).toBe(0);
    expect((gemini!.generate as jest.Mock).mock.calls.length).toBe(0);
  });

  it('getModelInfo() delegates to resolved provider', () => {
    process.env['AI_PROVIDER'] = 'gemini';
    const { provider } = build({ googleKey: 'gkey' });

    const info = provider.getModelInfo();

    expect(info['provider']).toBe('google');
  });
});

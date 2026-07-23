/**
 * Stage 3 hooks — unit tests.
 * usePromptEditor, useRunTrace (static behaviour), useFlowLifecycle.
 */

import { renderHook, act } from '@testing-library/react';
import { usePromptEditor } from '../../src/hooks/usePromptEditor';
import { useFlowLifecycle, ALLOWED_TRANSITIONS } from '../../src/hooks/useFlowLifecycle';

// ── Mock apiClient ────────────────────────────────────────────────────────────

const mockGet  = jest.fn();
const mockPut  = jest.fn();
const mockPost = jest.fn();

jest.mock('../../src/api/client', () => ({
  apiClient: {
    get:  (...args: any[]) => mockGet(...args),
    put:  (...args: any[]) => mockPut(...args),
    post: (...args: any[]) => mockPost(...args),
    del:  jest.fn(),
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockGet.mockResolvedValue({ isSuccess: false, error: { message: 'not found' } });
  mockPut.mockResolvedValue({ isSuccess: true, data: {} });
  mockPost.mockResolvedValue({ isSuccess: true, data: {} });
});

// ── usePromptEditor ───────────────────────────────────────────────────────────

describe('usePromptEditor', () => {
  it('initialises with null prompt and not dirty', () => {
    const { result } = renderHook(() => usePromptEditor());
    expect(result.current.prompt).toBeNull();
    expect(result.current.dirty).toBe(false);
    expect(result.current.loading).toBe(false);
  });

  it('loadPrompt creates blank template when not found', async () => {
    const { result } = renderHook(() => usePromptEditor());
    await act(async () => {
      await result.current.loadPrompt('T47', 'generate');
    });
    expect(result.current.prompt?.taskTypeId).toBe('T47');
    expect(result.current.prompt?.promptType).toBe('generate');
    expect(result.current.prompt?.version).toBe('1.0.0');
    expect(result.current.dirty).toBe(false);
  });

  it('loadPrompt populates prompt when API returns data', async () => {
    mockGet.mockResolvedValueOnce({
      isSuccess: true,
      data: { promptId: 'p1', version: '2.1.0', content: 'Hello {{name}}', systemPrompt: 'Be helpful', active: true },
    });
    const { result } = renderHook(() => usePromptEditor());
    await act(async () => {
      await result.current.loadPrompt('T47', 'generate');
    });
    expect(result.current.prompt?.version).toBe('2.1.0');
    expect(result.current.prompt?.content).toBe('Hello {{name}}');
    expect(result.current.dirty).toBe(false);
  });

  it('updateContent marks dirty', async () => {
    mockGet.mockResolvedValueOnce({ isSuccess: true, data: { version: '1.0.0', content: 'old' } });
    const { result } = renderHook(() => usePromptEditor());
    await act(async () => { await result.current.loadPrompt('T47', 'generate'); });
    act(() => { result.current.updateContent('new content'); });
    expect(result.current.prompt?.content).toBe('new content');
    expect(result.current.dirty).toBe(true);
  });

  it('bumpVersion increments patch version and marks dirty', async () => {
    mockGet.mockResolvedValueOnce({ isSuccess: true, data: { version: '1.2.3', content: 'x' } });
    const { result } = renderHook(() => usePromptEditor());
    await act(async () => { await result.current.loadPrompt('T47', 'generate'); });
    act(() => { result.current.bumpVersion(); });
    expect(result.current.prompt?.version).toBe('1.2.4');
    expect(result.current.dirty).toBe(true);
  });

  it('savePrompt calls PUT endpoint and clears dirty', async () => {
    mockGet.mockResolvedValueOnce({ isSuccess: true, data: { version: '1.0.0', content: 'x' } });
    mockPut.mockResolvedValueOnce({ isSuccess: true, data: {} });
    const { result } = renderHook(() => usePromptEditor());
    await act(async () => { await result.current.loadPrompt('T47', 'generate'); });
    act(() => { result.current.updateContent('new'); });
    let saved = false;
    await act(async () => { saved = await result.current.savePrompt(); });
    expect(saved).toBe(true);
    expect(result.current.dirty).toBe(false);
    expect(mockPut).toHaveBeenCalledWith('promptUpsert', expect.objectContaining({
      pathParams: { taskTypeId: 'T47' },
    }));
  });

  it('savePrompt returns false when no prompt loaded', async () => {
    const { result } = renderHook(() => usePromptEditor());
    let saved = true;
    await act(async () => { saved = await result.current.savePrompt(); });
    expect(saved).toBe(false);
  });

  it('resetDirty sets dirty to false', async () => {
    mockGet.mockResolvedValueOnce({ isSuccess: true, data: { version: '1.0.0', content: 'x' } });
    const { result } = renderHook(() => usePromptEditor());
    await act(async () => { await result.current.loadPrompt('T47', 'generate'); });
    act(() => { result.current.updateContent('changed'); });
    expect(result.current.dirty).toBe(true);
    act(() => { result.current.resetDirty(); });
    expect(result.current.dirty).toBe(false);
  });
});

// ── useFlowLifecycle ──────────────────────────────────────────────────────────

describe('useFlowLifecycle', () => {
  it('initialises with null record', () => {
    const { result } = renderHook(() => useFlowLifecycle());
    expect(result.current.record).toBeNull();
    expect(result.current.allowedNext).toEqual([]);
  });

  it('loadStatus defaults to PENDING when not found', async () => {
    const { result } = renderHook(() => useFlowLifecycle());
    await act(async () => { await result.current.loadStatus('FLOW-01'); });
    expect(result.current.record?.status).toBe('PENDING');
    expect(result.current.record?.flowId).toBe('FLOW-01');
  });

  it('loadStatus populates record from API', async () => {
    mockGet.mockResolvedValueOnce({
      isSuccess: true,
      data: { flowId: 'FLOW-01', status: 'ACTIVE', updatedAt: '2026-03-24', updatedBy: 'alice' },
    });
    const { result } = renderHook(() => useFlowLifecycle());
    await act(async () => { await result.current.loadStatus('FLOW-01'); });
    expect(result.current.record?.status).toBe('ACTIVE');
    expect(result.current.allowedNext).toEqual(['DEPRECATED', 'FAILED']);
  });

  it('transition calls PUT and updates record', async () => {
    mockGet.mockResolvedValueOnce({
      isSuccess: true,
      data: { flowId: 'FLOW-01', status: 'PENDING', updatedAt: '', updatedBy: '' },
    });
    mockPut.mockResolvedValueOnce({
      isSuccess: true,
      data: { flowId: 'FLOW-01', status: 'ACTIVE', updatedAt: '2026-03-24', updatedBy: 'system' },
    });
    const { result } = renderHook(() => useFlowLifecycle());
    await act(async () => { await result.current.loadStatus('FLOW-01'); });
    let success = false;
    await act(async () => { success = await result.current.transition('ACTIVE'); });
    expect(success).toBe(true);
    expect(result.current.record?.status).toBe('ACTIVE');
  });

  it('transition returns false when no record loaded', async () => {
    const { result } = renderHook(() => useFlowLifecycle());
    let success = true;
    await act(async () => { success = await result.current.transition('ACTIVE'); });
    expect(success).toBe(false);
  });
});

// ── ALLOWED_TRANSITIONS export ────────────────────────────────────────────────

describe('ALLOWED_TRANSITIONS', () => {
  it('PENDING can go to ACTIVE and FAILED', () => {
    expect(ALLOWED_TRANSITIONS.PENDING).toContain('ACTIVE');
    expect(ALLOWED_TRANSITIONS.PENDING).toContain('FAILED');
  });

  it('ACTIVE can go to DEPRECATED and FAILED', () => {
    expect(ALLOWED_TRANSITIONS.ACTIVE).toContain('DEPRECATED');
    expect(ALLOWED_TRANSITIONS.ACTIVE).toContain('FAILED');
  });

  it('DEPRECATED is terminal', () => {
    expect(ALLOWED_TRANSITIONS.DEPRECATED).toEqual([]);
  });

  it('FAILED is terminal', () => {
    expect(ALLOWED_TRANSITIONS.FAILED).toEqual([]);
  });
});

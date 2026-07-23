/**
 * Unit tests for useRunFlow hook (Track 0 Turn 8).
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { successResult, failureResult } from '../../src/api/types';

const mockGet = jest.fn();
const mockPost = jest.fn();

jest.mock('../../src/api/client', () => ({
  apiClient: {
    get: mockGet,
    post: mockPost,
    put: jest.fn(),
    del: jest.fn(),
    configure: jest.fn(),
    getConfig: jest.fn(() => ({ defaultTenantId: 'system' })),
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
});

import { useRunFlow } from '../../src/hooks/useRunFlow';

describe('useRunFlow', () => {
  it('starts idle — not loading, no result, no error', () => {
    const { result } = renderHook(() => useRunFlow());
    expect(result.current.loading).toBe(false);
    expect(result.current.result).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('surfaces error when userIntent is empty', async () => {
    const { result } = renderHook(() => useRunFlow());
    await act(async () => {
      const r = await result.current.run({ userIntent: '' });
      expect(r).toBeNull();
    });
    expect(result.current.error).toBe('userIntent is required');
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('calls cycleChainRun endpoint with userIntent body', async () => {
    mockPost.mockResolvedValueOnce(
      successResult({
        runId: 'run-001',
        flowId: 'FLOW-CHAIN-ABC',
        grade: 9,
        totalCostUsd: 0.1,
        topology: [],
        planSteps: [],
      }),
    );
    const { result } = renderHook(() => useRunFlow());

    await act(async () => {
      await result.current.run({ userIntent: 'Build a registration system' });
    });

    expect(mockPost).toHaveBeenCalledWith(
      'cycleChainRun',
      expect.objectContaining({
        body: expect.objectContaining({ userIntent: 'Build a registration system' }),
      }),
    );
    expect(result.current.result?.flowId).toBe('FLOW-CHAIN-ABC');
    expect(result.current.error).toBeNull();
  });

  it('surfaces server error message', async () => {
    mockPost.mockResolvedValueOnce(failureResult('CYCLE_CHAIN_FAILED', 'model timeout'));
    const { result } = renderHook(() => useRunFlow());

    await act(async () => {
      await result.current.run({ userIntent: 'x' });
    });

    expect(result.current.result).toBeNull();
    expect(result.current.error).toBe('model timeout');
  });

  it('reset() clears result + error', async () => {
    mockPost.mockResolvedValueOnce(
      successResult({ runId: 'r', flowId: 'f', grade: 5, totalCostUsd: 0 }),
    );
    const { result } = renderHook(() => useRunFlow());
    await act(async () => {
      await result.current.run({ userIntent: 'x' });
    });
    expect(result.current.result).not.toBeNull();

    act(() => {
      result.current.reset();
    });
    expect(result.current.result).toBeNull();
    expect(result.current.error).toBeNull();
  });
});

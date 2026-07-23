/**
 * Unit tests for useFlowLibrary hook (Track 0 Turn 6).
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

import { useFlowLibrary } from '../../src/hooks/useFlowLibrary';

describe('useFlowLibrary', () => {
  it('loads flows on mount and returns them', async () => {
    mockGet.mockResolvedValueOnce(
      successResult({
        flows: [
          {
            flow_id: 'FLOW-A',
            name: 'Flow A',
            version: 'v1',
            status: 'PUBLISHED',
            knowledge_scope: 'PRIVATE',
            node_count: 3,
            created_at: 'now',
            updated_at: 'now',
          },
        ],
      }),
    );

    const { result } = renderHook(() => useFlowLibrary());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.flows).toHaveLength(1);
    expect(result.current.flows[0].flow_id).toBe('FLOW-A');
    expect(result.current.error).toBeNull();
  });

  it('surfaces error when fetch fails', async () => {
    mockGet.mockResolvedValueOnce(failureResult('NETWORK_ERROR', 'upstream failure'));

    const { result } = renderHook(() => useFlowLibrary());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.flows).toHaveLength(0);
    expect(result.current.error).toBe('upstream failure');
  });

  it('fork() calls flowDefinitionFork endpoint and refreshes', async () => {
    mockGet.mockResolvedValue(successResult({ flows: [] }));
    mockPost.mockResolvedValueOnce(successResult({ flow_id: 'FLOW-FORK-12345678' }));

    const { result } = renderHook(() => useFlowLibrary());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      const newId = await result.current.fork('FLOW-GLOBAL');
      expect(newId).toBe('FLOW-FORK-12345678');
    });

    expect(mockPost).toHaveBeenCalledWith('flowDefinitionFork', expect.objectContaining({
      pathParams: { flowId: 'FLOW-GLOBAL' },
    }));
  });

  it('refresh() reloads the list', async () => {
    mockGet
      .mockResolvedValueOnce(successResult({ flows: [] }))
      .mockResolvedValueOnce(
        successResult({
          flows: [
            {
              flow_id: 'FLOW-NEW',
              name: 'New',
              version: 'v1',
              status: 'DRAFT',
              knowledge_scope: 'PRIVATE',
              node_count: 1,
              created_at: 'now',
              updated_at: 'now',
            },
          ],
        }),
      );

    const { result } = renderHook(() => useFlowLibrary());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.flows).toHaveLength(0);

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.flows).toHaveLength(1);
    expect(result.current.flows[0].flow_id).toBe('FLOW-NEW');
  });
});

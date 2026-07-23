/**
 * Hook Unit Tests — All 8 hooks (renderHook)
 *
 * Tests: loading state, success state, error state, refresh/select.
 * All API calls mocked via jest.mock at module level.
 *
 * Why: Previously all 8 hooks were only type-imported in component tests.
 * The actual fetch/loading/error behavior was completely untested.
 *
 * @testing-library/react v16 — renderHook is built-in.
 *
 * Write-time fixes vs plan:
 *   WF-1: useFlowDefinition starts loading: false (lazy hook, no auto-fetch)
 *   WF-2: useLearningData.ts exports useModelPerformance, not useLearningData
 *   WF-3: useGenerationHistory starts loading: false, generating: false (no auto-fetch)
 *   WF-4: useFlowRuns / useTenants — result.data is array (not {runs:[]}), snake_case keys
 *   WF-5: useRegistryData — two mockGet calls; use mockResolvedValueOnce for each
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { successResult, failureResult } from '../../src/api/types';

// ── Mock apiClient (must be before hook imports) ──────

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

// ── Hook imports (after mock) ─────────────────────────

import {
  useBootstrapStatus,
  BOOTSTRAP_PHASES,
} from '../../src/hooks/useBootstrapStatus';
import { useFlowRuns } from '../../src/hooks/useFlowRuns';
import { useRegistryData } from '../../src/hooks/useRegistryData';
import { useTenants } from '../../src/hooks/useTenants';
import { useFlowDefinition } from '../../src/hooks/useFlowDefinition';
import { useFreedomConfig } from '../../src/hooks/useFreedomConfig';
import { useGenerationHistory } from '../../src/hooks/useGenerationHistory';
import { useModelPerformance } from '../../src/hooks/useLearningData'; // WF-2: no useLearningData export

// ══════════════════════════════════════════════════════
// useBootstrapStatus
// ══════════════════════════════════════════════════════

describe('useBootstrapStatus', () => {
  it('should start with loading: true, data: null, error: null', () => {
    mockGet.mockResolvedValue(successResult({
      status: 'HEALTHY', healthy: 6, down: 0, fabrics: {}, phase_results: {},
    }));
    const { result } = renderHook(() => useBootstrapStatus('t1'));
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should set data on success', async () => {
    mockGet.mockResolvedValue(successResult({
      status: 'HEALTHY', healthy: 6, down: 0, fabrics: {}, phase_results: {},
    }));
    const { result } = renderHook(() => useBootstrapStatus('t1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).not.toBeNull();
    expect(result.current.data!.healthStatus).toBe('HEALTHY');
    expect(result.current.data!.isHealthy).toBe(true);
    expect(result.current.data!.healthyCount).toBe(6);
    expect(result.current.error).toBeNull();
  });

  it('should set error on failure response', async () => {
    mockGet.mockResolvedValue(failureResult('HEALTH_ERROR', 'Engine not ready'));
    const { result } = renderHook(() => useBootstrapStatus('t1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeTruthy();
    expect(result.current.data).toBeNull();
  });

  it('should refresh when refresh() is called', async () => {
    mockGet
      .mockResolvedValueOnce(successResult({ status: 'DEGRADED', healthy: 4, down: 2, fabrics: {} }))
      .mockResolvedValueOnce(successResult({ status: 'HEALTHY', healthy: 6, down: 0, fabrics: {} }));

    const { result } = renderHook(() => useBootstrapStatus('t1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data!.healthStatus).toBe('DEGRADED');

    act(() => { result.current.refresh(); });
    await waitFor(() => expect(result.current.data!.healthStatus).toBe('HEALTHY'));
  });

  it('BOOTSTRAP_PHASES should have 7 entries including database and ai_engine', () => {
    expect(BOOTSTRAP_PHASES).toHaveLength(7);
    expect(BOOTSTRAP_PHASES).toContain('database');
    expect(BOOTSTRAP_PHASES).toContain('ai_engine');
    expect(BOOTSTRAP_PHASES).toContain('rag');
  });
});

// ══════════════════════════════════════════════════════
// useFlowRuns
// WF-4: result.data is an array; field names are snake_case in API response
// ══════════════════════════════════════════════════════

describe('useFlowRuns', () => {
  it('should start with loading: true and empty runs array', () => {
    mockGet.mockResolvedValue(successResult([]));
    const { result } = renderHook(() => useFlowRuns('t1'));
    expect(result.current.loading).toBe(true);
    expect(result.current.runs).toEqual([]);
  });

  it('should populate runs on success', async () => {
    // WF-4: API returns array with snake_case keys; hook maps to camelCase
    mockGet.mockResolvedValue(successResult([
      { contract_id: 'T44', tenant_id: 't1', success: true, elapsed_ms: 120 },
      { contract_id: 'T45', tenant_id: 't1', success: false, elapsed_ms: 85 },
    ]));
    const { result } = renderHook(() => useFlowRuns('t1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.runs).toHaveLength(2);
    expect(result.current.runs[0].contractId).toBe('T44');
    expect(result.current.error).toBeNull();
  });

  it('should selectRun / clear selection', async () => {
    mockGet.mockResolvedValue(successResult([])); // WF-4: array
    const { result } = renderHook(() => useFlowRuns('t1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const run = { contractId: 'T44', tenantId: 't1', success: true, elapsedMs: 50 };
    act(() => { result.current.selectRun(run); });
    expect(result.current.selectedRun).toEqual(run);

    act(() => { result.current.selectRun(null); });
    expect(result.current.selectedRun).toBeNull();
  });

  it('should set error on API failure', async () => {
    mockGet.mockResolvedValue(failureResult('RUNS_ERROR', 'History unavailable'));
    const { result } = renderHook(() => useFlowRuns('t1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeTruthy();
  });
});

// ══════════════════════════════════════════════════════
// useRegistryData
// WF-5: makes two API calls — use mockResolvedValueOnce for each
// ══════════════════════════════════════════════════════

describe('useRegistryData', () => {
  it('should start with loading: true and null counts', () => {
    // WF-5: first call = engineStatus (object ok), second = engineContracts (must be array)
    mockGet
      .mockResolvedValueOnce(successResult({}))
      .mockResolvedValueOnce(successResult([]));
    const { result } = renderHook(() => useRegistryData('t1'));
    expect(result.current.loading).toBe(true);
    expect(result.current.counts).toBeNull();
  });

  it('should set error on failure', async () => {
    mockGet.mockResolvedValue(failureResult('REGISTRY_ERROR', 'Registry unavailable'));
    const { result } = renderHook(() => useRegistryData('t1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeTruthy();
  });
});

// ══════════════════════════════════════════════════════
// useTenants
// WF-4: result.data is array of tenant records (not {tenants: []})
// ══════════════════════════════════════════════════════

describe('useTenants', () => {
  it('should start with loading: true and empty tenants array', () => {
    mockGet.mockResolvedValue(successResult([])); // WF-4: array
    const { result } = renderHook(() => useTenants());
    expect(result.current.loading).toBe(true);
    expect(result.current.tenants).toEqual([]);
  });

  it('should load tenants on success', async () => {
    // WF-4: API returns array directly; parseTenant maps fields
    mockGet.mockResolvedValue(successResult([
      { id: 't1', name: 'Alpha', status: 'active', createdAt: '', plan: {}, configOverrides: {}, apiKeys: {} },
      { id: 't2', name: 'Beta', status: 'active', createdAt: '', plan: {}, configOverrides: {}, apiKeys: {} },
    ]));
    const { result } = renderHook(() => useTenants());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.tenants).toHaveLength(2);
    expect(result.current.tenants[0].name).toBe('Alpha');
  });

  it('should allow selectTenant and clear', async () => {
    mockGet.mockResolvedValue(successResult([])); // WF-4: array
    const { result } = renderHook(() => useTenants());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const t = { id: 'tx', name: 'Test', status: 'active' as const, createdAt: '', plan: {}, configOverrides: {}, apiKeys: {} };
    act(() => { result.current.selectTenant(t); });
    expect(result.current.selectedTenant?.id).toBe('tx');

    act(() => { result.current.selectTenant(null); });
    expect(result.current.selectedTenant).toBeNull();
  });
});

// ══════════════════════════════════════════════════════
// useFlowDefinition
// WF-1: starts with loading: false — lazy hook, no auto-fetch
//       loadFlow() must be called explicitly to trigger fetch
// ══════════════════════════════════════════════════════

describe('useFlowDefinition', () => {
  it('should start with loading: false (lazy — no auto-fetch)', () => {
    // WF-1: loading starts false, load triggered by loadFlow()
    const { result } = renderHook(() => useFlowDefinition('t1'));
    expect(result.current.loading).toBe(false);
    expect(result.current.flow).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should set error when loadFlow fails', async () => {
    // WF-1: trigger fetch explicitly via loadFlow()
    mockGet.mockResolvedValue(failureResult('NOT_FOUND', 'No flows'));
    const { result } = renderHook(() => useFlowDefinition('t1'));

    act(() => { result.current.loadFlow('flow-123'); });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeTruthy();
  });
});

// ══════════════════════════════════════════════════════
// useFreedomConfig
// ══════════════════════════════════════════════════════

describe('useFreedomConfig', () => {
  it('should start with loading: true', () => {
    mockGet.mockResolvedValue(successResult({}));
    const { result } = renderHook(() => useFreedomConfig('t1'));
    expect(result.current.loading).toBe(true);
  });

  it('should set error on failure', async () => {
    mockGet.mockResolvedValue(failureResult('CONFIG_ERROR', 'Config unavailable'));
    const { result } = renderHook(() => useFreedomConfig('t1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeTruthy();
  });
});

// ══════════════════════════════════════════════════════
// useGenerationHistory
// WF-3: starts loading: false, generating: false — no auto-fetch
//       fetchHistory() must be called explicitly
// ══════════════════════════════════════════════════════

describe('useGenerationHistory', () => {
  it('should start with loading: false, generating: false (no auto-fetch)', () => {
    // WF-3: no useEffect fetch — lazy hook
    const { result } = renderHook(() => useGenerationHistory());
    expect(result.current.loading).toBe(false);
    expect(result.current.generating).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should load history and resolve loading when fetchHistory is called', async () => {
    // WF-3: trigger fetch explicitly; API returns array
    mockGet.mockResolvedValue(successResult([]));
    const { result } = renderHook(() => useGenerationHistory());

    act(() => { result.current.fetchHistory(); });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeNull();
  });
});

// ══════════════════════════════════════════════════════
// useModelPerformance (from useLearningData.ts)
// WF-2: useLearningData.ts exports useModelPerformance + usePromptVersions
//       Both are in-memory with sample data — no API calls, no mock needed
// ══════════════════════════════════════════════════════

describe('useModelPerformance (in-memory, no API)', () => {
  it('should start with loading: false — uses in-memory sample data', () => {
    // WF-2: in-memory hook, no network calls, loading is always false
    const { result } = renderHook(() => useModelPerformance());
    expect(result.current.loading).toBe(false);
  });

  it('should return pre-loaded scores and task types without network call', () => {
    const { result } = renderHook(() => useModelPerformance());
    expect(result.current.scores.length).toBeGreaterThan(0);
    expect(result.current.taskTypes.length).toBeGreaterThan(0);
  });
});

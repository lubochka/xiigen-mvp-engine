/**
 * useRunFlow — submits a user intent to POST /api/cycle-chain/run and tracks the result.
 *
 * Introduced by Track 0 Turn 8.
 *
 * Backing endpoint: CycleChainController (server/src/api/cycle-chain.controller.ts).
 * Server response shape: { ...CycleChainOutput, analysis }
 *   — see server/src/engine/cycle-chain.service.ts for full fields.
 */

import { useCallback, useState } from 'react';
import { apiClient } from '../api/client';

export interface CycleChainRunBody {
  userIntent: string;
  domain?: string;
  constraints?: string[];
  priorArtQuery?: string;
  flowId?: string;
  terminationDepth?: number;
}

export interface CycleChainRunResult {
  runId: string;
  flowId: string;
  grade: number;
  totalCostUsd: number;
  planSteps?: Array<{ index: number; text: string; intClause: string }>;
  topology?: Array<{ stepText: string; verdict: string; depth: number }>;
  status?: string;
  analysis?: Record<string, unknown>;
}

export interface UseRunFlowReturn {
  result: CycleChainRunResult | null;
  loading: boolean;
  error: string | null;
  run: (body: CycleChainRunBody) => Promise<CycleChainRunResult | null>;
  reset: () => void;
}

export function useRunFlow(tenantId = 'system'): UseRunFlowReturn {
  const [result, setResult] = useState<CycleChainRunResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (body: CycleChainRunBody): Promise<CycleChainRunResult | null> => {
      if (!body.userIntent || !body.userIntent.trim()) {
        setError('userIntent is required');
        return null;
      }
      setLoading(true);
      setError(null);
      const apiResult = await apiClient.post<CycleChainRunResult>('cycleChainRun', {
        tenantId,
        body: body as unknown as Record<string, unknown>,
      });
      setLoading(false);
      if (apiResult.isSuccess && apiResult.data) {
        setResult(apiResult.data);
        return apiResult.data;
      }
      setError(apiResult.error?.message ?? 'Run failed');
      return null;
    },
    [tenantId],
  );

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { result, loading, error, run, reset };
}

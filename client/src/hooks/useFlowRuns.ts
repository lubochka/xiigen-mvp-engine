/**
 * useFlowRuns — fetches generation run history from the engine.
 * Translated from React Native. Uses P9 engine history endpoint.
 */

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/client';
import type { EngineDocument } from '../api/types';

export interface FlowRun {
  contractId: string;
  tenantId: string;
  success: boolean;
  elapsedMs: number;
  flowId?: string;
  promotionLevel?: string;
  pipelinePassed?: boolean;
  stages?: Array<{ stage: string; success: boolean; elapsedMs: number }>;
  errors?: string[];
  warnings?: string[];
}

export interface UseFlowRunsReturn {
  runs: FlowRun[];
  selectedRun: FlowRun | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  selectRun: (run: FlowRun | null) => void;
}

export function useFlowRuns(tenantId = 'system'): UseFlowRunsReturn {
  const [runs, setRuns] = useState<FlowRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<FlowRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRuns = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await apiClient.get<EngineDocument[]>('engineHistory', { tenantId });

    if (result.isSuccess && result.data) {
      const parsed: FlowRun[] = (result.data as Record<string, unknown>[]).map((r) => ({
        contractId: (r.contract_id as string) ?? '',
        tenantId: (r.tenant_id as string) ?? '',
        success: (r.success as boolean) ?? false,
        elapsedMs: (r.elapsed_ms as number) ?? 0,
        flowId: r.flow_id as string | undefined,
        promotionLevel: r.promotion_level as string | undefined,
        pipelinePassed: r.pipeline_passed as boolean | undefined,
        stages: r.stages as FlowRun['stages'],
        errors: r.errors as string[] | undefined,
        warnings: r.warnings as string[] | undefined,
      }));
      setRuns(parsed);
    } else {
      setError(result.error?.message ?? 'Failed to fetch runs');
    }

    setLoading(false);
  }, [tenantId]);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  return { runs, selectedRun, loading, error, refresh: fetchRuns, selectRun: setSelectedRun };
}

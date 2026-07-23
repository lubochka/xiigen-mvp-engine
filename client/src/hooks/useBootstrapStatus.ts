/**
 * useBootstrapStatus — fetches bootstrap/health status from the engine.
 * Translated from React Native. Uses P9 health endpoints.
 */

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/client';
import type { EngineDocument, HealthStatus, BootstrapPhase } from '../api/types';

export const BOOTSTRAP_PHASES: readonly BootstrapPhase[] = [
  'secrets',
  'config',
  'database',
  'queue',
  'ai_engine',
  'rag',
  'flow_engine',
];

export interface BootstrapStatusData {
  healthStatus: HealthStatus;
  phases: Record<string, { status: string; details?: Record<string, unknown> }>;
  phaseCount: number;
  healthyCount: number;
  downCount: number;
  fabrics: Record<string, Record<string, unknown>>;
  isHealthy: boolean;
}

export interface UseBootstrapStatusReturn {
  data: BootstrapStatusData | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useBootstrapStatus(tenantId = 'system'): UseBootstrapStatusReturn {
  const [data, setData] = useState<BootstrapStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await apiClient.get<EngineDocument>('healthStatus', { tenantId });

    if (result.isSuccess && result.data) {
      const raw = result.data;
      const fabrics = (raw.fabrics as Record<string, Record<string, unknown>>) ?? {};
      const healthyCount = (raw.healthy as number) ?? 0;
      const downCount = (raw.down as number) ?? 0;

      setData({
        healthStatus: (raw.status as HealthStatus) ?? 'UNKNOWN',
        phases: (raw.phase_results as Record<string, { status: string }>) ?? {},
        phaseCount: BOOTSTRAP_PHASES.length,
        healthyCount,
        downCount,
        fabrics,
        isHealthy: raw.status === 'HEALTHY',
      });
    } else {
      setError(result.error?.message ?? 'Failed to fetch health status');
    }

    setLoading(false);
  }, [tenantId]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return { data, loading, error, refresh: fetchStatus };
}

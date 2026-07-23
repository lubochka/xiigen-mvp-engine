/**
 * useRunTrace — polls GET /api/runs/:runId/trace while status is RUNNING.
 *
 * Stops polling when status reaches PASS, FAIL, or HELD.
 * Poll interval: 2 seconds (configurable).
 *
 * Stage 3.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { apiClient } from '../api/client';

export interface NodeTrace {
  nodeId: string;
  nodeType: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  score?: number;
  durationMs: number;
  errorCode?: string;
  output?: Record<string, unknown>;
}

export interface RunTrace {
  runId: string;
  flowId: string;
  taskTypeId: string;
  tenantId: string;
  status: 'RUNNING' | 'PASS' | 'FAIL' | 'HELD';
  score?: number;
  nodes: NodeTrace[];
  startedAt: string;
  completedAt?: string;
}

export interface UseRunTraceReturn {
  trace: RunTrace | null;
  loading: boolean;
  error: string | null;
  polling: boolean;
  loadTrace: (runId: string) => Promise<void>;
  startPolling: (runId: string, intervalMs?: number) => void;
  stopPolling: () => void;
}

const TERMINAL_STATUSES = new Set(['PASS', 'FAIL', 'HELD']);

export function useRunTrace(tenantId = 'system'): UseRunTraceReturn {
  const [trace, setTrace] = useState<RunTrace | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchTrace = useCallback(
    async (runId: string): Promise<RunTrace | null> => {
      const result = await apiClient.get<Record<string, unknown>>('runTrace', {
        tenantId,
        pathParams: { runId },
      });
      if (result.isSuccess && result.data) {
        const d = result.data;
        const parsed: RunTrace = {
          runId: (d['runId'] as string) ?? runId,
          flowId: (d['flowId'] as string) ?? '',
          taskTypeId: (d['taskTypeId'] as string) ?? '',
          tenantId: (d['tenantId'] as string) ?? tenantId,
          status: (d['status'] as RunTrace['status']) ?? 'RUNNING',
          score: d['score'] as number | undefined,
          nodes: ((d['nodes'] as Record<string, unknown>[]) ?? []).map(
            (n: Record<string, unknown>) => ({
              nodeId: (n['nodeId'] as string) ?? '',
              nodeType: (n['nodeType'] as string) ?? '',
              status: (n['status'] as 'PASS' | 'FAIL' | 'SKIP') ?? 'SKIP',
              score: n['score'] as number | undefined,
              durationMs: (n['durationMs'] as number) ?? 0,
              errorCode: n['errorCode'] as string | undefined,
              output: n['output'] as Record<string, unknown> | undefined,
            }),
          ),
          startedAt: (d['startedAt'] as string) ?? '',
          completedAt: d['completedAt'] as string | undefined,
        };
        return parsed;
      }
      return null;
    },
    [tenantId],
  );

  const loadTrace = useCallback(
    async (runId: string) => {
      setLoading(true);
      setError(null);
      const result = await fetchTrace(runId);
      if (result) {
        setTrace(result);
      } else {
        setError('Trace not found');
      }
      setLoading(false);
    },
    [fetchTrace],
  );

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setPolling(false);
  }, []);

  const startPolling = useCallback(
    (runId: string, intervalMs = 2000) => {
      stopPolling();
      setPolling(true);

      const poll = async () => {
        const result = await fetchTrace(runId);
        if (result) {
          setTrace(result);
          if (TERMINAL_STATUSES.has(result.status)) {
            stopPolling();
          }
        }
      };

      // Fetch immediately then set interval
      poll();
      intervalRef.current = setInterval(poll, intervalMs);
    },
    [fetchTrace, stopPolling],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return { trace, loading, error, polling, loadTrace, startPolling, stopPolling };
}

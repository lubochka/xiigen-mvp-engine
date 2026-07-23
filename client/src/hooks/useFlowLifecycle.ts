/**
 * useFlowLifecycle — load and transition flow lifecycle status.
 *
 * Wired to Stage 3 lifecycle endpoints:
 *   GET /api/lifecycle/flows/:flowId  — load current status
 *   PUT /api/lifecycle/flows/:flowId  — CAS transition
 *
 * Stage 3.
 */

import { useState, useCallback } from 'react';
import { apiClient } from '../api/client';

export type LifecycleStatus = 'PENDING' | 'ACTIVE' | 'DEPRECATED' | 'FAILED';

export interface FlowLifecycleRecord {
  flowId: string;
  status: LifecycleStatus;
  updatedAt: string;
  updatedBy: string;
}

/** Allowed forward transitions (mirrors server-side ALLOWED_TRANSITIONS). */
export const ALLOWED_TRANSITIONS: Record<LifecycleStatus, LifecycleStatus[]> = {
  PENDING: ['ACTIVE', 'FAILED'],
  ACTIVE: ['DEPRECATED', 'FAILED'],
  DEPRECATED: [],
  FAILED: [],
};

export interface UseFlowLifecycleReturn {
  record: FlowLifecycleRecord | null;
  loading: boolean;
  error: string | null;
  loadStatus: (flowId: string) => Promise<void>;
  transition: (
    toStatus: LifecycleStatus,
    expectedStatus?: LifecycleStatus,
    reason?: string,
  ) => Promise<boolean>;
  allowedNext: LifecycleStatus[];
}

export function useFlowLifecycle(tenantId = 'system'): UseFlowLifecycleReturn {
  const [record, setRecord] = useState<FlowLifecycleRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(
    async (flowId: string) => {
      setLoading(true);
      setError(null);
      const result = await apiClient.get<Record<string, unknown>>('lifecycleGet', {
        tenantId,
        pathParams: { flowId },
      });
      if (result.isSuccess && result.data) {
        const d = result.data;
        setRecord({
          flowId: (d['flowId'] as string) ?? flowId,
          status: (d['status'] as LifecycleStatus) ?? 'PENDING',
          updatedAt: (d['updatedAt'] as string) ?? '',
          updatedBy: (d['updatedBy'] as string) ?? 'system',
        });
      } else {
        // Flow not yet tracked — default PENDING
        setRecord({ flowId, status: 'PENDING', updatedAt: '', updatedBy: '' });
      }
      setLoading(false);
    },
    [tenantId],
  );

  const transition = useCallback(
    async (
      toStatus: LifecycleStatus,
      expectedStatus?: LifecycleStatus,
      reason?: string,
    ): Promise<boolean> => {
      if (!record) return false;
      setLoading(true);
      setError(null);
      const result = await apiClient.put<Record<string, unknown>>('lifecycleUpdate', {
        tenantId,
        pathParams: { flowId: record.flowId },
        body: {
          status: toStatus,
          expectedStatus,
          reason,
          updatedBy: tenantId,
        },
      });
      setLoading(false);
      if (result.isSuccess && result.data) {
        const d = result.data;
        setRecord({
          flowId: record.flowId,
          status: (d['status'] as LifecycleStatus) ?? toStatus,
          updatedAt: (d['updatedAt'] as string) ?? new Date().toISOString(),
          updatedBy: (d['updatedBy'] as string) ?? tenantId,
        });
        return true;
      }
      setError(result.error?.message ?? 'Transition failed');
      return false;
    },
    [record, tenantId],
  );

  const allowedNext: LifecycleStatus[] = record ? (ALLOWED_TRANSITIONS[record.status] ?? []) : [];

  return { record, loading, error, loadStatus, transition, allowedNext };
}

/**
 * useTenantFlows — admin reads of a target tenant's flow topologies.
 *
 * Introduced by Turn 4 (MVP Plan v3, Goal 3).
 *
 * Server endpoint: GET /api/tenants/:id/flows
 *                  backed by TenantTopologyStore.listByTenant
 *                  (requires MASTER_TENANT_ID caller context, writes
 *                  xiigen-admin-audit record on every call).
 *
 * The hook is passive: when targetTenantId is null, nothing is fetched. When
 * a tenant is selected, the hook re-queries and returns the summary list.
 */

import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import type { FlowLibraryEntry } from './useFlowLibrary';

export interface UseTenantFlowsReturn {
  flows: FlowLibraryEntry[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useTenantFlows(
  targetTenantId: string | null,
  adminTenantId = 'xiigen-master-00000000-0000-0000-0000-000000000001',
): UseTenantFlowsReturn {
  const [flows, setFlows] = useState<FlowLibraryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!targetTenantId) {
      setFlows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    // Caller context MUST be MASTER_TENANT_ID — the backend's listByTenant
    // rejects any other tenantId with NOT_ADMIN.
    const result = await apiClient.get<{ flows: FlowLibraryEntry[] }>('tenantFlows', {
      tenantId: adminTenantId,
      pathParams: { id: targetTenantId },
    });
    if (result.isSuccess && result.data) {
      setFlows(result.data.flows ?? []);
    } else {
      setError(result.error?.message ?? 'Failed to load tenant flows');
    }
    setLoading(false);
  }, [targetTenantId, adminTenantId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { flows, loading, error, refresh };
}

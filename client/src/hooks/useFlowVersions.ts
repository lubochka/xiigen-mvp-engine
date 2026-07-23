/**
 * useFlowVersions — loads the version chain for a single flowId.
 *
 * Introduced by Turn 3 (MVP Plan v3, Goal 2).
 *
 * Server endpoint: GET /api/flows/definitions?flowId=X&includeVersions=true
 *                  → { flows: ClientFlowSummary[], versions: ClientFlowSummary[] }
 *
 * The hook returns the `versions` array (newest → oldest) so the version panel
 * can render the chain. An empty array + loading=false indicates no additional
 * versions beyond the currently-selected one.
 */

import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import type { FlowLibraryEntry } from './useFlowLibrary';

interface VersionsResponse {
  flows: FlowLibraryEntry[];
  versions?: FlowLibraryEntry[];
}

export interface UseFlowVersionsReturn {
  versions: FlowLibraryEntry[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useFlowVersions(flowId: string | null, tenantId = 'system'): UseFlowVersionsReturn {
  const [versions, setVersions] = useState<FlowLibraryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!flowId) {
      setVersions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const result = await apiClient.get<VersionsResponse>('flowDefinitions', {
      tenantId,
      params: { flowId, includeVersions: 'true' },
    });
    if (result.isSuccess && result.data) {
      setVersions(result.data.versions ?? []);
    } else {
      setError(result.error?.message ?? 'Failed to load versions');
    }
    setLoading(false);
  }, [flowId, tenantId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { versions, loading, error, refresh };
}

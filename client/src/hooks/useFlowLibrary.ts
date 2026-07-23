/**
 * useFlowLibrary — lists tenant's private + global flow definitions for the Flow Library page.
 *
 * Introduced by Track 0 Turn 6.
 *
 * Server endpoint: GET /api/flows/definitions — returns { flows: ClientFlowSummary[] }
 * Backing controller: FlowDefinitionsController.list (Turn 5).
 */

import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../api/client';

export interface FlowLibraryEntry {
  flow_id: string;
  name: string;
  version: string;
  status: string;
  knowledge_scope: 'PRIVATE' | 'GLOBAL';
  node_count: number;
  created_at: string;
  updated_at: string;
  /**
   * Turn 2 (MVP Plan v3) — drives per-row badge rendering in FlowLibraryPage.
   * Populated from TenantTopology.metadata.sourceType on the server.
   */
  source_type?: string;
  /** Turn 2 — link back to the parent DESIGN_SIM flow for TEACH/QA records. */
  source_flow_id?: string;
}

export interface UseFlowLibraryReturn {
  flows: FlowLibraryEntry[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  fork: (flowId: string) => Promise<string | null>;
}

export function useFlowLibrary(tenantId = 'system'): UseFlowLibraryReturn {
  const [flows, setFlows] = useState<FlowLibraryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    // v8 Finding 8.12: endpoint key is 'flowDefinitions' (not 'flowDefinitionList')
    const result = await apiClient.get<{ flows: FlowLibraryEntry[] }>('flowDefinitions', {
      tenantId,
    });
    if (result.isSuccess && result.data) {
      setFlows(result.data.flows ?? []);
    } else {
      // v8 Finding 8.15: result.error?.message (not result.errorMessage)
      setError(result.error?.message ?? 'Failed to load flows');
    }
    setLoading(false);
  }, [tenantId]);

  /**
   * Fork a GLOBAL template into a new PRIVATE flow.
   * Returns the new flowId on success, null on failure.
   * Fork button is disabled in FlowLibraryPage (v8 Finding 8.16) until Turn 15
   * wires the FLOW-18 marketplace publish path — but the hook is callable.
   */
  const fork = useCallback(
    async (flowId: string): Promise<string | null> => {
      const result = await apiClient.post<{ flow_id: string }>('flowDefinitionFork', {
        tenantId,
        pathParams: { flowId },
      });
      if (result.isSuccess && result.data) {
        await refresh();
        return result.data.flow_id;
      }
      setError(result.error?.message ?? 'Fork failed');
      return null;
    },
    [tenantId, refresh],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { flows, loading, error, refresh, fork };
}

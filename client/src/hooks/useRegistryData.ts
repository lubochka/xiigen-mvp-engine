/**
 * useRegistryData — fetches factory catalog, contracts, and counts.
 * Translated from React Native. Uses P9 engine endpoints.
 */

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/client';
import type { EngineDocument } from '../api/types';

export interface RegistryCounts {
  generationCount: number;
  factoryCount: number;
  taskTypeCount: number;
  promotionCount: number;
}

export interface ContractRecord {
  taskTypeId: string;
  name: string;
  archetype: string;
  factoryDependencies: Array<{ factoryId: string; interfaceName: string; fabricType: string }>;
  familyId: string;
  version: string;
}

export interface UseRegistryDataReturn {
  counts: RegistryCounts | null;
  contracts: ContractRecord[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useRegistryData(tenantId = 'system'): UseRegistryDataReturn {
  const [counts, setCounts] = useState<RegistryCounts | null>(null);
  const [contracts, setContracts] = useState<ContractRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [statusResult, contractsResult] = await Promise.all([
        apiClient.get<EngineDocument>('engineStatus', { tenantId }),
        apiClient.get<EngineDocument[]>('engineContracts', { tenantId }),
      ]);

      // Server returns { success, data } — unwrap if apiClient didn't already
      const unwrap = <U>(r: { isSuccess: boolean; data?: unknown }): U | null => {
        if (!r.isSuccess || r.data == null) return null;
        const d = r.data as { success?: unknown; data?: unknown };
        if (typeof d === 'object' && d !== null && 'success' in d && 'data' in d) {
          return d.data as U;
        }
        return r.data as U;
      };

      const statusData = unwrap<Record<string, unknown>>(statusResult);
      if (statusData) {
        setCounts({
          generationCount: (statusData.generation_count as number) ?? 0,
          factoryCount: (statusData.factory_count as number) ?? 0,
          taskTypeCount: (statusData.task_type_count as number) ?? 0,
          promotionCount: (statusData.promotion_count as number) ?? 0,
        });
      }

      const contractsData = unwrap<Record<string, unknown>[]>(contractsResult);
      if (Array.isArray(contractsData)) {
        const parsed: ContractRecord[] = contractsData.map((c) => ({
          taskTypeId: (c.task_type_id as string) ?? '',
          name: (c.name as string) ?? '',
          archetype: (c.archetype as string) ?? '',
          factoryDependencies:
            (c.factory_dependencies as ContractRecord['factoryDependencies']) ?? [],
          familyId: (c.family_id as string) ?? '',
          version: (c.version as string) ?? '',
        }));
        setContracts(parsed);
      }

      if (!statusResult.isSuccess && !contractsResult.isSuccess) {
        setError('Failed to fetch registry data');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { counts, contracts, loading, error, refresh: fetchData };
}

/**
 * useTenants — tenant management hook.
 * CRUD operations against /tenants API endpoints (P9).
 */

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/client';
import type { EngineDocument, TenantStatus } from '../api/types';

export interface TenantRecord {
  id: string;
  name: string;
  status: TenantStatus;
  createdAt: string;
  plan: Record<string, unknown>;
  configOverrides: Record<string, unknown>;
  apiKeys: Record<string, string>;
}

export interface UseTenantsReturn {
  tenants: TenantRecord[];
  selectedTenant: TenantRecord | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  selectTenant: (t: TenantRecord | null) => void;
  createTenant: (name: string) => Promise<boolean>;
  updateConfig: (tenantId: string, config: Record<string, unknown>) => Promise<boolean>;
  setKeys: (tenantId: string, keys: Record<string, string>) => Promise<boolean>;
  setQuotas: (tenantId: string, quotas: Record<string, unknown>) => Promise<boolean>;
  deactivate: (tenantId: string) => Promise<boolean>;
}

function parseTenant(raw: Record<string, unknown>): TenantRecord {
  return {
    id: (raw.id as string) ?? '',
    name: (raw.name as string) ?? '',
    status: (raw.status as TenantStatus) ?? 'active',
    createdAt: (raw.createdAt as string) ?? (raw.created_at as string) ?? '',
    plan: (raw.plan as Record<string, unknown>) ?? {},
    configOverrides:
      (raw.configOverrides as Record<string, unknown>) ??
      (raw.config_overrides as Record<string, unknown>) ??
      {},
    apiKeys:
      (raw.apiKeys as Record<string, string>) ?? (raw.api_keys as Record<string, string>) ?? {},
  };
}

export function useTenants(): UseTenantsReturn {
  const [tenants, setTenants] = useState<TenantRecord[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<TenantRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await apiClient.get<EngineDocument[]>('tenantList');
    if (result.isSuccess && result.data) {
      setTenants((result.data as Record<string, unknown>[]).map(parseTenant));
    } else {
      setError(result.error?.message ?? 'Failed to fetch tenants');
    }
    setLoading(false);
  }, []);

  const createTenant = useCallback(
    async (name: string): Promise<boolean> => {
      setError(null);
      const result = await apiClient.post<EngineDocument>('tenantCreate', { body: { name } });
      if (result.isSuccess) {
        await fetchTenants();
        return true;
      }
      setError(result.error?.message ?? 'Create failed');
      return false;
    },
    [fetchTenants],
  );

  const updateConfig = useCallback(
    async (tenantId: string, config: Record<string, unknown>): Promise<boolean> => {
      const result = await apiClient.put<EngineDocument>('tenantConfig', {
        pathParams: { id: tenantId },
        body: config,
      });
      if (result.isSuccess) {
        await fetchTenants();
        return true;
      }
      setError(result.error?.message ?? 'Update config failed');
      return false;
    },
    [fetchTenants],
  );

  const setKeys = useCallback(
    async (tenantId: string, keys: Record<string, string>): Promise<boolean> => {
      const result = await apiClient.put<EngineDocument>('tenantKeys', {
        pathParams: { id: tenantId },
        body: keys,
      });
      if (result.isSuccess) {
        await fetchTenants();
        return true;
      }
      setError(result.error?.message ?? 'Set keys failed');
      return false;
    },
    [fetchTenants],
  );

  const setQuotas = useCallback(
    async (tenantId: string, quotas: Record<string, unknown>): Promise<boolean> => {
      const result = await apiClient.put<EngineDocument>('tenantQuotas', {
        pathParams: { id: tenantId },
        body: quotas,
      });
      if (result.isSuccess) {
        await fetchTenants();
        return true;
      }
      setError(result.error?.message ?? 'Set quotas failed');
      return false;
    },
    [fetchTenants],
  );

  const deactivate = useCallback(
    async (tenantId: string): Promise<boolean> => {
      const result = await apiClient.del<EngineDocument>('tenantDelete', {
        pathParams: { id: tenantId },
      });
      if (result.isSuccess) {
        await fetchTenants();
        if (selectedTenant?.id === tenantId) setSelectedTenant(null);
        return true;
      }
      setError(result.error?.message ?? 'Deactivate failed');
      return false;
    },
    [fetchTenants, selectedTenant],
  );

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  return {
    tenants,
    selectedTenant,
    loading,
    error,
    refresh: fetchTenants,
    selectTenant: setSelectedTenant,
    createTenant,
    updateConfig,
    setKeys,
    setQuotas,
    deactivate,
  };
}

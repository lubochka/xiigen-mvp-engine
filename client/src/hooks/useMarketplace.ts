/**
 * useMarketplace — browse + install marketplace packages.
 *
 * Introduced by Turn 6 (MVP Plan v3, Goals 4b + 4c + 4d).
 *
 * Server endpoints:
 *   GET  /api/marketplace/packages                         → { packages: ... }
 *   POST /api/marketplace/packages/:packageId/install      → registration record
 *
 * Install uses Linked mode per DD-324 — the server writes one record to
 * xiigen-tenant-module-registry. No topology is copied. The tenant gains
 * access to the module's FLOW_SCOPED knowledge via AF-4 at generation time.
 */

import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../api/client';

export interface MarketplacePackageSummary {
  packageId: string;
  publisherTenantId: string;
  publishedAt: string;
  title: string;
  description?: string;
  sourceFlowId: string;
  sourceVersion: string;
  tags?: string[];
  topology?: {
    nodes?: unknown[];
    edges?: unknown[];
  };
}

export interface UseMarketplaceReturn {
  packages: MarketplacePackageSummary[];
  loading: boolean;
  error: string | null;
  installing: string | null;
  refresh: () => Promise<void>;
  install: (packageId: string) => Promise<boolean>;
}

export function useMarketplace(tenantId = 'system'): UseMarketplaceReturn {
  const [packages, setPackages] = useState<MarketplacePackageSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [installing, setInstalling] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await apiClient.get<{ packages: MarketplacePackageSummary[] }>(
      'marketplacePackages',
      { tenantId },
    );
    if (result.isSuccess && result.data) {
      setPackages(result.data.packages ?? []);
    } else {
      setError(result.error?.message ?? 'Failed to load marketplace packages');
    }
    setLoading(false);
  }, [tenantId]);

  const install = useCallback(
    async (packageId: string): Promise<boolean> => {
      setInstalling(packageId);
      const result = await apiClient.post<{
        tenantId: string;
        flowId: string;
        packageId: string;
      }>('marketplacePackageInstall', {
        tenantId,
        pathParams: { packageId },
      });
      setInstalling(null);
      if (result.isSuccess && result.data) {
        return true;
      }
      setError(result.error?.message ?? 'Install failed');
      return false;
    },
    [tenantId],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { packages, loading, error, installing, refresh, install };
}

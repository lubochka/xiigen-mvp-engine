/**
 * TenantStatusBar — Shows current tenant identity and provider pool status.
 *
 * Displays:
 *   - Tenant ID
 *   - Provider count badge (3 providers / ⚠️ 1 provider)
 *   - Status badge (ACTIVE / SUSPENDED)
 *
 * Security: never shows key values — only provider type and count.
 *
 * Phase A-0.
 */

import React, { useEffect, useState } from 'react';

export interface ProviderInfo {
  id: string;
  type: 'anthropic' | 'openai' | 'gemini' | string;
  availableModels: string[];
  addedAt: string;
}

export interface TenantStatusData {
  tenantId: string;
  status: 'active' | 'suspended' | 'inactive';
  providers: ProviderInfo[];
}

interface TenantStatusBarProps {
  tenantId: string;
}

type LoadState = 'loading' | 'success' | 'error';

export function TenantStatusBar({ tenantId }: TenantStatusBarProps) {
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [data, setData] = useState<TenantStatusData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    setLoadState('loading');
    fetch(`/api/tenant/${tenantId}/pool`, {
      headers: { 'X-Tenant-Id': tenantId },
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({ message: 'Unknown error' }));
          throw new Error(body.message ?? `HTTP ${res.status}`);
        }
        return res.json() as Promise<TenantStatusData>;
      })
      .then((d) => {
        setData(d);
        setLoadState('success');
      })
      .catch((e: Error) => {
        setErrorMessage(e.message);
        setLoadState('error');
      });
  }, [tenantId]);

  if (loadState === 'loading') {
    return (
      <div data-testid="tenant-status-bar" className="flex items-center gap-2 px-3 py-1">
        <div data-testid="loading-state" className="animate-pulse text-gray-400 text-sm">
          Loading tenant…
        </div>
      </div>
    );
  }

  if (loadState === 'error') {
    return (
      <div data-testid="tenant-status-bar" className="flex items-center gap-2 px-3 py-1">
        <div data-testid="error-state" className="text-red-500 text-sm">
          {errorMessage}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const providerCount = data.providers.length;
  const isSingleProvider = providerCount === 1;
  const isMultiProvider = providerCount >= 3;

  return (
    <div data-testid="tenant-status-bar" className="flex items-center gap-2 px-3 py-1 text-sm">
      {/* Tenant identity */}
      <span data-testid="tenant-id" className="font-mono text-gray-300">
        {data.tenantId}
      </span>

      {/* Status badge */}
      <span
        data-testid="tenant-status-badge"
        data-status-code={data.status.toUpperCase()}
        className={
          data.status === 'active'
            ? 'px-2 py-0.5 rounded bg-green-900 text-green-300 text-xs'
            : 'px-2 py-0.5 rounded bg-red-900 text-red-300 text-xs'
        }
      >
        {data.status.toUpperCase()}
      </span>

      {/* Provider pool badge */}
      <span
        data-testid="provider-pool-badge"
        className={
          isSingleProvider
            ? 'px-2 py-0.5 rounded bg-yellow-900 text-yellow-300 text-xs'
            : isMultiProvider
              ? 'px-2 py-0.5 rounded bg-blue-900 text-blue-300 text-xs'
              : 'px-2 py-0.5 rounded bg-gray-700 text-gray-300 text-xs'
        }
      >
        {isSingleProvider ? `⚠️ ${providerCount} provider` : `${providerCount} providers`}
      </span>

      {/* Individual provider type chips (no key values) */}
      {data.providers.map((p) => (
        <span
          key={p.id}
          data-testid={`provider-chip-${p.type}`}
          className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 text-xs"
        >
          {p.type}
        </span>
      ))}
    </div>
  );
}

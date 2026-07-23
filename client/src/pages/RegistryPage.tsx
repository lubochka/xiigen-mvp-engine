/**
 * RegistryPage — factory catalog and engine contracts.
 * Translated from React Native RegistryScreen.
 */

import React, { useState } from 'react';
import { useRegistryData } from '../hooks/useRegistryData';
import { ContractListView, RegistrySearchBar } from '../components/registry';
import { DataCard } from '../components/common/DataCard';
import { LoadingState } from '../components/common/LoadingState';

export function RegistryPage() {
  const { counts, contracts, loading, error, refresh } = useRegistryData();
  const [search, setSearch] = useState('');

  if (loading && !counts) {
    return (
      <div data-testid="page-registry">
        <LoadingState message="Loading registry data..." />
      </div>
    );
  }

  return (
    <div data-testid="page-registry">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Registry</h1>
        <button
          onClick={refresh}
          disabled={loading}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          data-testid="registry-refresh"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Counts */}
      {counts && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <DataCard title="Factories" value={counts.factoryCount} />
          <DataCard title="Task Types" value={counts.taskTypeCount} />
          <DataCard title="Generations" value={counts.generationCount} />
          <DataCard title="Promotions" value={counts.promotionCount} />
        </div>
      )}

      {/* Contracts */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">
            Engine Contracts ({contracts.length})
          </h2>
          <RegistrySearchBar value={search} onChange={setSearch} />
        </div>
        <ContractListView contracts={contracts} searchQuery={search} />
      </div>
    </div>
  );
}

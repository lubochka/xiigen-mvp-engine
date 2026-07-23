/**
 * Registry Components — translated from React Native → React.js + Tailwind.
 *
 * ContractListView — engine contract catalog table
 * FactoryDepsView — factory dependencies for a contract
 * RegistrySearchBar — search/filter bar
 * StatusChip — promotion level chip
 */

import React from 'react';
import { StatusBadge } from '../common/StatusBadge';
import { FabricIcon } from '../common/FabricIcon';
import type { ContractRecord } from '../../hooks/useRegistryData';

// ── StatusChip ──────────────────────────────────────

export function StatusChip({ status }: { status: string }) {
  return <StatusBadge status={status} />;
}

// ── RegistrySearchBar ───────────────────────────────

export interface RegistrySearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function RegistrySearchBar({
  value,
  onChange,
  placeholder = 'Search contracts...',
}: RegistrySearchBarProps) {
  return (
    <div className="mb-4" data-testid="registry-search-bar">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        data-testid="registry-search-input"
      />
    </div>
  );
}

// ── FactoryDepsView ─────────────────────────────────

export interface FactoryDepsViewProps {
  dependencies: Array<{ factoryId: string; interfaceName: string; fabricType: string }>;
}

export function FactoryDepsView({ dependencies }: FactoryDepsViewProps) {
  if (!dependencies || dependencies.length === 0) {
    return <p className="text-xs text-gray-400">No factory dependencies</p>;
  }

  return (
    <div className="space-y-1" data-testid="factory-deps-view">
      {dependencies.map((dep, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <FabricIcon fabricType={dep.fabricType?.toUpperCase()} size={14} />
          <span className="font-mono text-gray-600">{dep.factoryId}</span>
          <span className="text-gray-400">→</span>
          <span className="text-gray-700">{dep.interfaceName}</span>
          <span className="text-gray-400">({dep.fabricType})</span>
        </div>
      ))}
    </div>
  );
}

// ── ContractListView ────────────────────────────────

export interface ContractListViewProps {
  contracts: ContractRecord[];
  searchQuery: string;
}

export function ContractListView({ contracts, searchQuery }: ContractListViewProps) {
  const filtered = contracts.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.taskTypeId.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      c.archetype.toLowerCase().includes(q) ||
      c.familyId.toLowerCase().includes(q)
    );
  });

  if (filtered.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400" data-testid="contract-list-empty">
        {contracts.length === 0 ? 'No contracts registered' : 'No contracts match your search'}
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100" data-testid="contract-list-view">
      {filtered.map((contract) => (
        <div
          key={contract.taskTypeId}
          className="py-3 px-4 hover:bg-gray-50"
          data-testid={`contract-row-${contract.taskTypeId}`}
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="font-mono font-semibold text-sm text-gray-900">
                {contract.taskTypeId}
              </span>
              <span className="text-sm text-gray-600">{contract.name}</span>
            </div>
            <StatusBadge status={contract.archetype} />
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-400 mb-2">
            <span>Family: {contract.familyId || '—'}</span>
            <span>v{contract.version}</span>
            <span>{contract.factoryDependencies.length} factories</span>
          </div>
          <FactoryDepsView dependencies={contract.factoryDependencies} />
        </div>
      ))}
    </div>
  );
}

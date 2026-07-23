/**
 * Dashboard Components — translated from React Native → React.js + Tailwind.
 *
 * BootstrapPhaseBar — 7-phase progress indicator
 * RegistryCountsCard — factory/contract/generation counts
 * HealthFabricsCard — per-fabric health status
 * BootstrapActions — refresh button
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { StatusBadge } from '../common/StatusBadge';
import { DataCard } from '../common/DataCard';
import { BOOTSTRAP_PHASES } from '../../hooks/useBootstrapStatus';
import type { RegistryCounts } from '../../hooks/useRegistryData';

// ── BootstrapPhaseBar ───────────────────────────────

export interface BootstrapPhaseBarProps {
  phases: Record<string, { status: string }>;
}

export function BootstrapPhaseBar({ phases }: BootstrapPhaseBarProps) {
  const { t } = useTranslation('dashboard');
  return (
    <div data-testid="bootstrap-phase-bar">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">
        {t('bootstrap_title', { defaultValue: 'Bootstrap Phases' })}
      </h3>
      <div className="flex gap-1">
        {BOOTSTRAP_PHASES.map((phase) => {
          const info = phases[phase];
          const status = info?.status ?? 'PENDING';
          const bgColor =
            status === 'SUCCESS'
              ? 'bg-green-500'
              : status === 'FAILED'
                ? 'bg-red-500'
                : status === 'SKIPPED'
                  ? 'bg-gray-300'
                  : status === 'RUNNING'
                    ? 'bg-blue-500'
                    : 'bg-gray-200';

          return (
            <div
              key={phase}
              className="flex flex-col items-center flex-1"
              data-testid={`phase-${phase}`}
            >
              <div className={`h-2 w-full rounded ${bgColor}`} />
              <span className="text-[10px] text-gray-500 mt-1 truncate w-full text-center">
                {phase.replace('_', ' ')}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── RegistryCountsCard ──────────────────────────────

export interface RegistryCountsCardProps {
  counts: RegistryCounts;
}

export function RegistryCountsCard({ counts }: RegistryCountsCardProps) {
  const { t } = useTranslation('dashboard');
  return (
    <div data-testid="registry-counts-card">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">
        {t('engine_registry_title', { defaultValue: 'Engine Registry' })}
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <DataCard
          title={t('registry_generations', { defaultValue: 'Generations' })}
          value={counts.generationCount}
        />
        <DataCard
          title={t('registry_factories', { defaultValue: 'Factories' })}
          value={counts.factoryCount}
        />
        <DataCard
          title={t('registry_task_types', { defaultValue: 'Task Types' })}
          value={counts.taskTypeCount}
        />
        <DataCard
          title={t('registry_promotions', { defaultValue: 'Promotions' })}
          value={counts.promotionCount}
        />
      </div>
    </div>
  );
}

// ── HealthFabricsCard ───────────────────────────────

export interface HealthFabricsCardProps {
  fabrics: Record<string, Record<string, unknown>>;
}

export function HealthFabricsCard({ fabrics }: HealthFabricsCardProps) {
  const entries = Object.entries(fabrics);

  return (
    <div data-testid="health-fabrics-card">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Fabric Health</h3>
      {entries.length === 0 ? (
        <p className="text-sm text-gray-400">No fabrics registered</p>
      ) : (
        <div className="space-y-2">
          {entries.map(([name, info]) => (
            <div
              key={name}
              className="flex items-center justify-between py-1.5 px-3 bg-gray-50 rounded"
              data-testid={`fabric-row-${name}`}
            >
              <span className="text-sm font-medium text-gray-700 capitalize">
                {name.replace('_', ' ')}
              </span>
              <StatusBadge status={(info.status as string) ?? 'UNKNOWN'} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── BootstrapActions ────────────────────────────────

export interface BootstrapActionsProps {
  onRefresh: () => void;
  loading: boolean;
  healthStatus?: string;
}

export function BootstrapActions({ onRefresh, loading, healthStatus }: BootstrapActionsProps) {
  const { t } = useTranslation('dashboard');
  return (
    <div
      className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100"
      data-testid="bootstrap-actions"
    >
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">
          {t('status_label', { defaultValue: 'Status:' })}
        </span>
        <StatusBadge status={healthStatus ?? 'UNKNOWN'} />
      </div>
      <button
        onClick={onRefresh}
        disabled={loading}
        className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        data-testid="refresh-button"
      >
        {loading
          ? t('loading_status', { defaultValue: 'Refreshing...' })
          : t('refresh_btn', { defaultValue: 'Refresh' })}
      </button>
    </div>
  );
}

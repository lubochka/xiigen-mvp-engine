/**
 * DashboardPage — engine health dashboard.
 * Shows bootstrap phases, fabric health, and registry counts.
 * Translated from React Native DashboardScreen.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useBootstrapStatus } from '../hooks/useBootstrapStatus';
import { useRegistryData } from '../hooks/useRegistryData';
import {
  BootstrapPhaseBar,
  RegistryCountsCard,
  HealthFabricsCard,
  BootstrapActions,
} from '../components/dashboard';
import { LoadingState } from '../components/common/LoadingState';
import { StatusBadge } from '../components/common/StatusBadge';

export function DashboardPage() {
  // FLOW-48: dashboard namespace. Missing keys fall through to English defaults
  // via i18next's fallbackLng pipeline — no broken keys on any path.
  const { t } = useTranslation('dashboard');
  const bootstrap = useBootstrapStatus();
  const registry = useRegistryData();

  if (bootstrap.loading && !bootstrap.data) {
    return (
      <div data-testid="page-dashboard">
        <LoadingState message={t('loading_status', { defaultValue: 'Loading engine status...' })} />
      </div>
    );
  }

  if (bootstrap.error && !bootstrap.data) {
    return (
      <div className="p-6 text-center" data-testid="page-dashboard">
        <p className="text-red-600">{bootstrap.error}</p>
        <button
          onClick={bootstrap.refresh}
          className="mt-3 px-4 py-2 text-sm bg-blue-600 text-white rounded"
        >
          {t('retry_btn', { defaultValue: 'Retry' })}
        </button>
      </div>
    );
  }

  const data = bootstrap.data;

  return (
    <div data-testid="page-dashboard">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {t('page_title', { defaultValue: 'Engine Dashboard' })}
        </h1>
        {data && <StatusBadge status={data.healthStatus} size="md" />}
      </div>

      {/* Bootstrap Phases */}
      {data && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4 shadow-sm">
          <BootstrapPhaseBar phases={data.phases} />
          <BootstrapActions
            onRefresh={bootstrap.refresh}
            loading={bootstrap.loading}
            healthStatus={data.healthStatus}
          />
        </div>
      )}

      {/* Registry Counts */}
      {registry.counts && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4 shadow-sm">
          <RegistryCountsCard counts={registry.counts} />
        </div>
      )}

      {/* Fabric Health */}
      {data && Object.keys(data.fabrics).length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <HealthFabricsCard fabrics={data.fabrics} />
        </div>
      )}
    </div>
  );
}

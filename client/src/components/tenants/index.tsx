/**
 * Tenant Components — NEW engine admin pages.
 *
 * TenantListView — tenant table with status + actions
 * CreateTenantDialog — modal form for creating a tenant
 * TenantConfigPanel — FREEDOM config per tenant
 * TenantKeysPanel — API key management with masking
 * TenantQuotaPanel — quota usage bars
 */

import React, { useState } from 'react';
import { StatusBadge } from '../common/StatusBadge';
import type { TenantRecord } from '../../hooks/useTenants';

// ── TenantListView ──────────────────────────────────

interface TenantListViewProps {
  tenants: TenantRecord[];
  selectedTenant: TenantRecord | null;
  onSelect: (t: TenantRecord) => void;
  onDeactivate: (id: string) => void;
}

export function TenantListView({
  tenants,
  selectedTenant,
  onSelect,
  onDeactivate,
}: TenantListViewProps) {
  if (tenants.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400" data-testid="tenant-list-empty">
        No tenants yet. Create one to get started.
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100" data-testid="tenant-list-view">
      {tenants.map((t) => (
        <div
          key={t.id}
          className={`flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 ${
            selectedTenant?.id === t.id ? 'bg-blue-50 border-l-2 border-blue-600' : ''
          }`}
          onClick={() => onSelect(t)}
          data-testid={`tenant-row-${t.id}`}
        >
          <div>
            <span className="text-sm font-medium text-gray-900">{t.name}</span>
            <span className="text-xs text-gray-400 ml-2">{t.id.substring(0, 8)}…</span>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={t.status} />
            {t.status === 'active' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeactivate(t.id);
                }}
                className="text-xs text-red-500 hover:text-red-700"
                data-testid={`deactivate-${t.id}`}
              >
                Deactivate
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── CreateTenantDialog ──────────────────────────────

interface CreateTenantDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string) => Promise<boolean>;
}

export function CreateTenantDialog({ open, onClose, onCreate }: CreateTenantDialogProps) {
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    setSubmitting(true);
    setError('');
    const success = await onCreate(name.trim());
    setSubmitting(false);
    if (success) {
      setName('');
      onClose();
    } else setError('Failed to create tenant');
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      data-testid="create-tenant-dialog"
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Create Tenant</h2>
        <div className="mb-4">
          <label className="block text-sm text-gray-600 mb-1">Tenant Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Acme Corp"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            data-testid="create-tenant-name"
            autoFocus
          />
          {error && (
            <p className="text-xs text-red-500 mt-1" data-testid="create-tenant-error">
              {error}
            </p>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded"
            data-testid="create-tenant-cancel"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            data-testid="create-tenant-submit"
          >
            {submitting ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── TenantConfigPanel ───────────────────────────────

interface TenantConfigPanelProps {
  tenant: TenantRecord;
  onUpdateConfig: (config: Record<string, unknown>) => Promise<boolean>;
}

export function TenantConfigPanel({
  tenant,
  onUpdateConfig: _onUpdateConfig,
}: TenantConfigPanelProps) {
  const entries = Object.entries(tenant.configOverrides);

  return (
    <div data-testid="tenant-config-panel">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Configuration Overrides</h3>
      {entries.length === 0 ? (
        <p className="text-sm text-gray-400">No config overrides set</p>
      ) : (
        <div className="space-y-2">
          {entries.map(([key, value]) => (
            <div
              key={key}
              className="flex items-center justify-between py-1.5 px-3 bg-gray-50 rounded text-sm"
            >
              <span className="font-mono text-gray-600">{key}</span>
              <span className="text-gray-900">{String(value)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── TenantKeysPanel ─────────────────────────────────

interface TenantKeysPanelProps {
  tenant: TenantRecord;
  onSetKeys: (keys: Record<string, string>) => Promise<boolean>;
}

export function TenantKeysPanel({ tenant, onSetKeys }: TenantKeysPanelProps) {
  const [editing, setEditing] = useState(false);
  const [newProvider, setNewProvider] = useState('');
  const [newKey, setNewKey] = useState('');
  const keys = tenant.apiKeys ?? {};
  const entries = Object.entries(keys);

  const handleAdd = async () => {
    if (!newProvider.trim() || !newKey.trim()) return;
    const updated = { ...keys, [newProvider.trim()]: newKey.trim() };
    const ok = await onSetKeys(updated);
    if (ok) {
      setNewProvider('');
      setNewKey('');
      setEditing(false);
    }
  };

  function maskKey(key: string): string {
    if (key.length <= 8) return '••••••••';
    return key.substring(0, 4) + '••••' + key.substring(key.length - 4);
  }

  return (
    <div data-testid="tenant-keys-panel">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">API Keys</h3>
      {entries.length === 0 && !editing ? (
        <p className="text-sm text-gray-400">No API keys configured</p>
      ) : (
        <div className="space-y-2 mb-3">
          {entries.map(([provider, key]) => (
            <div
              key={provider}
              className="flex items-center justify-between py-1.5 px-3 bg-gray-50 rounded text-sm"
              data-testid={`key-row-${provider}`}
            >
              <span className="font-medium text-gray-700 capitalize">{provider}</span>
              <span className="font-mono text-gray-400" data-testid={`key-masked-${provider}`}>
                {maskKey(key)}
              </span>
            </div>
          ))}
        </div>
      )}

      {editing ? (
        <div className="space-y-2 p-3 bg-blue-50 rounded" data-testid="key-add-form">
          <input
            type="text"
            value={newProvider}
            onChange={(e) => setNewProvider(e.target.value)}
            placeholder="Provider (e.g., anthropic)"
            className="w-full px-2 py-1.5 text-sm border rounded"
            data-testid="key-provider-input"
          />
          <input
            type="password"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            placeholder="API Key"
            className="w-full px-2 py-1.5 text-sm border rounded"
            data-testid="key-value-input"
          />
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              className="px-3 py-1 text-xs bg-blue-600 text-white rounded"
              data-testid="key-save"
            >
              Save
            </button>
            <button
              onClick={() => setEditing(false)}
              className="px-3 py-1 text-xs text-gray-600"
              data-testid="key-cancel"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="text-xs text-blue-600 hover:underline"
          data-testid="key-add-button"
        >
          + Add API Key
        </button>
      )}
    </div>
  );
}

// ── TenantQuotaPanel ────────────────────────────────

interface TenantQuotaPanelProps {
  tenant: TenantRecord;
  onSetQuotas: (quotas: Record<string, unknown>) => Promise<boolean>;
}

export function TenantQuotaPanel({ tenant, onSetQuotas: _onSetQuotas }: TenantQuotaPanelProps) {
  const plan = tenant.plan ?? {};
  const maxReq = (plan.maxRequestsPerMinute as number) ?? 60;
  const maxTokens = (plan.maxTokensPerDay as number) ?? 100000;
  // Simulated usage (real data would come from monitoring)
  const usedReq = Math.floor(maxReq * 0.4);
  const usedTokens = Math.floor(maxTokens * 0.6);

  return (
    <div data-testid="tenant-quota-panel">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Quota Usage</h3>
      <div className="space-y-4">
        <QuotaBar label="Requests/min" used={usedReq} max={maxReq} unit="req/min" />
        <QuotaBar label="Tokens/day" used={usedTokens} max={maxTokens} unit="tokens/day" />
      </div>
    </div>
  );
}

function QuotaBar({
  label,
  used,
  max,
  unit,
}: {
  label: string;
  used: number;
  max: number;
  unit: string;
}) {
  const pct = max > 0 ? Math.min((used / max) * 100, 100) : 0;
  const color = pct > 80 ? 'bg-red-500' : pct > 60 ? 'bg-yellow-500' : 'bg-green-500';

  return (
    <div data-testid={`quota-${label.replace(/\//g, '-')}`}>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-600">{label}</span>
        <span className="text-gray-400">
          {used.toLocaleString()} / {max.toLocaleString()} {unit}
        </span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${pct}%` }}
          data-testid="quota-bar-fill"
        />
      </div>
    </div>
  );
}

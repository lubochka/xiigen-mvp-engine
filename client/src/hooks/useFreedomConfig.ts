/**
 * useFreedomConfig — loads and updates FREEDOM config values per tenant.
 * useLedger — fetches audit trail / ledger entries.
 * Translated from React Native.
 */

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/client';
import type { EngineDocument } from '../api/types';

// ── FREEDOM Config Types ────────────────────────────

export type ConfigFieldType = 'string' | 'number' | 'boolean' | 'select' | 'json';

export interface FreedomConfigField {
  key: string;
  label: string;
  description: string;
  type: ConfigFieldType;
  value: unknown;
  defaultValue: unknown;
  modified: boolean;
  taskType?: string;
  editableBy?: string;
}

export interface FreedomConfigSection {
  id: string;
  name: string;
  fields: FreedomConfigField[];
}

export interface UseFreedomConfigReturn {
  sections: FreedomConfigSection[];
  loading: boolean;
  error: string | null;
  dirty: boolean;
  refresh: () => void;
  updateField: (sectionId: string, fieldKey: string, value: unknown) => void;
  save: () => Promise<boolean>;
  resetChanges: () => void;
}

export function useFreedomConfig(tenantId = 'system'): UseFreedomConfigReturn {
  const [sections, setSections] = useState<FreedomConfigSection[]>([]);
  const [original, setOriginal] = useState<FreedomConfigSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await apiClient.get<EngineDocument>('freedomConfig', { tenantId });

    if (result.isSuccess && result.data) {
      const raw = result.data;
      // Parse config entries into sections grouped by task_type
      const entries = Array.isArray(raw) ? raw : ((raw.configs as Record<string, unknown>[]) ?? []);
      const grouped = new Map<string, FreedomConfigField[]>();

      for (const entry of entries) {
        const e = entry as Record<string, unknown>;
        const taskType = (e['task_type'] as string) ?? 'global';
        if (!grouped.has(taskType)) grouped.set(taskType, []);
        grouped.get(taskType)!.push({
          key: (e['config_key'] as string) ?? '',
          label: (e['config_key'] as string) ?? '',
          description: (e['description'] as string) ?? '',
          type: mapValueType(e['value_type'] as string),
          value: e['value'],
          defaultValue: e['value'],
          modified: false,
          taskType,
          editableBy: (e['editable_by'] as string) ?? 'admin',
        });
      }

      const parsed: FreedomConfigSection[] = [...grouped.entries()].map(([id, fields]) => ({
        id,
        name: id === 'global' ? 'Global Settings' : `Task Type: ${id}`,
        fields,
      }));

      setSections(parsed);
      setOriginal(JSON.parse(JSON.stringify(parsed)));
    } else {
      setError(result.error?.message ?? 'Failed to load config');
    }
    setLoading(false);
  }, [tenantId]);

  const updateField = useCallback((sectionId: string, fieldKey: string, value: unknown) => {
    setSections((prev) =>
      prev.map((s) => {
        if (s.id !== sectionId) return s;
        return {
          ...s,
          fields: s.fields.map((f) => (f.key === fieldKey ? { ...f, value, modified: true } : f)),
        };
      }),
    );
    setDirty(true);
  }, []);

  const save = useCallback(async (): Promise<boolean> => {
    const changedFields = sections.flatMap((s) => s.fields.filter((f) => f.modified));
    if (changedFields.length === 0) return true;

    setLoading(true);
    const result = await apiClient.put<EngineDocument>('freedomConfigUpdate', {
      tenantId,
      body: { updates: changedFields.map((f) => ({ config_key: f.key, value: f.value })) },
    });
    setLoading(false);

    if (result.isSuccess) {
      setDirty(false);
      setOriginal(JSON.parse(JSON.stringify(sections)));
      setSections((prev) =>
        prev.map((s) => ({ ...s, fields: s.fields.map((f) => ({ ...f, modified: false })) })),
      );
      return true;
    }
    setError(result.error?.message ?? 'Save failed');
    return false;
  }, [sections, tenantId]);

  const resetChanges = useCallback(() => {
    setSections(JSON.parse(JSON.stringify(original)));
    setDirty(false);
  }, [original]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  return { sections, loading, error, dirty, refresh: fetchConfig, updateField, save, resetChanges };
}

function mapValueType(vt: string): ConfigFieldType {
  if (vt === 'int' || vt === 'float') return 'number';
  if (vt === 'bool') return 'boolean';
  if (vt === 'dict' || vt === 'list') return 'json';
  return 'string';
}

// ── Ledger Types ────────────────────────────────────

export type LedgerCategory = 'BOOTSTRAP' | 'REGISTRY' | 'FLOW_RUN' | 'CONFIG' | 'ERROR' | 'SYSTEM';

export interface LedgerEntry {
  id: string;
  timestamp: string;
  category: LedgerCategory;
  severity: 'info' | 'warn' | 'error' | 'success';
  action: string;
  summary: string;
  details: Record<string, unknown>;
}

export interface UseLedgerReturn {
  entries: LedgerEntry[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  filterCategory: LedgerCategory | null;
  setFilterCategory: (cat: LedgerCategory | null) => void;
}

export function useLedger(tenantId = 'system'): UseLedgerReturn {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<LedgerCategory | null>(null);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await apiClient.get<EngineDocument[]>('ledgerEntries', { tenantId });

    if (result.isSuccess && result.data) {
      const parsed: LedgerEntry[] = (result.data as Record<string, unknown>[]).map((e, i) => ({
        id: (e.id as string) ?? `entry-${i}`,
        timestamp: (e.timestamp as string) ?? new Date().toISOString(),
        category: (e.category as LedgerCategory) ?? 'SYSTEM',
        severity: (e.severity as LedgerEntry['severity']) ?? 'info',
        action: (e.action as string) ?? '',
        summary: (e.summary as string) ?? '',
        details: (e.details as Record<string, unknown>) ?? {},
      }));
      setEntries(parsed);
    } else {
      setError(result.error?.message ?? 'Failed to load ledger');
    }
    setLoading(false);
  }, [tenantId]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  return { entries, loading, error, refresh: fetchEntries, filterCategory, setFilterCategory };
}

/**
 * Freedom + Ledger Components — FREEDOM config editor + audit trail.
 * Translated from React Native → React.js + Tailwind.
 *
 * ConfigFieldEditor — inline field editor (string/number/boolean)
 * ConfigSectionView — grouped config fields by section
 * ConfigToolbar — save/reset/search bar
 * LedgerEntryRow — single audit trail entry
 * LedgerFilterBar — category filter bar
 */

import React, { useState } from 'react';
import type { FreedomConfigSection, FreedomConfigField } from '../../hooks/useFreedomConfig';
import type { LedgerEntry, LedgerCategory } from '../../hooks/useFreedomConfig';

// ── ConfigFieldEditor ───────────────────────────────

interface ConfigFieldEditorProps {
  field: FreedomConfigField;
  onChange: (value: unknown) => void;
}

export function ConfigFieldEditor({ field, onChange }: ConfigFieldEditorProps) {
  const baseClass =
    'w-full px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500';
  const borderClass = field.modified ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200';

  if (field.type === 'boolean') {
    return (
      <div className="flex items-center gap-2" data-testid={`field-${field.key}`}>
        <input
          type="checkbox"
          checked={!!field.value}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4 text-blue-600 rounded"
          data-testid={`field-input-${field.key}`}
        />
        <span className="text-sm text-gray-700">{field.label}</span>
        {field.modified && <span className="text-xs text-yellow-600">modified</span>}
      </div>
    );
  }

  if (field.type === 'number') {
    return (
      <div data-testid={`field-${field.key}`}>
        <label className="block text-xs text-gray-500 mb-1">{field.label}</label>
        <input
          type="number"
          value={(field.value as number) ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
          className={`${baseClass} ${borderClass}`}
          data-testid={`field-input-${field.key}`}
        />
        {field.description && <p className="text-xs text-gray-400 mt-0.5">{field.description}</p>}
      </div>
    );
  }

  if (field.type === 'json') {
    return (
      <div data-testid={`field-${field.key}`}>
        <label className="block text-xs text-gray-500 mb-1">{field.label}</label>
        <textarea
          value={
            typeof field.value === 'string'
              ? field.value
              : JSON.stringify(field.value ?? '', null, 2)
          }
          onChange={(e) => onChange(e.target.value)}
          className={`${baseClass} ${borderClass} h-20 font-mono text-xs`}
          data-testid={`field-input-${field.key}`}
        />
      </div>
    );
  }

  // Default: string
  return (
    <div data-testid={`field-${field.key}`}>
      <label className="block text-xs text-gray-500 mb-1">{field.label}</label>
      <input
        type="text"
        value={(field.value as string) ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className={`${baseClass} ${borderClass}`}
        data-testid={`field-input-${field.key}`}
      />
      {field.description && <p className="text-xs text-gray-400 mt-0.5">{field.description}</p>}
    </div>
  );
}

// ── ConfigSectionView ───────────────────────────────

interface ConfigSectionViewProps {
  section: FreedomConfigSection;
  onUpdateField: (fieldKey: string, value: unknown) => void;
}

export function ConfigSectionView({ section, onUpdateField }: ConfigSectionViewProps) {
  const [collapsed, setCollapsed] = useState(false);
  const modifiedCount = section.fields.filter((f) => f.modified).length;

  return (
    <div
      className="bg-white rounded-lg border border-gray-200 mb-3"
      data-testid={`config-section-${section.id}`}
    >
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-4 py-3 text-start hover:bg-gray-50"
        data-testid={`section-toggle-${section.id}`}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-700">{section.name}</span>
          <span className="text-xs text-gray-400">{section.fields.length} fields</span>
          {modifiedCount > 0 && (
            <span className="text-xs text-yellow-600 bg-yellow-50 px-1.5 py-0.5 rounded">
              {modifiedCount} changed
            </span>
          )}
        </div>
        <span className="text-gray-400">{collapsed ? '▶' : '▼'}</span>
      </button>
      {!collapsed && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
          {section.fields.map((field) => (
            <ConfigFieldEditor
              key={field.key}
              field={field}
              onChange={(value) => onUpdateField(field.key, value)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── ConfigToolbar ───────────────────────────────────

interface ConfigToolbarProps {
  dirty: boolean;
  saving: boolean;
  searchQuery: string;
  onSave: () => void;
  onReset: () => void;
  onSearch: (q: string) => void;
}

export function ConfigToolbar({
  dirty,
  saving,
  searchQuery,
  onSave,
  onReset,
  onSearch,
}: ConfigToolbarProps) {
  return (
    <div className="flex items-center gap-3 mb-4" data-testid="config-toolbar">
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => onSearch(e.target.value)}
        placeholder="Search config fields..."
        className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        data-testid="config-search"
      />
      <button
        onClick={onReset}
        disabled={!dirty}
        className="px-3 py-2 text-sm border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50"
        data-testid="config-reset"
      >
        Reset
      </button>
      <button
        onClick={onSave}
        disabled={!dirty || saving}
        className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        data-testid="config-save"
      >
        {saving ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  );
}

// ── LedgerEntryRow ──────────────────────────────────

interface LedgerEntryRowProps {
  entry: LedgerEntry;
}

const SEVERITY_COLORS: Record<string, string> = {
  info: 'text-blue-600',
  warn: 'text-yellow-600',
  error: 'text-red-600',
  success: 'text-green-600',
};

export function LedgerEntryRow({ entry }: LedgerEntryRowProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="border-b border-gray-100 last:border-0"
      data-testid={`ledger-entry-${entry.id}`}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-start px-4 py-2.5 hover:bg-gray-50 flex items-center gap-3"
      >
        <span
          data-severity-code={entry.severity.toUpperCase()}
          className={`text-xs font-medium ${SEVERITY_COLORS[entry.severity] ?? 'text-gray-500'}`}
        >
          {entry.severity.charAt(0).toUpperCase() + entry.severity.slice(1).toLowerCase()}
        </span>
        <span className="text-xs text-gray-400 w-16 shrink-0">{entry.category}</span>
        <span className="text-sm text-gray-700 flex-1 truncate">
          {entry.summary || entry.action}
        </span>
        <span className="text-xs text-gray-400">
          {new Date(entry.timestamp).toLocaleTimeString()}
        </span>
      </button>
      {expanded && (
        <div className="px-4 pb-3">
          <pre className="text-xs text-gray-500 bg-gray-50 rounded p-2 overflow-auto max-h-32">
            {JSON.stringify(entry.details, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

// ── LedgerFilterBar ─────────────────────────────────

const LEDGER_CATEGORIES: (LedgerCategory | 'ALL')[] = [
  'ALL',
  'BOOTSTRAP',
  'REGISTRY',
  'FLOW_RUN',
  'CONFIG',
  'ERROR',
  'SYSTEM',
];

interface LedgerFilterBarProps {
  active: LedgerCategory | null;
  onChange: (cat: LedgerCategory | null) => void;
}

export function LedgerFilterBar({ active, onChange }: LedgerFilterBarProps) {
  return (
    <div className="flex gap-1 mb-3 flex-wrap" data-testid="ledger-filter-bar">
      {LEDGER_CATEGORIES.map((cat) => {
        const isActive = cat === 'ALL' ? active === null : active === cat;
        return (
          <button
            key={cat}
            onClick={() => onChange(cat === 'ALL' ? null : (cat as LedgerCategory))}
            className={`px-2.5 py-1 text-xs rounded-full ${
              isActive ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            data-testid={`filter-${cat}`}
          >
            {cat}
          </button>
        );
      })}
    </div>
  );
}

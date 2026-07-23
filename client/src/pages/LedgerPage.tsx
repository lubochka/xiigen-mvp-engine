/**
 * LedgerPage — FREEDOM config editor + audit trail.
 * Translated from React Native LedgerScreen.
 */

import React, { useState } from 'react';
import { useFreedomConfig, useLedger } from '../hooks/useFreedomConfig';
import {
  ConfigSectionView,
  ConfigToolbar,
  LedgerEntryRow,
  LedgerFilterBar,
} from '../components/freedom';
import { LoadingState } from '../components/common/LoadingState';

export function LedgerPage() {
  const config = useFreedomConfig();
  const ledger = useLedger();
  const [tab, setTab] = useState<'config' | 'audit'>('config');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSections = config.sections
    .map((s) => ({
      ...s,
      fields: s.fields.filter(
        (f) =>
          !searchQuery ||
          f.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
          f.label.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    }))
    .filter((s) => s.fields.length > 0);

  const filteredEntries = ledger.entries.filter(
    (e) => !ledger.filterCategory || e.category === ledger.filterCategory,
  );

  return (
    <div data-testid="page-ledger">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Ledger</h1>
        <div className="flex bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => setTab('config')}
            className={`px-4 py-1.5 text-sm rounded-md ${tab === 'config' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
            data-testid="tab-config"
          >
            FREEDOM Config
          </button>
          <button
            onClick={() => setTab('audit')}
            className={`px-4 py-1.5 text-sm rounded-md ${tab === 'audit' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
            data-testid="tab-audit"
          >
            Audit Trail
          </button>
        </div>
      </div>

      {/* Config Tab */}
      {tab === 'config' && (
        <>
          {config.loading && config.sections.length === 0 ? (
            <LoadingState message="Loading config..." />
          ) : (
            <>
              <ConfigToolbar
                dirty={config.dirty}
                saving={config.loading}
                searchQuery={searchQuery}
                onSave={config.save}
                onReset={config.resetChanges}
                onSearch={setSearchQuery}
              />
              {filteredSections.length === 0 ? (
                <div className="text-center py-8 text-gray-400" data-testid="config-empty">
                  {config.sections.length === 0
                    ? 'No config entries'
                    : 'No fields match your search'}
                </div>
              ) : (
                filteredSections.map((section) => (
                  <ConfigSectionView
                    key={section.id}
                    section={section}
                    onUpdateField={(key, val) => config.updateField(section.id, key, val)}
                  />
                ))
              )}
            </>
          )}
        </>
      )}

      {/* Audit Tab */}
      {tab === 'audit' && (
        <>
          {ledger.loading && ledger.entries.length === 0 ? (
            <LoadingState message="Loading audit trail..." />
          ) : (
            <>
              <LedgerFilterBar active={ledger.filterCategory} onChange={ledger.setFilterCategory} />
              <div className="bg-white rounded-lg border border-gray-200">
                {filteredEntries.length === 0 ? (
                  <div className="text-center py-8 text-gray-400" data-testid="ledger-empty">
                    No ledger entries
                  </div>
                ) : (
                  filteredEntries.map((entry) => <LedgerEntryRow key={entry.id} entry={entry} />)
                )}
              </div>
            </>
          )}
        </>
      )}

      {(config.error || ledger.error) && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">
          {config.error || ledger.error}
        </div>
      )}
    </div>
  );
}

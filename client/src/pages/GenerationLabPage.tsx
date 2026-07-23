/**
 * GenerationLabPage — the engine's test bench.
 * Pick spec → Generate → Watch AF pipeline → See code → See scores → Give feedback.
 * NEW engine page (P10.4).
 */

import React, { useState } from 'react';
import { Loader2, Zap } from 'lucide-react';
import { useGenerationHistory } from '../hooks/useGenerationHistory';
import {
  ContractSpecEditor,
  AfStationTimeline,
  GeneratedCodeViewer,
  QualityScoreCard,
  FeedbackPanel,
} from '../components/generationlab';
import { StatusBadge } from '../components/common/StatusBadge';

const DEFAULT_SPEC = JSON.stringify(
  {
    taskTypeId: 'T44',
    name: 'Inventory Management',
    archetype: 'DATA_PIPELINE',
    entry: 'inventory.update event',
    purpose: 'ETL pipeline for inventory',
    factoryDependencies: [
      {
        factoryId: 'F166',
        interfaceName: 'IInventoryService',
        fabricType: 'database',
        description: 'Inventory storage',
      },
    ],
    afStations: [
      { stationId: 'AF-1', role: 'generate', config: {} },
      { stationId: 'AF-9', role: 'judge', config: {} },
    ],
    qualityGates: [
      {
        gateId: 'QG-01',
        description: 'DNA compliance',
        severity: 'error',
        checkType: 'dna_compliance',
      },
    ],
    bfaRegistration: {
      entities: ['inventory_item'],
      events: ['inventory.updated'],
      apiRoutes: ['/api/inventory'],
    },
    ironRules: ['All services extend MicroserviceBase'],
    machineComponents: ['service_bootstrap'],
    freedomComponents: ['batch_size'],
    familyId: 'Family-25',
  },
  null,
  2,
);

export function GenerationLabPage() {
  const gen = useGenerationHistory();
  const [spec, setSpec] = useState(DEFAULT_SPEC);
  const [tenantId, setTenantId] = useState('tenant-lab');
  const [specError, setSpecError] = useState('');

  const handleGenerate = async () => {
    setSpecError('');
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(spec);
    } catch (e) {
      setSpecError('Invalid JSON: ' + (e as Error).message);
      return;
    }
    await gen.generate(tenantId, parsed);
  };

  return (
    <div data-testid="page-generationlab">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Generation Lab</h1>
          <p className="text-sm text-gray-500">Feed the engine a spec and see what comes out</p>
        </div>
        {gen.currentRun && (
          <StatusBadge status={gen.currentRun.success ? 'COMPLETED' : 'FAILED'} size="md" />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Input */}
        <div className="space-y-4">
          {/* Tenant selector */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <label className="block text-xs text-gray-500 mb-1">Tenant ID</label>
            <input
              type="text"
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded"
              data-testid="tenant-input"
            />
          </div>

          {/* Spec editor */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <ContractSpecEditor value={spec} onChange={setSpec} error={specError} />
          </div>

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={gen.generating}
            className="w-full py-3 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            data-testid="generate-button"
          >
            <span className="inline-flex items-center justify-center gap-2">
              {gen.generating ? (
                <>
                  <Loader2 size={14} aria-hidden="true" className="animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <Zap size={14} aria-hidden="true" />
                  Generate
                </>
              )}
            </span>
          </button>

          {gen.error && (
            <div
              className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600"
              data-testid="gen-error"
            >
              {gen.error}
            </div>
          )}
        </div>

        {/* Right: Results */}
        <div className="space-y-4">
          {/* AF Timeline */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <AfStationTimeline stages={gen.currentRun?.stages ?? []} generating={gen.generating} />
          </div>

          {/* Generated Code Stats */}
          {gen.currentRun && (
            <>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <GeneratedCodeViewer
                  codeLength={gen.currentRun.generatedCodeLength}
                  factoryEntries={gen.currentRun.factoryEntries}
                  flowId={gen.currentRun.flowId}
                />
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <QualityScoreCard run={gen.currentRun} />
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <FeedbackPanel
                  onSubmit={(_rating, _comment) => {
                    // feedback submission is handled server-side
                  }}
                />
              </div>
            </>
          )}

          {!gen.currentRun && !gen.generating && (
            <div
              className="text-center py-12 text-gray-400 bg-white rounded-lg border border-gray-200"
              data-testid="lab-no-results"
            >
              <p className="text-lg mb-1">No generation results yet</p>
              <p className="text-sm">Edit the spec and click Generate to start</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

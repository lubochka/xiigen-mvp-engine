/**
 * GenerationLab Components — NEW key test surface for the engine.
 *
 * ContractSpecEditor — JSON editor for engine contract spec
 * AfStationTimeline — vertical timeline showing AF-1→AF-11 execution
 * GeneratedCodeViewer — syntax-highlighted code output
 * QualityScoreCard — score breakdown card
 * FeedbackPanel — good/neutral/bad buttons + comment
 */

import React, { useState } from 'react';
import { StatusBadge } from '../common/StatusBadge';
import type { GenerationRun } from '../../hooks/useGenerationHistory';

// ── ContractSpecEditor ──────────────────────────────

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

interface ContractSpecEditorProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export function ContractSpecEditor({ value, onChange, error }: ContractSpecEditorProps) {
  return (
    <div data-testid="contract-spec-editor">
      <h3 className="text-sm font-semibold text-gray-700 mb-2">Engine Contract Spec</h3>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full h-64 px-3 py-2 text-xs font-mono border rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          error ? 'border-red-300 bg-red-50' : 'border-gray-200'
        }`}
        placeholder="Paste or edit engine contract JSON..."
        data-testid="spec-textarea"
      />
      {error && (
        <p className="text-xs text-red-500 mt-1" data-testid="spec-error">
          {error}
        </p>
      )}
      <button
        onClick={() => onChange(DEFAULT_SPEC)}
        className="mt-1 text-xs text-blue-600 hover:underline"
        data-testid="spec-load-sample"
      >
        Load sample T44 spec
      </button>
    </div>
  );
}

// ── AfStationTimeline ───────────────────────────────

const AF_STATION_NAMES: Record<string, string> = {
  INVENTORY: 'INVENTORY (AF-3 Prompts + AF-4 RAG)',
  SYNTHESIS: 'SYNTHESIS (AF-2 Plan + AF-1 Generate)',
  JUDGMENT: 'JUDGMENT (AF-6 Review + AF-7 DNA + AF-8 Security + AF-9 Score)',
};

interface AfStationTimelineProps {
  stages: GenerationRun['stages'];
  generating: boolean;
}

export function AfStationTimeline({ stages, generating }: AfStationTimelineProps) {
  return (
    <div data-testid="af-station-timeline">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">AF Pipeline Execution</h3>
      {generating && stages.length === 0 && (
        <div
          className="flex items-center gap-2 text-sm text-blue-600"
          data-testid="timeline-generating"
        >
          <div className="w-4 h-4 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          Running pipeline…
        </div>
      )}
      <div className="space-y-0">
        {stages.map((stage, i) => (
          <div
            key={i}
            className="flex items-start gap-3"
            data-testid={`timeline-stage-${stage.stage}`}
          >
            {/* Dot + line */}
            <div className="flex flex-col items-center">
              <div
                className={`w-3 h-3 rounded-full mt-1.5 ${
                  stage.success ? 'bg-green-500' : 'bg-red-500'
                }`}
              />
              {i < stages.length - 1 && <div className="w-0.5 h-8 bg-gray-200" />}
            </div>
            {/* Content */}
            <div className="pb-4 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  {AF_STATION_NAMES[stage.stage] ?? stage.stage}
                </span>
                <div className="flex items-center gap-2">
                  <StatusBadge status={stage.success ? 'SUCCESS' : 'FAILED'} />
                  <span className="text-xs text-gray-400">{stage.elapsedMs}ms</span>
                </div>
              </div>
              {stage.details && (
                <div className="mt-1 text-xs text-gray-500">
                  {Object.entries(stage.details)
                    .slice(0, 4)
                    .map(([k, v]) => (
                      <span key={k} className="mr-3">
                        {k}: {JSON.stringify(v)}
                      </span>
                    ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── GeneratedCodeViewer ─────────────────────────────

interface GeneratedCodeViewerProps {
  codeLength: number;
  factoryEntries: Array<Record<string, unknown>>;
  flowId: string;
}

export function GeneratedCodeViewer({
  codeLength,
  factoryEntries,
  flowId,
}: GeneratedCodeViewerProps) {
  return (
    <div data-testid="generated-code-viewer">
      <h3 className="text-sm font-semibold text-gray-700 mb-2">Generation Output</h3>
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div className="bg-gray-50 rounded p-3 text-center">
          <p className="text-xs text-gray-400">Code Length</p>
          <p className="text-lg font-semibold text-gray-900" data-testid="code-length">
            {codeLength.toLocaleString()}
          </p>
          <p className="text-xs text-gray-400">characters</p>
        </div>
        <div className="bg-gray-50 rounded p-3 text-center">
          <p className="text-xs text-gray-400">Factories</p>
          <p className="text-lg font-semibold text-gray-900" data-testid="factory-count">
            {factoryEntries.length}
          </p>
          <p className="text-xs text-gray-400">registered</p>
        </div>
        <div className="bg-gray-50 rounded p-3 text-center">
          <p className="text-xs text-gray-400">Flow ID</p>
          <p className="text-sm font-mono text-gray-700 truncate" data-testid="flow-id">
            {flowId || '—'}
          </p>
        </div>
      </div>
      {factoryEntries.length > 0 && (
        <div className="text-xs space-y-1" data-testid="factory-entries">
          {factoryEntries.map((f, i) => (
            <div
              key={i}
              className="flex items-center gap-2 text-gray-600 bg-gray-50 rounded px-2 py-1"
            >
              <span className="font-mono font-medium">{f.factory_id as string}</span>
              <span className="text-gray-400">→</span>
              <span>{f.interface_name as string}</span>
              <span className="text-gray-400">({f.fabric_type as string})</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── QualityScoreCard ────────────────────────────────

interface QualityScoreCardProps {
  run: GenerationRun;
}

export function QualityScoreCard({ run }: QualityScoreCardProps) {
  return (
    <div data-testid="quality-score-card">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Quality Assessment</h3>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-50 rounded p-3">
          <p className="text-xs text-gray-400">Pipeline</p>
          <StatusBadge status={run.pipelinePassed ? 'COMPLETED' : 'FAILED'} size="md" />
        </div>
        <div className="bg-gray-50 rounded p-3">
          <p className="text-xs text-gray-400">Promotion</p>
          <StatusBadge status={run.promotionLevel} size="md" />
        </div>
        <div className="bg-gray-50 rounded p-3">
          <p className="text-xs text-gray-400">BFA Status</p>
          <StatusBadge status={run.bfaStatus || 'UNKNOWN'} size="md" />
        </div>
        <div className="bg-gray-50 rounded p-3">
          <p className="text-xs text-gray-400">Duration</p>
          <p className="text-lg font-semibold text-gray-900">{run.elapsedMs}ms</p>
        </div>
      </div>

      {run.errors.length > 0 && (
        <div className="mt-3" data-testid="quality-errors">
          <p className="text-xs font-semibold text-red-600 mb-1">Errors ({run.errors.length})</p>
          {run.errors.map((e, i) => (
            <p key={i} className="text-xs text-red-500 truncate">
              {e}
            </p>
          ))}
        </div>
      )}

      {run.warnings.length > 0 && (
        <div className="mt-2" data-testid="quality-warnings">
          <p className="text-xs font-semibold text-yellow-600 mb-1">
            Warnings ({run.warnings.length})
          </p>
          {run.warnings.map((w, i) => (
            <p key={i} className="text-xs text-yellow-500 truncate">
              {w}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

// ── FeedbackPanel ───────────────────────────────────

interface FeedbackPanelProps {
  onSubmit: (rating: 'good' | 'neutral' | 'bad', comment: string) => void;
}

export function FeedbackPanel({ onSubmit }: FeedbackPanelProps) {
  const [rating, setRating] = useState<'good' | 'neutral' | 'bad' | null>(null);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!rating) return;
    onSubmit(rating, comment);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="text-center py-4 text-green-600" data-testid="feedback-submitted">
        Thank you for your feedback!
      </div>
    );
  }

  return (
    <div data-testid="feedback-panel">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Human Feedback</h3>
      <div className="flex gap-2 mb-3">
        {(['good', 'neutral', 'bad'] as const).map((r) => (
          <button
            key={r}
            onClick={() => setRating(r)}
            className={`flex-1 py-2 text-sm rounded-lg border ${
              rating === r
                ? r === 'good'
                  ? 'bg-green-100 border-green-500 text-green-700'
                  : r === 'bad'
                    ? 'bg-red-100 border-red-500 text-red-700'
                    : 'bg-gray-100 border-gray-500 text-gray-700'
                : 'border-gray-200 text-gray-500 hover:bg-gray-50'
            }`}
            data-testid={`feedback-${r}`}
          >
            {r === 'good' ? '👍 Good' : r === 'bad' ? '👎 Bad' : '😐 Neutral'}
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Optional comment..."
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg h-16 resize-none"
        data-testid="feedback-comment"
      />
      <button
        onClick={handleSubmit}
        disabled={!rating}
        className="mt-2 w-full py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        data-testid="feedback-submit"
      >
        Submit Feedback
      </button>
    </div>
  );
}

import React, { useState } from 'react';

interface PlanStep {
  index: number;
  text: string;
  intClause: string;
  dependencies: number[];
}
interface PlannerResult {
  planSteps: PlanStep[];
  grade: number;
  reviewerGaps: string[];
  accepted: boolean;
  plannerModel: string;
  reviewerModel: string;
}
interface VisibilityRecord {
  sent?: Record<string, unknown>;
  received?: Record<string, unknown>;
  decided?: Record<string, unknown>;
}

interface CycleOnePlannerProps {
  onResult?: (result: PlannerResult) => void;
}

export function CycleOnePlanner({ onResult }: CycleOnePlannerProps) {
  const [intent, setIntent] = useState('');
  const [status, setStatus] = useState<'idle' | 'planning' | 'done' | 'error'>('idle');
  const [result, setResult] = useState<PlannerResult | null>(null);
  const [visibility, setVisibility] = useState<VisibilityRecord | null>(null);
  const [visExpanded, setVisExpanded] = useState(false);

  const gradeColor = (g: number) =>
    g >= 0.85 ? 'text-green-600' : g >= 0.65 ? 'text-yellow-600' : 'text-red-600';
  const gradeBadge = (g: number) => (g >= 0.85 ? 'green' : g >= 0.65 ? 'yellow' : 'red');

  async function run() {
    if (!intent.trim()) return;
    setStatus('planning');
    try {
      const resp = await fetch('/api/cycles/planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIntent: intent }),
      });
      if (!resp.ok) {
        setStatus('error');
        return;
      }
      const data = (await resp.json()) as { result: PlannerResult; visibility: VisibilityRecord };
      setResult(data.result);
      setVisibility(data.visibility ?? null);
      setStatus('done');
      onResult?.(data.result);
    } catch {
      setStatus('error');
    }
  }

  return (
    <div data-testid="cycle-one-planner">
      <h3 className="text-sm font-semibold text-gray-700 mb-2">Cycle 1 — Planner</h3>
      <textarea
        value={intent}
        onChange={(e) => setIntent(e.target.value)}
        placeholder="Enter user intent..."
        className="w-full h-24 px-3 py-2 text-xs border rounded mb-2"
        data-testid="intent-input"
      />
      <button
        onClick={run}
        disabled={!navigator.onLine || status === 'planning'}
        className="px-4 py-2 bg-blue-600 text-white rounded text-sm disabled:opacity-50"
        data-testid="run-button"
      >
        {status === 'planning' ? 'Planning...' : 'Run Planner'}
      </button>
      {status === 'planning' && <p data-testid="planning-indicator">Planning...</p>}
      {result && (
        <div data-testid="plan-result">
          <div
            data-testid={`grade-badge-${gradeBadge(result.grade)}`}
            className={`font-bold ${gradeColor(result.grade)}`}
          >
            Grade: {result.grade.toFixed(3)} {result.accepted ? '✓ ACCEPTED' : '✗ REJECTED'}
          </div>
          <ol data-testid="plan-steps">
            {result.planSteps.map((s, i) => (
              <li key={i} data-testid={`step-${s.index}`}>
                {s.index}. {s.text} <span className="text-xs text-gray-400">({s.intClause})</span>
              </li>
            ))}
          </ol>
        </div>
      )}
      {visibility && (
        <div data-testid="visibility-panel">
          <button onClick={() => setVisExpanded((v) => !v)} data-testid="visibility-toggle">
            {visExpanded ? '▼' : '▶'} Visibility
          </button>
          {visExpanded && (
            <div data-testid="visibility-expanded">
              <details>
                <summary>SENT</summary>
                <pre data-testid="sent-panel">{JSON.stringify(visibility.sent, null, 2)}</pre>
              </details>
              <details>
                <summary>RECEIVED</summary>
                <pre data-testid="received-panel">
                  {JSON.stringify(visibility.received, null, 2)}
                </pre>
              </details>
              <details>
                <summary>DECIDED</summary>
                <pre data-testid="decided-panel">{JSON.stringify(visibility.decided, null, 2)}</pre>
              </details>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import React, { useState } from 'react';

interface ArbiterVerdict {
  arbiter: string;
  verdict: 'PASS' | 'CONCERN' | 'BLOCK';
  criterion: string;
  detail: string;
}

interface ConvergenceResult {
  winningNode: Record<string, unknown>;
  candidateA: string | null;
  candidateB: string | null;
  candidateC: string | null;
  judgeReasoning: string;
  arbiterVerdicts: ArbiterVerdict[];
  convergenceScore: number;
  grade: number;
  accepted: boolean;
  shuffleWasApplied: boolean;
}

interface VisibilityRecord {
  sent?: Record<string, unknown>;
  received?: Record<string, unknown>;
  decided?: Record<string, unknown>;
}

interface CycleTwoConvergenceProps {
  onResult?: (result: ConvergenceResult) => void;
}

export function CycleTwoConvergence({ onResult }: CycleTwoConvergenceProps) {
  const [stepText, setStepText] = useState('');
  const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [result, setResult] = useState<ConvergenceResult | null>(null);
  const [visibility, setVisibility] = useState<VisibilityRecord | null>(null);
  const [visExpanded, setVisExpanded] = useState(false);
  const [expandedCandidate, setExpandedCandidate] = useState<string | null>(null);

  const gradeColor = (g: number) =>
    g >= 0.85 ? 'text-green-600' : g >= 0.65 ? 'text-yellow-600' : 'text-red-600';
  const gradeBadge = (g: number) => (g >= 0.85 ? 'green' : g >= 0.65 ? 'yellow' : 'red');

  async function run() {
    if (!stepText.trim()) return;
    setStatus('running');
    try {
      const resp = await fetch('/api/cycles/convergence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stepText }),
      });
      if (!resp.ok) {
        setStatus('error');
        return;
      }
      const data = (await resp.json()) as {
        result: ConvergenceResult;
        visibility: VisibilityRecord;
      };
      setResult(data.result);
      setVisibility(data.visibility ?? null);
      setStatus('done');
      onResult?.(data.result);
    } catch {
      setStatus('error');
    }
  }

  const hasBlock = result?.arbiterVerdicts.some((v) => v.verdict === 'BLOCK') ?? false;

  return (
    <div data-testid="cycle-two-convergence">
      <h3 className="text-sm font-semibold text-gray-700 mb-2">Cycle 2 — Convergence</h3>
      <textarea
        value={stepText}
        onChange={(e) => setStepText(e.target.value)}
        placeholder="Enter step text..."
        className="w-full h-24 px-3 py-2 text-xs border rounded mb-2"
        data-testid="step-input"
      />
      <button
        onClick={run}
        disabled={status === 'running'}
        className="px-4 py-2 bg-blue-600 text-white rounded text-sm disabled:opacity-50"
        data-testid="run-button"
      >
        {status === 'running' ? 'Running...' : 'Run Convergence'}
      </button>

      {result && (
        <div data-testid="convergence-result">
          {/* Grade badge */}
          <div
            data-testid={`grade-badge-${gradeBadge(result.grade)}`}
            className={`font-bold ${gradeColor(result.grade)}`}
          >
            Grade: {result.grade.toFixed(3)} {result.accepted ? '✓ ACCEPTED' : '✗ REJECTED'}
            {!result.accepted && result.grade < 0.85 && (
              <span data-testid="retry-indicator" className="ml-2 text-orange-500">
                ↻ Retry needed
              </span>
            )}
          </div>

          {/* Convergence score */}
          <div data-testid="convergence-score">
            Convergence: {(result.convergenceScore * 100).toFixed(0)}%
          </div>

          {/* 3 Candidate panels side by side */}
          <div data-testid="candidate-panels" className="flex gap-2 mt-2">
            {(['A', 'B', 'C'] as const).map((label) => {
              const text =
                label === 'A'
                  ? result.candidateA
                  : label === 'B'
                    ? result.candidateB
                    : result.candidateC;
              if (!text) return null;
              const isWinner = (() => {
                // Find which candidate matches the winning node
                try {
                  return JSON.stringify(JSON.parse(text)) === JSON.stringify(result.winningNode);
                } catch {
                  return false;
                }
              })();
              return (
                <div
                  key={label}
                  data-testid={`candidate-panel-${label}`}
                  className={`border rounded p-2 flex-1 ${isWinner ? 'border-green-500 bg-green-50' : ''}`}
                >
                  <div className="font-semibold text-xs">
                    Candidate {label}
                    {isWinner && (
                      <span data-testid="winner-badge" className="ml-1 text-green-600">
                        ★ Winner
                      </span>
                    )}
                    {isWinner && hasBlock && (
                      <span
                        data-testid="block-badge"
                        className="ml-1 text-red-600 bg-red-100 px-1 rounded text-xs"
                      >
                        BLOCK
                      </span>
                    )}
                  </div>
                  <button
                    className="text-xs text-blue-500"
                    onClick={() => setExpandedCandidate(expandedCandidate === label ? null : label)}
                    data-testid={`expand-candidate-${label}`}
                  >
                    {expandedCandidate === label ? '▼' : '▶'} Details
                  </button>
                  {expandedCandidate === label && (
                    <div data-testid={`candidate-details-${label}`} className="text-xs mt-1">
                      <pre className="overflow-auto max-h-32">{text}</pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Winning node */}
          <div data-testid="winning-node" className="mt-2 border rounded p-2">
            <div className="font-semibold text-xs mb-1">Winning NODE</div>
            <details data-testid="winning-node-structure">
              <summary>Structure</summary>
              <pre className="text-xs">
                {JSON.stringify(result.winningNode['structure'], null, 2)}
              </pre>
            </details>
            <details data-testid="winning-node-intent">
              <summary>Intent</summary>
              <pre className="text-xs">{JSON.stringify(result.winningNode['intent'], null, 2)}</pre>
            </details>
            <details data-testid="winning-node-constraints">
              <summary>Constraints</summary>
              <pre className="text-xs">
                {JSON.stringify(result.winningNode['constraints'], null, 2)}
              </pre>
            </details>
            <details data-testid="winning-node-quality">
              <summary>Quality</summary>
              <pre className="text-xs">
                {JSON.stringify(result.winningNode['quality'], null, 2)}
              </pre>
            </details>
          </div>

          {/* Judge reasoning */}
          <div data-testid="judge-reasoning" className="mt-2 text-xs text-gray-600">
            <strong>Judge reasoning:</strong> {result.judgeReasoning}
          </div>

          {/* Arbiter verdicts */}
          <div data-testid="arbiter-verdicts" className="mt-2">
            {result.arbiterVerdicts.map((v, i) => (
              <div
                key={i}
                data-testid={`arbiter-verdict-${v.arbiter}`}
                className={`text-xs px-2 py-1 rounded mb-1 ${v.verdict === 'PASS' ? 'bg-green-100' : v.verdict === 'BLOCK' ? 'bg-red-100' : 'bg-yellow-100'}`}
              >
                <span className="font-semibold">{v.arbiter}:</span> {v.verdict} — {v.detail}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Visibility panel */}
      {visibility && (
        <div data-testid="visibility-panel" className="mt-2">
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

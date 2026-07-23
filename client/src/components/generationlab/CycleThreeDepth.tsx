import React, { useState } from 'react';

interface SubFlowNode {
  name: string;
  intClause: string;
  isDistinct: boolean;
}

interface DepthResult {
  verdict: 'LEAF' | 'EXPAND';
  justification: string;
  signalsEvaluated: string[];
  signalsTriggered: string[];
  subFlowDecomposition: SubFlowNode[] | null;
  terminationBoundApplied: boolean;
  grade: number;
  accepted: boolean;
}

interface VisibilityRecord {
  sent?: Record<string, unknown>;
  received?: Record<string, unknown>;
  decided?: Record<string, unknown>;
}

interface CycleThreeDepthProps {
  onResult?: (result: DepthResult) => void;
}

const ALL_SIGNALS = ['S1', 'S2', 'S3', 'S4', 'S5'];
const SIGNAL_DESCRIPTIONS: Record<string, string> = {
  S1: 'Multi-clause intent',
  S2: 'Branching conditions',
  S3: 'External aggregate dependencies',
  S4: 'State machine presence',
  S5: 'Composition depth',
};

export function CycleThreeDepth({ onResult }: CycleThreeDepthProps) {
  const [nodeText, setNodeText] = useState('');
  const [currentDepth, setCurrentDepth] = useState(1);
  const [terminationDepth, setTerminationDepth] = useState(3);
  const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [result, setResult] = useState<DepthResult | null>(null);
  const [visibility, setVisibility] = useState<VisibilityRecord | null>(null);
  const [visExpanded, setVisExpanded] = useState(false);

  async function run() {
    if (!nodeText.trim()) return;
    setStatus('running');
    try {
      const resp = await fetch('/api/cycles/depth-decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verifiedNode: JSON.parse(nodeText),
          currentDepth,
          terminationDepth,
        }),
      });
      if (!resp.ok) {
        setStatus('error');
        return;
      }
      const data = (await resp.json()) as { result: DepthResult; visibility: VisibilityRecord };
      setResult(data.result);
      setVisibility(data.visibility ?? null);
      setStatus('done');
      onResult?.(data.result);
    } catch {
      setStatus('error');
    }
  }

  return (
    <div data-testid="cycle-three-depth">
      <h3 className="text-sm font-semibold text-gray-700 mb-2">Cycle 3 — Depth Decision</h3>

      <div className="flex gap-2 mb-2">
        <label className="text-xs">
          Current Depth:
          <input
            type="number"
            value={currentDepth}
            onChange={(e) => setCurrentDepth(Number(e.target.value))}
            className="ml-1 w-16 border rounded px-1"
            data-testid="current-depth-input"
          />
        </label>
        <label className="text-xs">
          Termination Depth:
          <input
            type="number"
            value={terminationDepth}
            onChange={(e) => setTerminationDepth(Number(e.target.value))}
            className="ml-1 w-16 border rounded px-1"
            data-testid="termination-depth-input"
          />
        </label>
      </div>

      {/* Depth indicator */}
      <div data-testid="depth-indicator" className="text-xs text-gray-500 mb-2">
        Depth {currentDepth} / {terminationDepth}
        {currentDepth >= terminationDepth && (
          <span className="ml-2 text-orange-500 font-semibold">— Termination bound reached</span>
        )}
      </div>

      <textarea
        value={nodeText}
        onChange={(e) => setNodeText(e.target.value)}
        placeholder="Paste NODE JSON here..."
        className="w-full h-32 px-3 py-2 text-xs border rounded mb-2 font-mono"
        data-testid="node-input"
      />

      <button
        onClick={run}
        disabled={status === 'running'}
        className="px-4 py-2 bg-blue-600 text-white rounded text-sm disabled:opacity-50"
        data-testid="run-button"
      >
        {status === 'running' ? 'Deciding...' : 'Run Depth Decision'}
      </button>

      {result && (
        <div data-testid="depth-result" className="mt-2">
          {/* Verdict badge */}
          <div
            data-testid={`verdict-badge-${result.verdict.toLowerCase()}`}
            className={`inline-block px-3 py-1 rounded font-bold text-sm ${result.verdict === 'LEAF' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}
          >
            {result.verdict}
          </div>

          {/* Termination bound banner */}
          {result.terminationBoundApplied && (
            <div
              data-testid="termination-bound-banner"
              className="mt-2 px-3 py-2 bg-orange-100 text-orange-700 rounded text-sm"
            >
              Termination bound applied — depth limit reached, LEAF enforced
            </div>
          )}

          {/* Justification */}
          <div data-testid="justification" className="mt-2 text-xs text-gray-600">
            {result.justification}
          </div>

          {/* Signal evaluation table */}
          <div data-testid="signal-table" className="mt-2">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border px-2 py-1">Signal</th>
                  <th className="border px-2 py-1">Description</th>
                  <th className="border px-2 py-1">Evaluated</th>
                  <th className="border px-2 py-1">Triggered</th>
                </tr>
              </thead>
              <tbody>
                {ALL_SIGNALS.map((signal) => {
                  const evaluated = result.signalsEvaluated.includes(signal);
                  const triggered = result.signalsTriggered.includes(signal);
                  return (
                    <tr
                      key={signal}
                      data-testid={`signal-row-${signal}`}
                      className={triggered ? 'bg-yellow-50' : ''}
                    >
                      <td className="border px-2 py-1 font-semibold">{signal}</td>
                      <td className="border px-2 py-1">{SIGNAL_DESCRIPTIONS[signal]}</td>
                      <td className="border px-2 py-1 text-center">{evaluated ? '✓' : '—'}</td>
                      <td className="border px-2 py-1 text-center">
                        {triggered ? (
                          <span
                            data-testid={`signal-triggered-${signal}`}
                            className="text-orange-600 font-bold"
                          >
                            ✓
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Sub-node list (EXPAND only) */}
          {result.verdict === 'EXPAND' && result.subFlowDecomposition && (
            <div data-testid="sub-node-list" className="mt-2">
              <div className="font-semibold text-xs mb-1">Sub-Flow Decomposition</div>
              {result.subFlowDecomposition.map((node, i) => (
                <div
                  key={i}
                  data-testid={`sub-node-${i}`}
                  className={`text-xs border rounded px-2 py-1 mb-1 ${!node.isDistinct ? 'border-orange-400 bg-orange-50' : 'border-green-300'}`}
                >
                  <span className="font-semibold">{node.name}</span>
                  <span className="ml-2 text-gray-500">({node.intClause})</span>
                  {!node.isDistinct && (
                    <span data-testid={`overlap-warning-${i}`} className="ml-2 text-orange-500">
                      ⚠ Overlapping
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* DECIDED section with signal citations */}
          <div data-testid="decided-section" className="mt-2 text-xs">
            <strong>Grade:</strong> {result.grade.toFixed(3)}
            {result.signalsTriggered.length > 0 && (
              <span data-testid="signal-citations" className="ml-2 text-gray-500">
                (signals: {result.signalsTriggered.join(', ')})
              </span>
            )}
            {result.terminationBoundApplied && (
              <span data-testid="bound-citation" className="ml-2 text-orange-500">
                (bound enforced)
              </span>
            )}
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

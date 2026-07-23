/**
 * MatchingPage — FLOW-02 Phase B screen.
 * Route: /matching?userId=...
 *
 * B1 compatibility scoring has a 30s timeout = SUCCESS MODE (partialResults:true).
 * B2 forwards partialResults to this page.
 *
 * Playwright mock hooks (driven by userId):
 *   usr-partial-test   → partial results state (B1 timeout scenario)
 *   usr-complete-test  → complete match results
 *   usr-matching-test  → matching in progress spinner
 *   otherwise          → spinner (default)
 */

import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useProfileEnrichmentAdaptation } from '../../hooks/useProfileEnrichmentAdaptation';
import { ProfileEnrichmentAdaptationBanner } from './ProfileEnrichmentAdaptationBanner';

type MatchState = 'in-progress' | 'partial' | 'complete';

const MOCK_CONNECTIONS = [
  { id: 'conn-1', name: 'Acme Corp', score: 94 },
  { id: 'conn-2', name: 'Beta Ventures', score: 87 },
  { id: 'conn-3', name: 'Gamma Studio', score: 81 },
];

const PARTIAL_CONNECTIONS = [
  { id: 'conn-1', name: 'Acme Corp', score: 94 },
  { id: 'conn-2', name: 'Beta Ventures', score: 87 },
];

function resolveMatchState(userId: string): MatchState {
  if (userId.includes('partial')) return 'partial';
  if (userId.includes('complete')) return 'complete';
  if (userId.includes('matching')) return 'in-progress';
  return 'in-progress';
}

export function MatchingPage() {
  const [searchParams] = useSearchParams();
  const adaptation = useProfileEnrichmentAdaptation();
  const userId = searchParams.get('userId') ?? '';

  const state = resolveMatchState(userId);

  if (state === 'in-progress') {
    return (
      <div
        className="max-w-md mx-auto mt-16 p-8 bg-white rounded-lg shadow text-center"
        data-testid="page-matching"
      >
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Finding Your Matches</h1>
        <ProfileEnrichmentAdaptationBanner adaptation={adaptation} compact />
        <div data-testid="matching-in-progress" className="py-8">
          <div className="inline-block w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-500 text-sm">Analysing compatibility across your network…</p>
        </div>
      </div>
    );
  }

  if (state === 'partial') {
    return (
      <div
        className="max-w-md mx-auto mt-16 p-8 bg-white rounded-lg shadow"
        data-testid="page-matching"
      >
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Your Matches</h1>
        <ProfileEnrichmentAdaptationBanner adaptation={adaptation} compact />
        <div data-testid="matching-partial" className="space-y-3">
          <div
            data-testid="partial-results-notice"
            className="p-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-700"
          >
            <p className="font-medium">Matches still being refined</p>
            <p className="text-xs mt-1 text-amber-600">
              Some compatibility checks are still running. Results shown are confirmed so far.
            </p>
          </div>
          {PARTIAL_CONNECTIONS.map((conn) => (
            <div
              key={conn.id}
              className="flex items-center justify-between p-3 border border-gray-200 rounded"
            >
              <span className="text-sm font-medium text-gray-800">{conn.name}</span>
              <span className="text-xs text-gray-500">Score: {conn.score}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // complete
  return (
    <div
      className="max-w-md mx-auto mt-16 p-8 bg-white rounded-lg shadow"
      data-testid="page-matching"
  >
    <h1 className="text-2xl font-bold text-gray-900 mb-4">Your Matches</h1>
    <ProfileEnrichmentAdaptationBanner adaptation={adaptation} compact />
    <div data-testid="matching-complete" className="space-y-3">
        <div className="p-3 bg-green-50 border border-green-200 rounded text-sm text-green-700 mb-4">
          <p className="font-medium">Matching complete</p>
          <p className="text-xs mt-1 text-green-600">
            All compatibility checks finished. Here are your best connections.
          </p>
        </div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs text-gray-500">Connections found:</span>
          <span data-testid="connection-count" className="text-sm font-bold text-blue-600">
            {MOCK_CONNECTIONS.length}
          </span>
        </div>
        {MOCK_CONNECTIONS.map((conn) => (
          <div
            key={conn.id}
            className="flex items-center justify-between p-3 border border-gray-200 rounded"
          >
            <span className="text-sm font-medium text-gray-800">{conn.name}</span>
            <span className="text-xs text-gray-500">Score: {conn.score}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

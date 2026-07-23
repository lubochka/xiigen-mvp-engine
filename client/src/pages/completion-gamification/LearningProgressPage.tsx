/**
 * LearningProgressPage — FLOW-05 learning progress overview.
 * Route: /learning/progress
 *
 * Playwright mock hooks (driven by query params):
 *   ?mock=loaded   → full progress view (data-testid="learning-progress")
 *   ?mock=pending  → adaptation pending state (data-testid="adaptation-pending")
 *   otherwise      → loading state
 */

import React from 'react';
import { useSearchParams } from 'react-router-dom';

type Classification = 'STRONG' | 'AVERAGE' | 'NEEDS_IMPROVEMENT';

interface PerformanceEntry {
  topic: string;
  scorePercent: number;
  classification: Classification;
  date: string;
}

const MOCK_HISTORY: PerformanceEntry[] = [
  {
    topic: 'Introduction to Algebra',
    scorePercent: 92,
    classification: 'STRONG',
    date: '2026-04-10',
  },
  { topic: 'Linear Equations', scorePercent: 75, classification: 'AVERAGE', date: '2026-04-09' },
  {
    topic: 'Quadratic Equations',
    scorePercent: 55,
    classification: 'NEEDS_IMPROVEMENT',
    date: '2026-04-08',
  },
];

const MOCK_CURRICULUM = [
  { topic: 'Quadratic Equations', status: 'IN_PROGRESS', suggestion: 'Review factoring methods' },
  { topic: 'Polynomial Functions', status: 'UPCOMING', suggestion: null },
  { topic: 'Trigonometry Basics', status: 'UPCOMING', suggestion: null },
];

const CLASSIFICATION_COLORS: Record<Classification, string> = {
  STRONG: 'text-green-600 bg-green-50',
  AVERAGE: 'text-yellow-600 bg-yellow-50',
  NEEDS_IMPROVEMENT: 'text-red-600 bg-red-50',
};

export function LearningProgressPage() {
  const [searchParams] = useSearchParams();
  const mockState = searchParams.get('mock');

  if (mockState === 'pending') {
    return (
      <div
        className="max-w-3xl mx-auto mt-10 p-8 bg-white rounded-lg shadow"
        data-testid="learning-progress"
      >
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Learning Progress</h1>
        <div
          data-testid="adaptation-pending"
          className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-4"
        >
          <p className="text-yellow-700 font-medium">Adaptation Pending</p>
          <p className="text-yellow-600 text-sm mt-1">
            Your curriculum is being personalised based on your recent performance. This usually
            takes a few moments.
          </p>
        </div>
        <div className="text-gray-400 text-sm">Updating your learning path...</div>
      </div>
    );
  }

  if (mockState === 'loaded') {
    return (
      <div
        className="max-w-3xl mx-auto mt-10 p-8 bg-white rounded-lg shadow"
        data-testid="learning-progress"
      >
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Learning Progress</h1>

        {/* Performance history */}
        <section className="mb-8" data-testid="performance-history">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Performance History</h2>
          <div className="divide-y">
            {MOCK_HISTORY.map((entry, idx) => (
              <div key={idx} className="flex items-center justify-between py-4">
                <div>
                  <div className="font-medium text-gray-800">{entry.topic}</div>
                  <div className="text-sm text-gray-400">{entry.date}</div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-gray-700">{entry.scorePercent}%</span>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${CLASSIFICATION_COLORS[entry.classification]}`}
                    data-testid={`classification-${idx}`}
                  >
                    {entry.classification.replace('_', ' ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Active curriculum */}
        <section data-testid="active-curriculum">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Active Curriculum</h2>
          <div className="space-y-3">
            {MOCK_CURRICULUM.map((item, idx) => (
              <div
                key={idx}
                className="p-4 border rounded-lg flex items-start justify-between"
                data-testid={`curriculum-item-${idx}`}
              >
                <div>
                  <div className="font-medium text-gray-800">{item.topic}</div>
                  {item.suggestion && (
                    <div className="text-sm text-blue-600 mt-1" data-testid="adaptation-suggestion">
                      Suggestion: {item.suggestion}
                    </div>
                  )}
                </div>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    item.status === 'IN_PROGRESS'
                      ? 'bg-blue-50 text-blue-600'
                      : 'bg-gray-50 text-gray-500'
                  }`}
                >
                  {item.status.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  }

  // Default state
  return (
    <div
      className="max-w-3xl mx-auto mt-10 p-8 bg-white rounded-lg shadow"
      data-testid="learning-progress"
    >
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Learning Progress</h1>
      <div className="text-gray-500 text-sm">Loading your progress data...</div>
    </div>
  );
}

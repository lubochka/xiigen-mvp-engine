/**
 * ModelLeaderboardPage — which AI model is best at what.
 * Phase 10.5: Learning page.
 */

import React from 'react';
import { useModelPerformance } from '../hooks/useLearningData';
import { ModelScoreTable, ScoreTrendChart } from '../components/learning';

export function ModelLeaderboardPage() {
  const { scores, trends, taskTypes, selectedTaskType, setSelectedTaskType } =
    useModelPerformance();

  return (
    <div data-testid="page-modelleaderboard">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Model Leaderboard</h1>
      <p className="text-sm text-gray-500 mb-6">Per-task-type AI model rankings and score trends</p>

      {/* Task type filter */}
      <div className="flex gap-1 mb-4" data-testid="task-type-filter">
        <button
          onClick={() => setSelectedTaskType(null)}
          className={`px-3 py-1.5 text-xs rounded-full ${!selectedTaskType ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          data-testid="filter-all"
        >
          All
        </button>
        {taskTypes.map((tt) => (
          <button
            key={tt}
            onClick={() => setSelectedTaskType(tt)}
            className={`px-3 py-1.5 text-xs rounded-full ${selectedTaskType === tt ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            data-testid={`filter-${tt}`}
          >
            {tt}
          </button>
        ))}
      </div>

      {/* Rankings table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-4">
        <ModelScoreTable scores={scores} />
      </div>

      {/* Score trends */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <ScoreTrendChart trends={trends} />
      </div>
    </div>
  );
}

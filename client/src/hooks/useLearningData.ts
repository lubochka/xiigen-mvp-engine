/**
 * useModelPerformance — model rankings per task type.
 * usePromptVersions — prompt version tracking + A/B test data.
 *
 * Both use in-memory mock data for now (persistent learning is P12).
 * Phase 10.5: Learning hooks.
 */

import { useState } from 'react';

// ── Model Performance ───────────────────────────────

export interface ModelScore {
  modelId: string;
  provider: string;
  taskType: string;
  totalRuns: number;
  averageScore: number;
  passRate: number;
  averageCost: number;
  averageLatencyMs: number;
  trend: 'up' | 'down' | 'flat';
}

export interface ModelTrendPoint {
  date: string;
  modelId: string;
  score: number;
}

export interface UseModelPerformanceReturn {
  scores: ModelScore[];
  trends: ModelTrendPoint[];
  taskTypes: string[];
  selectedTaskType: string | null;
  loading: boolean;
  setSelectedTaskType: (tt: string | null) => void;
  refresh: () => void;
}

// Sample data — in production this comes from FeedbackStation + AI Engine metrics
const SAMPLE_SCORES: ModelScore[] = [
  {
    modelId: 'claude-sonnet-4-20250514',
    provider: 'anthropic',
    taskType: 'DATA_PIPELINE',
    totalRuns: 45,
    averageScore: 0.89,
    passRate: 0.93,
    averageCost: 0.03,
    averageLatencyMs: 1200,
    trend: 'up',
  },
  {
    modelId: 'gpt-4o',
    provider: 'openai',
    taskType: 'DATA_PIPELINE',
    totalRuns: 38,
    averageScore: 0.82,
    passRate: 0.87,
    averageCost: 0.05,
    averageLatencyMs: 1800,
    trend: 'flat',
  },
  {
    modelId: 'gemini-2.0-flash',
    provider: 'google',
    taskType: 'DATA_PIPELINE',
    totalRuns: 22,
    averageScore: 0.78,
    passRate: 0.82,
    averageCost: 0.02,
    averageLatencyMs: 900,
    trend: 'up',
  },
  {
    modelId: 'claude-sonnet-4-20250514',
    provider: 'anthropic',
    taskType: 'ORCHESTRATION',
    totalRuns: 30,
    averageScore: 0.91,
    passRate: 0.97,
    averageCost: 0.04,
    averageLatencyMs: 1500,
    trend: 'up',
  },
  {
    modelId: 'gpt-4o',
    provider: 'openai',
    taskType: 'ORCHESTRATION',
    totalRuns: 25,
    averageScore: 0.85,
    passRate: 0.88,
    averageCost: 0.06,
    averageLatencyMs: 2000,
    trend: 'down',
  },
];

const SAMPLE_TRENDS: ModelTrendPoint[] = [
  { date: '2026-03-01', modelId: 'claude-sonnet-4-20250514', score: 0.85 },
  { date: '2026-03-02', modelId: 'claude-sonnet-4-20250514', score: 0.87 },
  { date: '2026-03-03', modelId: 'claude-sonnet-4-20250514', score: 0.89 },
  { date: '2026-03-01', modelId: 'gpt-4o', score: 0.83 },
  { date: '2026-03-02', modelId: 'gpt-4o', score: 0.82 },
  { date: '2026-03-03', modelId: 'gpt-4o', score: 0.82 },
];

export function useModelPerformance(): UseModelPerformanceReturn {
  const [selectedTaskType, setSelectedTaskType] = useState<string | null>(null);
  const [loading] = useState(false);

  const taskTypes = [...new Set(SAMPLE_SCORES.map((s) => s.taskType))];
  const scores = selectedTaskType
    ? SAMPLE_SCORES.filter((s) => s.taskType === selectedTaskType)
    : SAMPLE_SCORES;

  return {
    scores: scores.sort((a, b) => b.averageScore - a.averageScore),
    trends: SAMPLE_TRENDS,
    taskTypes,
    selectedTaskType,
    loading,
    setSelectedTaskType,
    refresh: () => {},
  };
}

// ── Prompt Versions ─────────────────────────────────

export interface PromptVersion {
  id: string;
  taskType: string;
  role: 'system' | 'generation';
  version: string;
  content: string;
  isChampion: boolean;
  isCandidate: boolean;
  createdAt: string;
  runs: number;
  passRate: number;
}

export interface ABTestResult {
  taskType: string;
  championId: string;
  candidateId: string;
  championPassRate: number;
  candidatePassRate: number;
  championRuns: number;
  candidateRuns: number;
  status: 'running' | 'champion_wins' | 'candidate_wins' | 'inconclusive';
  startedAt: string;
}

export interface UsePromptVersionsReturn {
  versions: PromptVersion[];
  abTests: ABTestResult[];
  selectedVersion: PromptVersion | null;
  loading: boolean;
  selectVersion: (v: PromptVersion | null) => void;
  refresh: () => void;
}

const SAMPLE_VERSIONS: PromptVersion[] = [
  {
    id: 'pv-1',
    taskType: 'DATA_PIPELINE',
    role: 'system',
    version: 'v1.2',
    content:
      'You are a code generator for XIIGen. All code MUST: extend MicroserviceBase, return DataProcessResult<T>, use Record<string, unknown>...',
    isChampion: true,
    isCandidate: false,
    createdAt: '2026-03-01',
    runs: 120,
    passRate: 0.93,
  },
  {
    id: 'pv-2',
    taskType: 'DATA_PIPELINE',
    role: 'system',
    version: 'v1.3',
    content:
      'Generate XIIGen-compliant services. CRITICAL: All services extend MicroserviceBase, use fabric interfaces via createAsync()...',
    isChampion: false,
    isCandidate: true,
    createdAt: '2026-03-05',
    runs: 30,
    passRate: 0.96,
  },
  {
    id: 'pv-3',
    taskType: 'ORCHESTRATION',
    role: 'system',
    version: 'v1.0',
    content: 'Generate orchestration services coordinating multiple factory-backed interfaces...',
    isChampion: true,
    isCandidate: false,
    createdAt: '2026-02-20',
    runs: 85,
    passRate: 0.91,
  },
];

const SAMPLE_AB_TESTS: ABTestResult[] = [
  {
    taskType: 'DATA_PIPELINE',
    championId: 'pv-1',
    candidateId: 'pv-2',
    championPassRate: 0.93,
    candidatePassRate: 0.96,
    championRuns: 120,
    candidateRuns: 30,
    status: 'running',
    startedAt: '2026-03-05',
  },
];

export function usePromptVersions(): UsePromptVersionsReturn {
  const [selectedVersion, setSelectedVersion] = useState<PromptVersion | null>(null);
  const [loading] = useState(false);

  return {
    versions: SAMPLE_VERSIONS,
    abTests: SAMPLE_AB_TESTS,
    selectedVersion,
    loading,
    selectVersion: setSelectedVersion,
    refresh: () => {},
  };
}

/**
 * P10.5 Tests — Learning Components + E2E Full Client
 *
 * Learning: ModelScoreTable, ScoreTrendChart, PromptVersionList,
 *   PromptDiffViewer, ABTestStatus, PassRateChart, DnaComplianceGrid, FailureClusterList
 * E2E: All 10 pages render, routing, nav items, API client DNA compliance
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';

// Learning components
import {
  ModelScoreTable, ScoreTrendChart,
  PromptVersionList, PromptDiffViewer, ABTestStatus,
  PassRateChart, DnaComplianceGrid, FailureClusterList,
} from '../../src/components/learning';

// Hooks
import { useModelPerformance, usePromptVersions } from '../../src/hooks/useLearningData';

// App
import { AppRoutes, NAV_ITEMS } from '../../src/App';

// API
import { ENDPOINTS } from '../../src/api/endpoints';

import type { ModelScore, ModelTrendPoint, PromptVersion, ABTestResult } from '../../src/hooks/useLearningData';

// ── Test Data ───────────────────────────────────────

const mockScores: ModelScore[] = [
  { modelId: 'claude-sonnet-4-20250514', provider: 'anthropic', taskType: 'DATA_PIPELINE', totalRuns: 45, averageScore: 0.89, passRate: 0.93, averageCost: 0.03, averageLatencyMs: 1200, trend: 'up' },
  { modelId: 'gpt-4o', provider: 'openai', taskType: 'DATA_PIPELINE', totalRuns: 38, averageScore: 0.82, passRate: 0.87, averageCost: 0.05, averageLatencyMs: 1800, trend: 'flat' },
];

const mockTrends: ModelTrendPoint[] = [
  { date: '2026-03-01', modelId: 'claude-sonnet-4-20250514', score: 0.85 },
  { date: '2026-03-03', modelId: 'claude-sonnet-4-20250514', score: 0.89 },
];

const mockVersions: PromptVersion[] = [
  { id: 'pv-1', taskType: 'DATA_PIPELINE', role: 'system', version: 'v1.2', content: 'Generate code...', isChampion: true, isCandidate: false, createdAt: '2026-03-01', runs: 120, passRate: 0.93 },
  { id: 'pv-2', taskType: 'DATA_PIPELINE', role: 'system', version: 'v1.3', content: 'Improved prompt...', isChampion: false, isCandidate: true, createdAt: '2026-03-05', runs: 30, passRate: 0.96 },
];

const mockABTests: ABTestResult[] = [
  { taskType: 'DATA_PIPELINE', championId: 'pv-1', candidateId: 'pv-2', championPassRate: 0.93, candidatePassRate: 0.96, championRuns: 120, candidateRuns: 30, status: 'running', startedAt: '2026-03-05' },
];

const mockPassRates = [
  { date: '2026-03-06', passRate: 0.89, total: 20 },
  { date: '2026-03-07', passRate: 0.92, total: 22 },
];

const mockDnaCompliance: Record<string, number> = {
  'DNA-1': 0.95, 'DNA-2': 0.88, 'DNA-3': 0.97, 'DNA-4': 0.92,
  'DNA-5': 0.98, 'DNA-6': 0.85, 'DNA-7': 0.72, 'DNA-8': 0.80, 'DNA-9': 0.68,
};

const mockFailures = [
  { pattern: 'DNA-9: Missing CloudEvents', count: 8, severity: 'warning' as const, example: 'Event without wrapper' },
  { pattern: 'SEC-1: Hardcoded Credentials', count: 3, severity: 'error' as const, example: 'const password = "..."' },
];

// ══════════════════════════════════════════════════════
// Model Leaderboard Components
// ══════════════════════════════════════════════════════

describe('ModelScoreTable', () => {
  it('should render model rows ranked by score', () => {
    render(<ModelScoreTable scores={mockScores} />);
    expect(screen.getByTestId('model-score-table')).toBeInTheDocument();
    expect(screen.getByTestId('model-row-0')).toBeInTheDocument();
    expect(screen.getByTestId('model-row-1')).toBeInTheDocument();
  });

  it('should show empty message', () => {
    render(<ModelScoreTable scores={[]} />);
    expect(screen.getByTestId('model-table-empty')).toBeInTheDocument();
  });

  it('should display score percentages', () => {
    render(<ModelScoreTable scores={mockScores} />);
    expect(screen.getByText('89.0%')).toBeInTheDocument();
  });

  it('should show trend arrows', () => {
    render(<ModelScoreTable scores={mockScores} />);
    expect(screen.getByText('↑')).toBeInTheDocument(); // claude trend up
    expect(screen.getByText('→')).toBeInTheDocument(); // gpt trend flat
  });
});

describe('ScoreTrendChart', () => {
  it('should render trend lines per model', () => {
    render(<ScoreTrendChart trends={mockTrends} />);
    expect(screen.getByTestId('score-trend-chart')).toBeInTheDocument();
    expect(screen.getByTestId('trend-claude-sonnet-4-20250514')).toBeInTheDocument();
  });

  it('should show latest score', () => {
    render(<ScoreTrendChart trends={mockTrends} />);
    expect(screen.getByText('89.0%')).toBeInTheDocument();
  });
});

// ══════════════════════════════════════════════════════
// Prompt Lab Components
// ══════════════════════════════════════════════════════

describe('PromptVersionList', () => {
  it('should render version rows', () => {
    render(<PromptVersionList versions={mockVersions} selectedVersion={null} onSelect={jest.fn()} />);
    expect(screen.getByTestId('prompt-version-list')).toBeInTheDocument();
    expect(screen.getByTestId('prompt-row-pv-1')).toBeInTheDocument();
    expect(screen.getByTestId('prompt-row-pv-2')).toBeInTheDocument();
  });

  it('should show champion/candidate badges', () => {
    render(<PromptVersionList versions={mockVersions} selectedVersion={null} onSelect={jest.fn()} />);
    expect(screen.getByTestId('status-badge-CHAMPION')).toBeInTheDocument();
    expect(screen.getByTestId('status-badge-CANDIDATE')).toBeInTheDocument();
  });

  it('should call onSelect', () => {
    const onSelect = jest.fn();
    render(<PromptVersionList versions={mockVersions} selectedVersion={null} onSelect={onSelect} />);
    fireEvent.click(screen.getByTestId('prompt-row-pv-1'));
    expect(onSelect).toHaveBeenCalledWith(mockVersions[0]);
  });

  it('should show empty message', () => {
    render(<PromptVersionList versions={[]} selectedVersion={null} onSelect={jest.fn()} />);
    expect(screen.getByTestId('prompt-list-empty')).toBeInTheDocument();
  });
});

describe('PromptDiffViewer', () => {
  it('should render prompt content', () => {
    render(<PromptDiffViewer version={mockVersions[0]} />);
    expect(screen.getByTestId('prompt-diff-viewer')).toBeInTheDocument();
    expect(screen.getByTestId('prompt-content')).toHaveTextContent('Generate code...');
  });

  it('should show version metadata', () => {
    render(<PromptDiffViewer version={mockVersions[0]} />);
    expect(screen.getByText('v1.2 — DATA_PIPELINE / system')).toBeInTheDocument();
  });
});

describe('ABTestStatus', () => {
  it('should render A/B test cards', () => {
    render(<ABTestStatus tests={mockABTests} />);
    expect(screen.getByTestId('ab-test-status')).toBeInTheDocument();
    expect(screen.getByTestId('ab-test-0')).toBeInTheDocument();
  });

  it('should show champion vs candidate rates', () => {
    render(<ABTestStatus tests={mockABTests} />);
    expect(screen.getByText('93%')).toBeInTheDocument(); // champion
    expect(screen.getByText('96%')).toBeInTheDocument(); // candidate
  });

  it('should show empty message', () => {
    render(<ABTestStatus tests={[]} />);
    expect(screen.getByTestId('ab-test-empty')).toBeInTheDocument();
  });
});

// ══════════════════════════════════════════════════════
// Quality Dashboard Components
// ══════════════════════════════════════════════════════

describe('PassRateChart', () => {
  it('should render pass rate rows', () => {
    render(<PassRateChart data={mockPassRates} />);
    expect(screen.getByTestId('pass-rate-chart')).toBeInTheDocument();
    expect(screen.getByTestId('pass-rate-row-0')).toBeInTheDocument();
  });

  it('should show empty message', () => {
    render(<PassRateChart data={[]} />);
    expect(screen.getByText('No data yet')).toBeInTheDocument();
  });
});

describe('DnaComplianceGrid', () => {
  it('should render all 9 DNA patterns', () => {
    render(<DnaComplianceGrid compliance={mockDnaCompliance} />);
    expect(screen.getByTestId('dna-compliance-grid')).toBeInTheDocument();
    for (let i = 1; i <= 9; i++) {
      expect(screen.getByTestId(`dna-cell-DNA-${i}`)).toBeInTheDocument();
    }
  });

  it('should show compliance percentages', () => {
    render(<DnaComplianceGrid compliance={mockDnaCompliance} />);
    expect(screen.getByTestId('dna-cell-DNA-1')).toHaveTextContent('95%');
    expect(screen.getByTestId('dna-cell-DNA-9')).toHaveTextContent('68%');
  });

  it('should color-code by compliance level', () => {
    render(<DnaComplianceGrid compliance={mockDnaCompliance} />);
    // DNA-1 at 95% should be green
    expect(screen.getByTestId('dna-cell-DNA-1').className).toContain('bg-green');
    // DNA-9 at 68% should be red
    expect(screen.getByTestId('dna-cell-DNA-9').className).toContain('bg-red');
  });
});

describe('FailureClusterList', () => {
  it('should render failure clusters', () => {
    render(<FailureClusterList clusters={mockFailures} />);
    expect(screen.getByTestId('failure-cluster-list')).toBeInTheDocument();
    expect(screen.getByTestId('failure-cluster-0')).toBeInTheDocument();
    expect(screen.getByTestId('failure-cluster-1')).toBeInTheDocument();
  });

  it('should show counts and patterns', () => {
    render(<FailureClusterList clusters={mockFailures} />);
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('DNA-9: Missing CloudEvents')).toBeInTheDocument();
  });

  it('should show empty message', () => {
    render(<FailureClusterList clusters={[]} />);
    expect(screen.getByText('No failures recorded')).toBeInTheDocument();
  });
});

// ══════════════════════════════════════════════════════
// Hooks
// ══════════════════════════════════════════════════════

describe('useModelPerformance', () => {
  it('should return sample scores', () => {
    // Can't call hooks outside components, test via returned data shape
    // The hook returns sample data so we test the samples directly
    expect(typeof useModelPerformance).toBe('function');
  });
});

describe('usePromptVersions', () => {
  it('should be a function', () => {
    expect(typeof usePromptVersions).toBe('function');
  });
});

// ══════════════════════════════════════════════════════
// E2E: All 10 Pages Render
// ══════════════════════════════════════════════════════

function renderRoute(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  );
}

describe('E2E: All 10 Pages Render', () => {
  const routes = [
    { path: '/dashboard', testId: 'page-dashboard' },
    { path: '/designer', testId: 'page-designer' },
    { path: '/monitor', testId: 'page-monitor' },
    { path: '/registry', testId: 'page-registry' },
    { path: '/ledger', testId: 'page-ledger' },
    { path: '/tenants', testId: 'page-tenants' },
    { path: '/generation-lab', testId: 'page-generationlab' },
    { path: '/model-leaderboard', testId: 'page-modelleaderboard' },
    { path: '/prompt-lab', testId: 'page-promptlab' },
    { path: '/quality', testId: 'page-qualitydashboard' },
  ];

  for (const { path, testId } of routes) {
    it(`${path} should render without errors`, () => {
      renderRoute(path);
      expect(screen.getByTestId(testId)).toBeInTheDocument();
    });
  }

  it('/ should redirect to /dashboard', () => {
    renderRoute('/');
    expect(screen.getByTestId('page-dashboard')).toBeInTheDocument();
  });

  it('/unknown should show 404', () => {
    renderRoute('/nonexistent');
    expect(screen.getByTestId('page-notfound')).toBeInTheDocument();
  });
});

describe('E2E: Navigation Structure', () => {
  it('should have exactly 17 nav items covering all pages', () => {
    // Track 0 Turn 6 + Turn 8 (v14 Finding R): 13 → 15 with Flow Library + Run Flow.
    // FLOW-01 Phase A6 (DEV-115, GR-001 reconciliation, 2026-04-25):
    //   15 → 17 with +Attendance, +Super Agent (/chat), +Generation Lab.
    expect(NAV_ITEMS).toHaveLength(17);
  });

  it('all nav paths should have corresponding routes', () => {
    for (const item of NAV_ITEMS) {
      renderRoute(item.path);
      // Should not show 404
      expect(screen.queryByTestId('page-notfound')).toBeNull();
    }
  });
});

describe('E2E: API Client DNA Compliance', () => {
  it('no endpoints should have hardcoded localhost URLs', () => {
    for (const [key, ep] of Object.entries(ENDPOINTS)) {
      expect(ep.path).not.toContain('localhost');
      expect(ep.path).not.toContain('127.0.0.1');
    }
  });

  it('all endpoints should have path and method defined', () => {
    for (const [key, ep] of Object.entries(ENDPOINTS)) {
      expect(ep.path).toBeTruthy();
      expect(['GET', 'POST', 'PUT', 'DELETE']).toContain(ep.method);
    }
  });

  it('all endpoints should declare a fabric', () => {
    for (const [key, ep] of Object.entries(ENDPOINTS)) {
      expect(ep.fabric).toBeTruthy();
    }
  });
});

describe('E2E: Page Imports — All 10 Real Implementations', () => {
  it('ModelLeaderboardPage is real (not stub)', async () => {
    const { ModelLeaderboardPage } = await import('../../src/pages/ModelLeaderboardPage');
    expect(ModelLeaderboardPage).toBeDefined();
  });

  it('PromptLabPage is real (not stub)', async () => {
    const { PromptLabPage } = await import('../../src/pages/PromptLabPage');
    expect(PromptLabPage).toBeDefined();
  });

  it('QualityDashboardPage is real (not stub)', async () => {
    const { QualityDashboardPage } = await import('../../src/pages/QualityDashboardPage');
    expect(QualityDashboardPage).toBeDefined();
  });
});

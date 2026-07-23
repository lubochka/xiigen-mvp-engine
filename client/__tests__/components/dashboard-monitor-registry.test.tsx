/**
 * P10.2 Tests — Dashboard + Monitor + Registry components, hooks, pages
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';

// Dashboard components
import {
  BootstrapPhaseBar,
  RegistryCountsCard,
  HealthFabricsCard,
  BootstrapActions,
} from '../../src/components/dashboard';

// Monitor components
import {
  RunListView,
  RunDetailView,
  RunStatusBadge,
  RunProgressBar,
  NodeSnapshotPanel,
} from '../../src/components/monitor';

// Registry components
import {
  ContractListView,
  RegistrySearchBar,
  FactoryDepsView,
  StatusChip,
} from '../../src/components/registry';

// Hooks
import { BOOTSTRAP_PHASES } from '../../src/hooks/useBootstrapStatus';
import type { FlowRun } from '../../src/hooks/useFlowRuns';
import type { ContractRecord, RegistryCounts } from '../../src/hooks/useRegistryData';

// ── Test Data ───────────────────────────────────────

const mockPhases: Record<string, { status: string }> = {
  secrets: { status: 'SUCCESS' },
  config: { status: 'SKIPPED' },
  database: { status: 'SUCCESS' },
  queue: { status: 'SUCCESS' },
  ai_engine: { status: 'FAILED' },
  rag: { status: 'PENDING' },
  flow_engine: { status: 'PENDING' },
};

const mockCounts: RegistryCounts = {
  generationCount: 5,
  factoryCount: 12,
  taskTypeCount: 3,
  promotionCount: 2,
};

const mockFabrics: Record<string, Record<string, unknown>> = {
  database: { status: 'HEALTHY' },
  queue: { status: 'HEALTHY' },
  ai_engine: { status: 'DOWN', error_message: 'Connection refused' },
};

const mockRun: FlowRun = {
  contractId: 'T44',
  tenantId: 'tenant-1',
  success: true,
  elapsedMs: 150,
  flowId: 'flow_t44',
  promotionLevel: 'MINIMAL',
  pipelinePassed: true,
  stages: [
    { stage: 'INVENTORY', success: true, elapsedMs: 20 },
    { stage: 'SYNTHESIS', success: true, elapsedMs: 100 },
    { stage: 'JUDGMENT', success: true, elapsedMs: 30 },
  ],
  errors: [],
  warnings: ['Factory F166 already registered'],
};

const failedRun: FlowRun = {
  contractId: 'T45',
  tenantId: 'tenant-2',
  success: false,
  elapsedMs: 80,
  pipelinePassed: false,
  stages: [
    { stage: 'INVENTORY', success: true, elapsedMs: 15 },
    { stage: 'SYNTHESIS', success: false, elapsedMs: 65 },
  ],
  errors: ['SYNTHESIS: AI generation failed'],
};

const mockContracts: ContractRecord[] = [
  {
    taskTypeId: 'T44', name: 'Inventory Management', archetype: 'DATA_PIPELINE',
    factoryDependencies: [
      { factoryId: 'F166', interfaceName: 'IInventoryService', fabricType: 'database' },
      { factoryId: 'F169', interfaceName: 'IInventoryEventService', fabricType: 'queue' },
    ],
    familyId: 'Family-25', version: '1.0.0',
  },
  {
    taskTypeId: 'T45', name: 'Marketplace Listing', archetype: 'ORCHESTRATION',
    factoryDependencies: [
      { factoryId: 'F170', interfaceName: 'ICooperatorService', fabricType: 'rag' },
    ],
    familyId: 'Family-26', version: '1.0.0',
  },
];

// ══════════════════════════════════════════════════════
// Dashboard Components
// ══════════════════════════════════════════════════════

describe('BootstrapPhaseBar', () => {
  it('should render all 7 bootstrap phases', () => {
    render(<BootstrapPhaseBar phases={mockPhases} />);
    expect(screen.getByTestId('bootstrap-phase-bar')).toBeInTheDocument();
    for (const phase of BOOTSTRAP_PHASES) {
      expect(screen.getByTestId(`phase-${phase}`)).toBeInTheDocument();
    }
  });

  it('should handle empty phases', () => {
    render(<BootstrapPhaseBar phases={{}} />);
    expect(screen.getByTestId('bootstrap-phase-bar')).toBeInTheDocument();
  });
});

describe('RegistryCountsCard', () => {
  it('should render all 4 count cards', () => {
    render(<RegistryCountsCard counts={mockCounts} />);
    expect(screen.getByTestId('registry-counts-card')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument(); // generationCount
    expect(screen.getByText('12')).toBeInTheDocument(); // factoryCount
    expect(screen.getByText('3')).toBeInTheDocument(); // taskTypeCount
  });
});

describe('HealthFabricsCard', () => {
  it('should render per-fabric health rows', () => {
    render(<HealthFabricsCard fabrics={mockFabrics} />);
    expect(screen.getByTestId('health-fabrics-card')).toBeInTheDocument();
    expect(screen.getByTestId('fabric-row-database')).toBeInTheDocument();
    expect(screen.getByTestId('fabric-row-ai_engine')).toBeInTheDocument();
  });

  it('should show message when no fabrics', () => {
    render(<HealthFabricsCard fabrics={{}} />);
    expect(screen.getByText('No fabrics registered')).toBeInTheDocument();
  });

  it('should show HEALTHY and DOWN badges', () => {
    render(<HealthFabricsCard fabrics={mockFabrics} />);
    expect(screen.getAllByTestId('status-badge-HEALTHY').length).toBe(2);
    expect(screen.getByTestId('status-badge-DOWN')).toBeInTheDocument();
  });
});

describe('BootstrapActions', () => {
  it('should render refresh button', () => {
    const onRefresh = jest.fn();
    render(<BootstrapActions onRefresh={onRefresh} loading={false} healthStatus="HEALTHY" />);
    expect(screen.getByTestId('refresh-button')).toBeInTheDocument();
  });

  it('should call onRefresh when clicked', () => {
    const onRefresh = jest.fn();
    render(<BootstrapActions onRefresh={onRefresh} loading={false} />);
    fireEvent.click(screen.getByTestId('refresh-button'));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('should show status badge', () => {
    render(<BootstrapActions onRefresh={jest.fn()} loading={false} healthStatus="DEGRADED" />);
    expect(screen.getByTestId('status-badge-DEGRADED')).toBeInTheDocument();
  });

  it('should disable button when loading', () => {
    render(<BootstrapActions onRefresh={jest.fn()} loading={true} />);
    expect(screen.getByTestId('refresh-button')).toBeDisabled();
  });
});

// ══════════════════════════════════════════════════════
// Monitor Components
// ══════════════════════════════════════════════════════

describe('RunStatusBadge', () => {
  it('should show COMPLETED for success', () => {
    render(<RunStatusBadge success={true} />);
    expect(screen.getByTestId('status-badge-COMPLETED')).toBeInTheDocument();
  });

  it('should show FAILED for failure', () => {
    render(<RunStatusBadge success={false} />);
    expect(screen.getByTestId('status-badge-FAILED')).toBeInTheDocument();
  });
});

describe('RunProgressBar', () => {
  it('should render stage segments', () => {
    render(<RunProgressBar stages={mockRun.stages!} />);
    expect(screen.getByTestId('run-progress-bar')).toBeInTheDocument();
    expect(screen.getByTestId('progress-stage-INVENTORY')).toBeInTheDocument();
    expect(screen.getByTestId('progress-stage-SYNTHESIS')).toBeInTheDocument();
    expect(screen.getByTestId('progress-stage-JUDGMENT')).toBeInTheDocument();
  });

  it('should return null for empty stages', () => {
    const { container } = render(<RunProgressBar stages={[]} />);
    expect(container.innerHTML).toBe('');
  });
});

describe('RunListView', () => {
  it('should render run rows', () => {
    render(<RunListView runs={[mockRun, failedRun]} selectedRun={null} onSelect={jest.fn()} />);
    expect(screen.getByTestId('run-list-view')).toBeInTheDocument();
    expect(screen.getByTestId('run-row-0')).toBeInTheDocument();
    expect(screen.getByTestId('run-row-1')).toBeInTheDocument();
  });

  it('should show empty message when no runs', () => {
    render(<RunListView runs={[]} selectedRun={null} onSelect={jest.fn()} />);
    expect(screen.getByTestId('run-list-empty')).toBeInTheDocument();
  });

  it('should call onSelect when row clicked', () => {
    const onSelect = jest.fn();
    render(<RunListView runs={[mockRun]} selectedRun={null} onSelect={onSelect} />);
    fireEvent.click(screen.getByTestId('run-row-0'));
    expect(onSelect).toHaveBeenCalledWith(mockRun);
  });

  it('should highlight selected run', () => {
    render(<RunListView runs={[mockRun]} selectedRun={mockRun} onSelect={jest.fn()} />);
    const row = screen.getByTestId('run-row-0');
    expect(row.className).toContain('bg-blue-50');
  });
});

describe('RunDetailView', () => {
  it('should render run details', () => {
    render(<RunDetailView run={mockRun} />);
    expect(screen.getByTestId('run-detail-view')).toBeInTheDocument();
    expect(screen.getByText('T44')).toBeInTheDocument();
    expect(screen.getByText(/tenant-1/)).toBeInTheDocument();
  });

  it('should show stage snapshots', () => {
    render(<RunDetailView run={mockRun} />);
    expect(screen.getByTestId('node-snapshot-INVENTORY')).toBeInTheDocument();
    expect(screen.getByTestId('node-snapshot-SYNTHESIS')).toBeInTheDocument();
  });

  it('should show errors when present', () => {
    render(<RunDetailView run={failedRun} />);
    expect(screen.getByTestId('run-errors')).toBeInTheDocument();
  });

  it('should show warnings when present', () => {
    render(<RunDetailView run={mockRun} />);
    expect(screen.getByTestId('run-warnings')).toBeInTheDocument();
  });
});

describe('NodeSnapshotPanel', () => {
  it('should render stage info', () => {
    const stage = { stage: 'SYNTHESIS', success: true, elapsedMs: 100 };
    render(<NodeSnapshotPanel stage={stage} />);
    expect(screen.getByTestId('node-snapshot-SYNTHESIS')).toBeInTheDocument();
    expect(screen.getByText('SYNTHESIS')).toBeInTheDocument();
  });
});

// ══════════════════════════════════════════════════════
// Registry Components
// ══════════════════════════════════════════════════════

describe('ContractListView', () => {
  it('should render contract rows', () => {
    render(<ContractListView contracts={mockContracts} searchQuery="" />);
    expect(screen.getByTestId('contract-list-view')).toBeInTheDocument();
    expect(screen.getByTestId('contract-row-T44')).toBeInTheDocument();
    expect(screen.getByTestId('contract-row-T45')).toBeInTheDocument();
  });

  it('should filter by search query', () => {
    render(<ContractListView contracts={mockContracts} searchQuery="inventory" />);
    expect(screen.getByTestId('contract-row-T44')).toBeInTheDocument();
    expect(screen.queryByTestId('contract-row-T45')).toBeNull();
  });

  it('should show empty message when no matches', () => {
    render(<ContractListView contracts={mockContracts} searchQuery="nonexistent" />);
    expect(screen.getByTestId('contract-list-empty')).toBeInTheDocument();
  });

  it('should show empty message when no contracts', () => {
    render(<ContractListView contracts={[]} searchQuery="" />);
    expect(screen.getByTestId('contract-list-empty')).toBeInTheDocument();
  });

  it('should display factory dependencies', () => {
    render(<ContractListView contracts={mockContracts} searchQuery="" />);
    expect(screen.getByText('F166')).toBeInTheDocument();
    expect(screen.getByText('IInventoryService')).toBeInTheDocument();
  });
});

describe('RegistrySearchBar', () => {
  it('should render input', () => {
    render(<RegistrySearchBar value="" onChange={jest.fn()} />);
    expect(screen.getByTestId('registry-search-input')).toBeInTheDocument();
  });

  it('should call onChange on input', () => {
    const onChange = jest.fn();
    render(<RegistrySearchBar value="" onChange={onChange} />);
    fireEvent.change(screen.getByTestId('registry-search-input'), { target: { value: 'test' } });
    expect(onChange).toHaveBeenCalledWith('test');
  });

  it('should show current value', () => {
    render(<RegistrySearchBar value="hello" onChange={jest.fn()} />);
    expect(screen.getByTestId('registry-search-input')).toHaveValue('hello');
  });
});

describe('FactoryDepsView', () => {
  it('should render dependency entries', () => {
    render(<FactoryDepsView dependencies={mockContracts[0].factoryDependencies} />);
    expect(screen.getByTestId('factory-deps-view')).toBeInTheDocument();
    expect(screen.getByText('F166')).toBeInTheDocument();
    expect(screen.getByText('F169')).toBeInTheDocument();
  });

  it('should show message when empty', () => {
    render(<FactoryDepsView dependencies={[]} />);
    expect(screen.getByText('No factory dependencies')).toBeInTheDocument();
  });
});

describe('StatusChip', () => {
  it('should render as StatusBadge', () => {
    render(<StatusChip status="MINIMAL" />);
    expect(screen.getByTestId('status-badge-MINIMAL')).toBeInTheDocument();
  });
});

// ══════════════════════════════════════════════════════
// Hooks
// ══════════════════════════════════════════════════════

describe('BOOTSTRAP_PHASES', () => {
  it('should have 7 phases', () => {
    expect(BOOTSTRAP_PHASES).toHaveLength(7);
    expect(BOOTSTRAP_PHASES).toContain('database');
    expect(BOOTSTRAP_PHASES).toContain('ai_engine');
    expect(BOOTSTRAP_PHASES).toContain('flow_engine');
  });
});

// ══════════════════════════════════════════════════════
// Pages render (with MemoryRouter for pages using hooks)
// ══════════════════════════════════════════════════════

// Note: Real page rendering requires API mocking. These verify imports work.
describe('Page Imports', () => {
  it('DashboardPage should be importable', async () => {
    const { DashboardPage } = await import('../../src/pages/DashboardPage');
    expect(DashboardPage).toBeDefined();
  });

  it('MonitorPage should be importable', async () => {
    const { MonitorPage } = await import('../../src/pages/MonitorPage');
    expect(MonitorPage).toBeDefined();
  });

  it('RegistryPage should be importable', async () => {
    const { RegistryPage } = await import('../../src/pages/RegistryPage');
    expect(RegistryPage).toBeDefined();
  });
});

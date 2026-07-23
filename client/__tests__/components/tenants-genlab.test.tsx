/**
 * P10.4 Tests — Tenants + GenerationLab components
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// Tenant components
import {
  TenantListView, CreateTenantDialog, TenantConfigPanel,
  TenantKeysPanel, TenantQuotaPanel,
} from '../../src/components/tenants';

// GenerationLab components
import {
  ContractSpecEditor, AfStationTimeline, GeneratedCodeViewer,
  QualityScoreCard, FeedbackPanel,
} from '../../src/components/generationlab';

import type { TenantRecord } from '../../src/hooks/useTenants';
import type { GenerationRun } from '../../src/hooks/useGenerationHistory';

// ── Test Data ───────────────────────────────────────

const mockTenants: TenantRecord[] = [
  { id: 'tid-001', name: 'Acme Corp', status: 'active', createdAt: '2026-03-08T00:00:00Z', plan: { maxRequestsPerMinute: 60 }, configOverrides: { batch_size: '100' }, apiKeys: { anthropic: 'sk-ant-xxx123' } },
  { id: 'tid-002', name: 'Beta Inc', status: 'inactive', createdAt: '2026-03-07T00:00:00Z', plan: {}, configOverrides: {}, apiKeys: {} },
];

const mockRun: GenerationRun = {
  contractId: 'T44',
  flowId: 'flow_t44',
  success: true,
  pipelinePassed: true,
  promotionLevel: 'MINIMAL',
  bfaStatus: 'REGISTERED',
  generatedCodeLength: 1500,
  factoryEntries: [
    { factory_id: 'F166', interface_name: 'IInventoryService', fabric_type: 'database', status: 'ACTIVE' },
  ],
  freedomConfigs: [],
  stages: [
    { stage: 'INVENTORY', success: true, elapsedMs: 15, details: { prompt_count: 2 } },
    { stage: 'SYNTHESIS', success: true, elapsedMs: 100, details: { plan_steps: 4 } },
    { stage: 'JUDGMENT', success: true, elapsedMs: 25, details: { score: 0.85 } },
  ],
  errors: [],
  warnings: ['Factory F166 already registered'],
  elapsedMs: 150,
  pipelineMetadata: {},
};

const failedRun: GenerationRun = {
  ...mockRun,
  success: false,
  pipelinePassed: false,
  promotionLevel: 'GENERATED',
  errors: ['AF-7 DNA-1: Found typed model pattern'],
  stages: [
    { stage: 'INVENTORY', success: true, elapsedMs: 10 },
    { stage: 'SYNTHESIS', success: true, elapsedMs: 80 },
    { stage: 'JUDGMENT', success: false, elapsedMs: 20 },
  ],
};

// ══════════════════════════════════════════════════════
// Tenant Components
// ══════════════════════════════════════════════════════

describe('TenantListView', () => {
  it('should render tenant rows', () => {
    render(<TenantListView tenants={mockTenants} selectedTenant={null} onSelect={jest.fn()} onDeactivate={jest.fn()} />);
    expect(screen.getByTestId('tenant-list-view')).toBeInTheDocument();
    expect(screen.getByTestId('tenant-row-tid-001')).toBeInTheDocument();
    expect(screen.getByTestId('tenant-row-tid-002')).toBeInTheDocument();
  });

  it('should show empty message', () => {
    render(<TenantListView tenants={[]} selectedTenant={null} onSelect={jest.fn()} onDeactivate={jest.fn()} />);
    expect(screen.getByTestId('tenant-list-empty')).toBeInTheDocument();
  });

  it('should call onSelect when row clicked', () => {
    const onSelect = jest.fn();
    render(<TenantListView tenants={mockTenants} selectedTenant={null} onSelect={onSelect} onDeactivate={jest.fn()} />);
    fireEvent.click(screen.getByTestId('tenant-row-tid-001'));
    expect(onSelect).toHaveBeenCalledWith(mockTenants[0]);
  });

  it('should show deactivate button for active tenants', () => {
    render(<TenantListView tenants={mockTenants} selectedTenant={null} onSelect={jest.fn()} onDeactivate={jest.fn()} />);
    expect(screen.getByTestId('deactivate-tid-001')).toBeInTheDocument();
    expect(screen.queryByTestId('deactivate-tid-002')).toBeNull(); // inactive = no button
  });

  it('should call onDeactivate', () => {
    const onDeactivate = jest.fn();
    render(<TenantListView tenants={mockTenants} selectedTenant={null} onSelect={jest.fn()} onDeactivate={onDeactivate} />);
    fireEvent.click(screen.getByTestId('deactivate-tid-001'));
    expect(onDeactivate).toHaveBeenCalledWith('tid-001');
  });

  it('should highlight selected tenant', () => {
    render(<TenantListView tenants={mockTenants} selectedTenant={mockTenants[0]} onSelect={jest.fn()} onDeactivate={jest.fn()} />);
    expect(screen.getByTestId('tenant-row-tid-001').className).toContain('bg-blue-50');
  });
});

describe('CreateTenantDialog', () => {
  it('should not render when closed', () => {
    render(<CreateTenantDialog open={false} onClose={jest.fn()} onCreate={jest.fn()} />);
    expect(screen.queryByTestId('create-tenant-dialog')).toBeNull();
  });

  it('should render when open', () => {
    render(<CreateTenantDialog open={true} onClose={jest.fn()} onCreate={jest.fn()} />);
    expect(screen.getByTestId('create-tenant-dialog')).toBeInTheDocument();
    expect(screen.getByTestId('create-tenant-name')).toBeInTheDocument();
  });

  it('should show error when name is empty', () => {
    render(<CreateTenantDialog open={true} onClose={jest.fn()} onCreate={jest.fn()} />);
    fireEvent.click(screen.getByTestId('create-tenant-submit'));
    expect(screen.getByTestId('create-tenant-error')).toHaveTextContent('Name is required');
  });

  it('should call onCreate with name', async () => {
    const onCreate = jest.fn(async () => true);
    render(<CreateTenantDialog open={true} onClose={jest.fn()} onCreate={onCreate} />);
    fireEvent.change(screen.getByTestId('create-tenant-name'), { target: { value: 'New Corp' } });
    fireEvent.click(screen.getByTestId('create-tenant-submit'));
    expect(onCreate).toHaveBeenCalledWith('New Corp');
  });

  it('should call onClose on cancel', () => {
    const onClose = jest.fn();
    render(<CreateTenantDialog open={true} onClose={onClose} onCreate={jest.fn()} />);
    fireEvent.click(screen.getByTestId('create-tenant-cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('TenantConfigPanel', () => {
  it('should render config overrides', () => {
    render(<TenantConfigPanel tenant={mockTenants[0]} onUpdateConfig={jest.fn()} />);
    expect(screen.getByTestId('tenant-config-panel')).toBeInTheDocument();
    expect(screen.getByText('batch_size')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('should show empty message when no overrides', () => {
    render(<TenantConfigPanel tenant={mockTenants[1]} onUpdateConfig={jest.fn()} />);
    expect(screen.getByText('No config overrides set')).toBeInTheDocument();
  });
});

describe('TenantKeysPanel', () => {
  it('should render masked keys', () => {
    render(<TenantKeysPanel tenant={mockTenants[0]} onSetKeys={jest.fn()} />);
    expect(screen.getByTestId('tenant-keys-panel')).toBeInTheDocument();
    expect(screen.getByTestId('key-row-anthropic')).toBeInTheDocument();
    // Key should be masked
    const masked = screen.getByTestId('key-masked-anthropic');
    expect(masked.textContent).toContain('••••');
    expect(masked.textContent).not.toBe('sk-ant-xxx123');
  });

  it('should show add form when button clicked', () => {
    render(<TenantKeysPanel tenant={mockTenants[0]} onSetKeys={jest.fn()} />);
    fireEvent.click(screen.getByTestId('key-add-button'));
    expect(screen.getByTestId('key-add-form')).toBeInTheDocument();
  });

  it('should show empty message for tenant without keys', () => {
    render(<TenantKeysPanel tenant={mockTenants[1]} onSetKeys={jest.fn()} />);
    expect(screen.getByText('No API keys configured')).toBeInTheDocument();
  });
});

describe('TenantQuotaPanel', () => {
  it('should render quota bars', () => {
    render(<TenantQuotaPanel tenant={mockTenants[0]} onSetQuotas={jest.fn()} />);
    expect(screen.getByTestId('tenant-quota-panel')).toBeInTheDocument();
    expect(screen.getByTestId('quota-Requests-min')).toBeInTheDocument();
    expect(screen.getByTestId('quota-Tokens-day')).toBeInTheDocument();
  });
});

// ══════════════════════════════════════════════════════
// GenerationLab Components
// ══════════════════════════════════════════════════════

describe('ContractSpecEditor', () => {
  it('should render textarea', () => {
    render(<ContractSpecEditor value='{}' onChange={jest.fn()} />);
    expect(screen.getByTestId('contract-spec-editor')).toBeInTheDocument();
    expect(screen.getByTestId('spec-textarea')).toHaveValue('{}');
  });

  it('should show error when present', () => {
    render(<ContractSpecEditor value='' onChange={jest.fn()} error='Invalid JSON' />);
    expect(screen.getByTestId('spec-error')).toHaveTextContent('Invalid JSON');
  });

  it('should call onChange on input', () => {
    const onChange = jest.fn();
    render(<ContractSpecEditor value='{}' onChange={onChange} />);
    fireEvent.change(screen.getByTestId('spec-textarea'), { target: { value: '{"new":true}' } });
    expect(onChange).toHaveBeenCalledWith('{"new":true}');
  });

  it('should have load sample button', () => {
    const onChange = jest.fn();
    render(<ContractSpecEditor value='' onChange={onChange} />);
    fireEvent.click(screen.getByTestId('spec-load-sample'));
    expect(onChange).toHaveBeenCalled();
  });
});

describe('AfStationTimeline', () => {
  it('should render all 3 stages', () => {
    render(<AfStationTimeline stages={mockRun.stages} generating={false} />);
    expect(screen.getByTestId('af-station-timeline')).toBeInTheDocument();
    expect(screen.getByTestId('timeline-stage-INVENTORY')).toBeInTheDocument();
    expect(screen.getByTestId('timeline-stage-SYNTHESIS')).toBeInTheDocument();
    expect(screen.getByTestId('timeline-stage-JUDGMENT')).toBeInTheDocument();
  });

  it('should show generating indicator when running', () => {
    render(<AfStationTimeline stages={[]} generating={true} />);
    expect(screen.getByTestId('timeline-generating')).toBeInTheDocument();
  });

  it('should show stage details', () => {
    render(<AfStationTimeline stages={mockRun.stages} generating={false} />);
    expect(screen.getByText(/prompt_count/)).toBeInTheDocument();
  });
});

describe('GeneratedCodeViewer', () => {
  it('should render code stats', () => {
    render(<GeneratedCodeViewer codeLength={1500} factoryEntries={mockRun.factoryEntries} flowId="flow_t44" />);
    expect(screen.getByTestId('generated-code-viewer')).toBeInTheDocument();
    expect(screen.getByTestId('code-length')).toHaveTextContent('1,500');
    expect(screen.getByTestId('factory-count')).toHaveTextContent('1');
    expect(screen.getByTestId('flow-id')).toHaveTextContent('flow_t44');
  });

  it('should render factory entries', () => {
    render(<GeneratedCodeViewer codeLength={1000} factoryEntries={mockRun.factoryEntries} flowId="test" />);
    expect(screen.getByTestId('factory-entries')).toBeInTheDocument();
    expect(screen.getByText('F166')).toBeInTheDocument();
  });
});

describe('QualityScoreCard', () => {
  it('should render quality metrics for passing run', () => {
    render(<QualityScoreCard run={mockRun} />);
    expect(screen.getByTestId('quality-score-card')).toBeInTheDocument();
    expect(screen.getByTestId('status-badge-COMPLETED')).toBeInTheDocument();
    expect(screen.getByTestId('status-badge-MINIMAL')).toBeInTheDocument();
    expect(screen.getByTestId('status-badge-REGISTERED')).toBeInTheDocument();
  });

  it('should show errors for failing run', () => {
    render(<QualityScoreCard run={failedRun} />);
    expect(screen.getByTestId('quality-errors')).toBeInTheDocument();
    expect(screen.getByText(/DNA-1/)).toBeInTheDocument();
  });

  it('should show warnings when present', () => {
    render(<QualityScoreCard run={mockRun} />);
    expect(screen.getByTestId('quality-warnings')).toBeInTheDocument();
  });
});

describe('FeedbackPanel', () => {
  it('should render 3 rating buttons', () => {
    render(<FeedbackPanel onSubmit={jest.fn()} />);
    expect(screen.getByTestId('feedback-panel')).toBeInTheDocument();
    expect(screen.getByTestId('feedback-good')).toBeInTheDocument();
    expect(screen.getByTestId('feedback-neutral')).toBeInTheDocument();
    expect(screen.getByTestId('feedback-bad')).toBeInTheDocument();
  });

  it('should disable submit when no rating selected', () => {
    render(<FeedbackPanel onSubmit={jest.fn()} />);
    expect(screen.getByTestId('feedback-submit')).toBeDisabled();
  });

  it('should enable submit after selecting rating', () => {
    render(<FeedbackPanel onSubmit={jest.fn()} />);
    fireEvent.click(screen.getByTestId('feedback-good'));
    expect(screen.getByTestId('feedback-submit')).not.toBeDisabled();
  });

  it('should call onSubmit with rating and comment', () => {
    const onSubmit = jest.fn();
    render(<FeedbackPanel onSubmit={onSubmit} />);
    fireEvent.click(screen.getByTestId('feedback-bad'));
    fireEvent.change(screen.getByTestId('feedback-comment'), { target: { value: 'Bad output' } });
    fireEvent.click(screen.getByTestId('feedback-submit'));
    expect(onSubmit).toHaveBeenCalledWith('bad', 'Bad output');
  });

  it('should show thank you after submission', () => {
    render(<FeedbackPanel onSubmit={jest.fn()} />);
    fireEvent.click(screen.getByTestId('feedback-good'));
    fireEvent.click(screen.getByTestId('feedback-submit'));
    expect(screen.getByTestId('feedback-submitted')).toBeInTheDocument();
  });
});

// ══════════════════════════════════════════════════════
// Page Imports
// ══════════════════════════════════════════════════════

describe('Page Imports', () => {
  it('TenantsPage should be importable', async () => {
    const { TenantsPage } = await import('../../src/pages/TenantsPage');
    expect(TenantsPage).toBeDefined();
  });

  it('GenerationLabPage should be importable', async () => {
    const { GenerationLabPage } = await import('../../src/pages/GenerationLabPage');
    expect(GenerationLabPage).toBeDefined();
  });
});

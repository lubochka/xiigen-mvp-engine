/**
 * P10.3 Tests — Designer + Freedom/Ledger components
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// Designer components
import {
  FlowCanvas, FlowNode, FlowEdge, FlowToolbar, NodePalette, NodeConfigPanel,
  computeLayers, applyLayout, DEFAULT_LAYOUT,
} from '../../src/components/designer';

// Freedom/Ledger components
import {
  ConfigFieldEditor, ConfigSectionView, ConfigToolbar,
  LedgerEntryRow, LedgerFilterBar,
} from '../../src/components/freedom';

import type { FlowDefinition, FlowNodeDef, FlowEdgeDef } from '../../src/hooks/useFlowDefinition';
import type { FreedomConfigSection, FreedomConfigField, LedgerEntry } from '../../src/hooks/useFreedomConfig';

// ── Test Data ───────────────────────────────────────

const mockNodes: FlowNodeDef[] = [
  { id: 'start', type: 'start', label: 'Start', factoryId: '', factoryInterface: '', fabric: 'CORE', position: { x: 0, y: 0 }, config: {} },
  { id: 'svc1', type: 'service', label: 'IInventoryService (F166)', factoryId: 'F166', factoryInterface: 'IInventoryService', fabric: 'DATABASE', position: { x: 0, y: 0 }, config: {} },
  { id: 'judge', type: 'judge', label: 'Quality Judge', factoryId: '', factoryInterface: '', fabric: 'CORE', position: { x: 0, y: 0 }, config: {} },
  { id: 'end', type: 'end', label: 'End', factoryId: '', factoryInterface: '', fabric: 'CORE', position: { x: 0, y: 0 }, config: {} },
];

const mockEdges: FlowEdgeDef[] = [
  { id: 'e1', source: 'start', target: 'svc1' },
  { id: 'e2', source: 'svc1', target: 'judge' },
  { id: 'e3', source: 'judge', target: 'end' },
];

const mockFlow: FlowDefinition = {
  id: 'flow_t44', name: 'Inventory Flow', version: '1.0.0',
  nodes: mockNodes, edges: mockEdges, metadata: {},
};

const mockSection: FreedomConfigSection = {
  id: 'T44',
  name: 'Task Type: T44',
  fields: [
    { key: 'T44:batch_size', label: 'T44:batch_size', description: 'Batch size', type: 'string', value: '100', defaultValue: '100', modified: false },
    { key: 'T44:retry_count', label: 'T44:retry_count', description: 'Retries', type: 'number', value: 3, defaultValue: 3, modified: false },
    { key: 'T44:enabled', label: 'T44:enabled', description: 'Enable', type: 'boolean', value: true, defaultValue: true, modified: false },
  ],
};

const mockLedgerEntry: LedgerEntry = {
  id: 'entry-1',
  timestamp: '2026-03-08T10:00:00Z',
  category: 'FLOW_RUN',
  severity: 'success',
  action: 'generation.complete',
  summary: 'T44 generation passed',
  details: { pipeline_passed: true, promotion_level: 'MINIMAL' },
};

// ══════════════════════════════════════════════════════
// Layout Algorithm
// ══════════════════════════════════════════════════════

describe('Layout Algorithm', () => {
  it('computeLayers should produce correct layer count', () => {
    const layers = computeLayers(mockNodes, mockEdges);
    expect(layers.length).toBeGreaterThanOrEqual(2);
    // start should be first layer
    expect(layers[0]).toContain('start');
  });

  it('computeLayers should handle empty graph', () => {
    const layers = computeLayers([], []);
    expect(layers).toHaveLength(0);
  });

  it('computeLayers should handle single node', () => {
    const layers = computeLayers([mockNodes[0]], []);
    expect(layers).toHaveLength(1);
    expect(layers[0]).toContain('start');
  });

  it('applyLayout should produce positions for all nodes', () => {
    const result = applyLayout(mockNodes, mockEdges);
    expect(result.positions.size).toBe(mockNodes.length);
    for (const node of mockNodes) {
      expect(result.positions.has(node.id)).toBe(true);
    }
  });

  it('applyLayout should produce positive width/height', () => {
    const result = applyLayout(mockNodes, mockEdges);
    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBeGreaterThan(0);
  });

  it('applyLayout should handle empty graph', () => {
    const result = applyLayout([], []);
    expect(result.positions.size).toBe(0);
    expect(result.width).toBe(0);
  });

  it('nodes in later layers should have higher Y', () => {
    const result = applyLayout(mockNodes, mockEdges);
    const startPos = result.positions.get('start')!;
    const endPos = result.positions.get('end')!;
    expect(endPos.y).toBeGreaterThan(startPos.y);
  });
});

// ══════════════════════════════════════════════════════
// Designer Components
// ══════════════════════════════════════════════════════

describe('FlowCanvas', () => {
  it('should render SVG canvas with nodes and edges', () => {
    render(<FlowCanvas flow={mockFlow} selectedNodeId={null} onSelectNode={jest.fn()} />);
    expect(screen.getByTestId('flow-canvas')).toBeInTheDocument();
    expect(screen.getByTestId('node-start')).toBeInTheDocument();
    expect(screen.getByTestId('node-svc1')).toBeInTheDocument();
    expect(screen.getByTestId('node-end')).toBeInTheDocument();
  });

  it('should render edges', () => {
    render(<FlowCanvas flow={mockFlow} selectedNodeId={null} onSelectNode={jest.fn()} />);
    expect(screen.getByTestId('edge-e1')).toBeInTheDocument();
    expect(screen.getByTestId('edge-e2')).toBeInTheDocument();
  });

  it('should call onSelectNode when node clicked', () => {
    const onSelect = jest.fn();
    render(<FlowCanvas flow={mockFlow} selectedNodeId={null} onSelectNode={onSelect} />);
    fireEvent.click(screen.getByTestId('node-svc1'));
    expect(onSelect).toHaveBeenCalledWith('svc1');
  });
});

describe('NodePalette', () => {
  it('should render 4 node type buttons', () => {
    render(<NodePalette onAdd={jest.fn()} />);
    expect(screen.getByTestId('node-palette')).toBeInTheDocument();
    expect(screen.getByTestId('palette-service')).toBeInTheDocument();
    expect(screen.getByTestId('palette-judge')).toBeInTheDocument();
    expect(screen.getByTestId('palette-start')).toBeInTheDocument();
    expect(screen.getByTestId('palette-end')).toBeInTheDocument();
  });

  it('should call onAdd with node type', () => {
    const onAdd = jest.fn();
    render(<NodePalette onAdd={onAdd} />);
    fireEvent.click(screen.getByTestId('palette-service'));
    expect(onAdd).toHaveBeenCalledWith('service');
  });
});

describe('NodeConfigPanel', () => {
  it('should render config fields for selected node', () => {
    const onUpdate = jest.fn();
    render(<NodeConfigPanel node={mockNodes[1]} onUpdate={onUpdate} onRemove={jest.fn()} />);
    expect(screen.getByTestId('node-config-panel')).toBeInTheDocument();
    expect(screen.getByTestId('config-label')).toHaveValue('IInventoryService (F166)');
    expect(screen.getByTestId('config-factoryId')).toHaveValue('F166');
  });

  it('should call onUpdate when label changed', () => {
    const onUpdate = jest.fn();
    render(<NodeConfigPanel node={mockNodes[1]} onUpdate={onUpdate} onRemove={jest.fn()} />);
    fireEvent.change(screen.getByTestId('config-label'), { target: { value: 'New Label' } });
    expect(onUpdate).toHaveBeenCalledWith({ label: 'New Label' });
  });

  it('should call onRemove when remove button clicked', () => {
    const onRemove = jest.fn();
    render(<NodeConfigPanel node={mockNodes[1]} onUpdate={jest.fn()} onRemove={onRemove} />);
    fireEvent.click(screen.getByTestId('config-remove'));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});

describe('FlowToolbar', () => {
  it('should render flow name and buttons', () => {
    render(<FlowToolbar flowName="Test Flow" dirty={false} onSave={jest.fn()} onNew={jest.fn()} saving={false} />);
    expect(screen.getByTestId('flow-toolbar')).toBeInTheDocument();
    expect(screen.getByText('Test Flow')).toBeInTheDocument();
  });

  it('should show Unsaved when dirty', () => {
    render(<FlowToolbar flowName="Test" dirty={true} onSave={jest.fn()} onNew={jest.fn()} saving={false} />);
    expect(screen.getByText('Unsaved')).toBeInTheDocument();
  });

  it('should disable save when not dirty', () => {
    render(<FlowToolbar flowName="Test" dirty={false} onSave={jest.fn()} onNew={jest.fn()} saving={false} />);
    expect(screen.getByTestId('toolbar-save')).toBeDisabled();
  });

  it('should enable save when dirty', () => {
    render(<FlowToolbar flowName="Test" dirty={true} onSave={jest.fn()} onNew={jest.fn()} saving={false} />);
    expect(screen.getByTestId('toolbar-save')).not.toBeDisabled();
  });
});

// ══════════════════════════════════════════════════════
// Freedom Components
// ══════════════════════════════════════════════════════

describe('ConfigFieldEditor', () => {
  it('should render string field', () => {
    render(<ConfigFieldEditor field={mockSection.fields[0]} onChange={jest.fn()} />);
    expect(screen.getByTestId('field-T44:batch_size')).toBeInTheDocument();
    expect(screen.getByTestId('field-input-T44:batch_size')).toHaveValue('100');
  });

  it('should render number field', () => {
    render(<ConfigFieldEditor field={mockSection.fields[1]} onChange={jest.fn()} />);
    expect(screen.getByTestId('field-input-T44:retry_count')).toHaveValue(3);
  });

  it('should render boolean field as checkbox', () => {
    render(<ConfigFieldEditor field={mockSection.fields[2]} onChange={jest.fn()} />);
    const checkbox = screen.getByTestId('field-input-T44:enabled');
    expect(checkbox).toBeChecked();
  });

  it('should call onChange on string input', () => {
    const onChange = jest.fn();
    render(<ConfigFieldEditor field={mockSection.fields[0]} onChange={onChange} />);
    fireEvent.change(screen.getByTestId('field-input-T44:batch_size'), { target: { value: '200' } });
    expect(onChange).toHaveBeenCalledWith('200');
  });

  it('should call onChange on checkbox toggle', () => {
    const onChange = jest.fn();
    render(<ConfigFieldEditor field={mockSection.fields[2]} onChange={onChange} />);
    fireEvent.click(screen.getByTestId('field-input-T44:enabled'));
    expect(onChange).toHaveBeenCalledWith(false);
  });
});

describe('ConfigSectionView', () => {
  it('should render section with fields', () => {
    render(<ConfigSectionView section={mockSection} onUpdateField={jest.fn()} />);
    expect(screen.getByTestId('config-section-T44')).toBeInTheDocument();
    expect(screen.getByText('Task Type: T44')).toBeInTheDocument();
    expect(screen.getByText('3 fields')).toBeInTheDocument();
  });

  it('should toggle collapse', () => {
    render(<ConfigSectionView section={mockSection} onUpdateField={jest.fn()} />);
    // Initially expanded — fields visible
    expect(screen.getByTestId('field-T44:batch_size')).toBeInTheDocument();
    // Click to collapse
    fireEvent.click(screen.getByTestId('section-toggle-T44'));
    // Fields should be hidden
    expect(screen.queryByTestId('field-T44:batch_size')).toBeNull();
  });
});

describe('ConfigToolbar', () => {
  it('should render search, reset, save', () => {
    render(<ConfigToolbar dirty={false} saving={false} searchQuery="" onSave={jest.fn()} onReset={jest.fn()} onSearch={jest.fn()} />);
    expect(screen.getByTestId('config-toolbar')).toBeInTheDocument();
    expect(screen.getByTestId('config-search')).toBeInTheDocument();
    expect(screen.getByTestId('config-reset')).toBeDisabled();
    expect(screen.getByTestId('config-save')).toBeDisabled();
  });

  it('should enable buttons when dirty', () => {
    render(<ConfigToolbar dirty={true} saving={false} searchQuery="" onSave={jest.fn()} onReset={jest.fn()} onSearch={jest.fn()} />);
    expect(screen.getByTestId('config-reset')).not.toBeDisabled();
    expect(screen.getByTestId('config-save')).not.toBeDisabled();
  });

  it('should call onSearch', () => {
    const onSearch = jest.fn();
    render(<ConfigToolbar dirty={false} saving={false} searchQuery="" onSave={jest.fn()} onReset={jest.fn()} onSearch={onSearch} />);
    fireEvent.change(screen.getByTestId('config-search'), { target: { value: 'batch' } });
    expect(onSearch).toHaveBeenCalledWith('batch');
  });
});

// ══════════════════════════════════════════════════════
// Ledger Components
// ══════════════════════════════════════════════════════

describe('LedgerEntryRow', () => {
  it('should render entry summary', () => {
    render(<LedgerEntryRow entry={mockLedgerEntry} />);
    expect(screen.getByTestId('ledger-entry-entry-1')).toBeInTheDocument();
    expect(screen.getByText('T44 generation passed')).toBeInTheDocument();
  });

  it('should expand to show details', () => {
    render(<LedgerEntryRow entry={mockLedgerEntry} />);
    // Click to expand
    fireEvent.click(screen.getByText('T44 generation passed'));
    // JSON details should be visible
    expect(screen.getByText(/"pipeline_passed"/)).toBeInTheDocument();
  });
});

describe('LedgerFilterBar', () => {
  it('should render category buttons', () => {
    render(<LedgerFilterBar active={null} onChange={jest.fn()} />);
    expect(screen.getByTestId('ledger-filter-bar')).toBeInTheDocument();
    expect(screen.getByTestId('filter-ALL')).toBeInTheDocument();
    expect(screen.getByTestId('filter-FLOW_RUN')).toBeInTheDocument();
  });

  it('should call onChange with category', () => {
    const onChange = jest.fn();
    render(<LedgerFilterBar active={null} onChange={onChange} />);
    fireEvent.click(screen.getByTestId('filter-CONFIG'));
    expect(onChange).toHaveBeenCalledWith('CONFIG');
  });

  it('should call onChange with null for ALL', () => {
    const onChange = jest.fn();
    render(<LedgerFilterBar active="FLOW_RUN" onChange={onChange} />);
    fireEvent.click(screen.getByTestId('filter-ALL'));
    expect(onChange).toHaveBeenCalledWith(null);
  });
});

// ══════════════════════════════════════════════════════
// Page Imports
// ══════════════════════════════════════════════════════

describe('Page Imports', () => {
  it('DesignerPage should be importable', async () => {
    const { DesignerPage } = await import('../../src/pages/DesignerPage');
    expect(DesignerPage).toBeDefined();
  });

  it('LedgerPage should be importable', async () => {
    const { LedgerPage } = await import('../../src/pages/LedgerPage');
    expect(LedgerPage).toBeDefined();
  });
});

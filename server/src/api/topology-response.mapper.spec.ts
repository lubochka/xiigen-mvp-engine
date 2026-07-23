/**
 * Tests for TopologyResponseMapper (Track 0 Turn 7).
 * Verifies v16 Finding U fallback + v17 Finding AA passthrough semantics.
 */

import { TopologyResponseMapper } from './topology-response.mapper';
import { TenantTopology } from '../engine/tenant-topology-store';

function makeTenantTopology(overrides: Partial<TenantTopology> = {}): TenantTopology {
  return {
    flowId: 'FLOW-TEST',
    tenantId: 'tenant-A',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'PRIVATE',
    name: 'Test Flow',
    version: 'v1',
    status: 'PUBLISHED',
    nodes: [
      { nodeId: 'n1', name: 'Start', archetype: 'ANALYSIS' },
      { nodeId: 'n2', name: 'End', archetype: 'EMIT' },
    ],
    edges: [{ from: 'n1', to: 'n2', condition: 'ok' }],
    metadata: {},
    createdAt: 'now',
    updatedAt: 'now',
    ...overrides,
  };
}

describe('TopologyResponseMapper', () => {
  const mapper = new TopologyResponseMapper();

  it('maps flowId and version', () => {
    const out = mapper.toTopologyContract(makeTenantTopology({ flowId: 'FLOW-X', version: 'v2' }));
    expect(out.flowId).toBe('FLOW-X');
    expect(out.version).toBe('v2');
  });

  it('v16 Finding U — description falls back to node.name (required by TopologyNodeDef)', () => {
    const out = mapper.toTopologyContract(
      makeTenantTopology({
        nodes: [{ nodeId: 'n1', name: 'My Node Label', archetype: 'ANALYSIS' }],
      }),
    );
    expect(out.nodes[0].description).toBe('My Node Label');
    // Verify all three runtime-read fields are present
    expect(out.nodes[0].id).toBe('n1');
    expect(out.nodes[0].name).toBe('My Node Label');
    expect(out.nodes[0].type).toBe('ANALYSIS');
  });

  it('preserves edge condition; omits optional type field', () => {
    const out = mapper.toTopologyContract(
      makeTenantTopology({
        edges: [{ from: 'a', to: 'b', condition: 'x === y' }],
      }),
    );
    expect(out.edges[0]).toEqual({
      from: 'a',
      to: 'b',
      condition: 'x === y',
      type: undefined,
    });
  });

  it('passes description through when metadata.description is a string', () => {
    const out = mapper.toTopologyContract(
      makeTenantTopology({
        metadata: { description: 'Global template description' },
      }),
    );
    expect(out.description).toBe('Global template description');
  });

  it('omits topology-level description when metadata has no description', () => {
    const out = mapper.toTopologyContract(makeTenantTopology({ metadata: {} }));
    expect(out.description).toBeUndefined();
  });

  it('maps archetype to type field (drives TopologyViewer color scheme)', () => {
    const out = mapper.toTopologyContract(
      makeTenantTopology({
        nodes: [
          { nodeId: 'v1', name: 'V', archetype: 'VALIDATION' },
          { nodeId: 'a1', name: 'A', archetype: 'ANALYSIS' },
          { nodeId: 'g1', name: 'G', archetype: 'GOVERNANCE' },
          { nodeId: 'e1', name: 'E', archetype: 'EMIT' },
        ],
      }),
    );
    expect(out.nodes.map((n) => n.type)).toEqual(['VALIDATION', 'ANALYSIS', 'GOVERNANCE', 'EMIT']);
  });
});

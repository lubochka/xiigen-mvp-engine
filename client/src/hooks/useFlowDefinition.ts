/**
 * useFlowDefinition — loads, edits, and saves flow definitions (JSON DAGs).
 * Translated from React Native. Uses flow engine endpoints.
 */

import { useState, useCallback } from 'react';
import { apiClient } from '../api/client';
import type { EngineDocument } from '../api/types';

export interface FlowDefinition {
  id: string;
  name: string;
  version: string;
  nodes: FlowNodeDef[];
  edges: FlowEdgeDef[];
  metadata: Record<string, unknown>;
}

export interface FlowNodeDef {
  id: string;
  type: string;
  label: string;
  factoryId: string;
  factoryInterface: string;
  fabric: string;
  position: { x: number; y: number };
  config: Record<string, unknown>;
}

export interface FlowEdgeDef {
  id: string;
  source: string;
  target: string;
  event?: string;
}

export interface UseFlowDefinitionReturn {
  flow: FlowDefinition | null;
  loading: boolean;
  error: string | null;
  dirty: boolean;
  loadFlow: (flowId: string) => Promise<void>;
  saveFlow: () => Promise<boolean>;
  updateNode: (nodeId: string, updates: Partial<FlowNodeDef>) => void;
  addNode: (node: FlowNodeDef) => void;
  removeNode: (nodeId: string) => void;
  addEdge: (edge: FlowEdgeDef) => void;
  removeEdge: (edgeId: string) => void;
  setFlow: (flow: FlowDefinition) => void;
  newFlow: (name: string) => void;
}

export function useFlowDefinition(tenantId = 'system'): UseFlowDefinitionReturn {
  const [flow, setFlowState] = useState<FlowDefinition | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const loadFlow = useCallback(
    async (flowId: string) => {
      setLoading(true);
      setError(null);
      const result = await apiClient.get<EngineDocument>('flowDefinitionById', {
        tenantId,
        pathParams: { flowId },
      });
      if (result.isSuccess && result.data) {
        const d = result.data;
        setFlowState({
          id: (d.flow_id as string) ?? flowId,
          name: (d.name as string) ?? '',
          version: (d.version as string) ?? '1.0.0',
          nodes: ((d.nodes as Record<string, unknown>[]) ?? []).map(
            (n: Record<string, unknown>, i: number) => ({
              id: (n['node_id'] as string) ?? `node-${i}`,
              type: (n['type'] as string) ?? 'service',
              label: (n['name'] as string) ?? (n['node_id'] as string) ?? '',
              factoryId: (n['factory_id'] as string) ?? '',
              factoryInterface: (n['interface_name'] as string) ?? '',
              fabric: (n['fabric_type'] as string) ?? 'CORE',
              position: { x: 0, y: 0 },
              config: (n['config'] as Record<string, unknown>) ?? {},
            }),
          ),
          edges: ((d.edges as Record<string, unknown>[]) ?? []).map(
            (e: Record<string, unknown>, i: number) => ({
              id: `edge-${i}`,
              source: (e['from'] as string) ?? '',
              target: (e['to'] as string) ?? '',
              event: e['event'] as string | undefined,
            }),
          ),
          metadata: (d.metadata as Record<string, unknown>) ?? {},
        });
        setDirty(false);
      } else {
        setError(result.error?.message ?? 'Failed to load flow');
      }
      setLoading(false);
    },
    [tenantId],
  );

  const saveFlow = useCallback(async (): Promise<boolean> => {
    if (!flow) return false;
    setLoading(true);
    const result = await apiClient.post<EngineDocument>('flowDefinitionSave', {
      tenantId,
      body: {
        flow_id: flow.id,
        name: flow.name,
        version: flow.version,
        nodes: flow.nodes.map((n) => ({
          node_id: n.id,
          type: n.type,
          name: n.label,
          factory_id: n.factoryId,
          interface_name: n.factoryInterface,
          fabric_type: n.fabric,
          config: n.config,
        })),
        edges: flow.edges.map((e) => ({ from: e.source, to: e.target, event: e.event })),
      },
    });
    setLoading(false);
    if (result.isSuccess) {
      setDirty(false);
      return true;
    }
    setError(result.error?.message ?? 'Save failed');
    return false;
  }, [flow, tenantId]);

  const updateNode = useCallback((nodeId: string, updates: Partial<FlowNodeDef>) => {
    setFlowState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        nodes: prev.nodes.map((n) => (n.id === nodeId ? { ...n, ...updates } : n)),
      };
    });
    setDirty(true);
  }, []);

  const addNode = useCallback((node: FlowNodeDef) => {
    setFlowState((prev) => {
      if (!prev) return prev;
      return { ...prev, nodes: [...prev.nodes, node] };
    });
    setDirty(true);
  }, []);

  const removeNode = useCallback((nodeId: string) => {
    setFlowState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        nodes: prev.nodes.filter((n) => n.id !== nodeId),
        edges: prev.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
      };
    });
    setDirty(true);
  }, []);

  const addEdge = useCallback((edge: FlowEdgeDef) => {
    setFlowState((prev) => {
      if (!prev) return prev;
      return { ...prev, edges: [...prev.edges, edge] };
    });
    setDirty(true);
  }, []);

  const removeEdge = useCallback((edgeId: string) => {
    setFlowState((prev) => {
      if (!prev) return prev;
      return { ...prev, edges: prev.edges.filter((e) => e.id !== edgeId) };
    });
    setDirty(true);
  }, []);

  const setFlow = useCallback((f: FlowDefinition) => {
    setFlowState(f);
    setDirty(false);
  }, []);

  const newFlow = useCallback((name: string) => {
    setFlowState({
      id: `flow_new_${Date.now()}`,
      name,
      version: '1.0.0',
      nodes: [
        {
          id: 'start',
          type: 'start',
          label: 'Start',
          factoryId: '',
          factoryInterface: '',
          fabric: 'CORE',
          position: { x: 0, y: 0 },
          config: {},
        },
        {
          id: 'end',
          type: 'end',
          label: 'End',
          factoryId: '',
          factoryInterface: '',
          fabric: 'CORE',
          position: { x: 0, y: 0 },
          config: {},
        },
      ],
      edges: [{ id: 'edge-0', source: 'start', target: 'end' }],
      metadata: {},
    });
    setDirty(true);
  }, []);

  return {
    flow,
    loading,
    error,
    dirty,
    loadFlow,
    saveFlow,
    updateNode,
    addNode,
    removeNode,
    addEdge,
    removeEdge,
    setFlow,
    newFlow,
  };
}

/**
 * DesignerPage — flow DAG editor with edge-connect mode, lifecycle panel,
 * and run trace inspector.
 *
 * Stage 3 additions:
 *   - Edge-connect mode: toggle via toolbar Connect button
 *   - FlowLifecyclePanel: shows/transitions flow status
 *   - RunTracePanel: inspect the latest run trace
 *
 * Track 0 Turn 14 (Track 4 — Option B locked):
 *   DesignerPage uses `FlowCanvas` from `../components/designer` as an embedded
 *   component. The separate `/pages/visual-flow-engine/FlowCanvasPage.tsx` is
 *   retained as a standalone FLOW-18 visual-flow editor surface (different
 *   mental model: DRAFT/PUBLISHED state-machine + publish flow), but the
 *   canonical authoring surface is THIS page. Do not duplicate edit flows
 *   between the two — new editor features go here.
 */

// Track 0 Turn 6 (v8 Finding 8.14 + v6 retry guard): imports include useEffect (was not in audit baseline).
import React, { useState, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useFlowDefinition, type FlowNodeDef, type FlowEdgeDef } from '../hooks/useFlowDefinition';
import { useFlowLifecycle } from '../hooks/useFlowLifecycle';
import { useRunTrace } from '../hooks/useRunTrace';
import { FlowCanvas, FlowToolbar, NodePalette, NodeConfigPanel } from '../components/designer';
import { FlowLifecyclePanel } from '../components/lifecycle';
import { RunTracePanel } from '../components/run-trace';

let nodeCounter = 1000;
let edgeCounter = 5000;

export function DesignerPage() {
  // Track 0 Turn 6 (v9 Issue A): optional :flowId? route param.
  //   No flowId → new flow (existing behavior).
  //   flowId present → load that flow via useFlowDefinition.loadFlow.
  const { flowId } = useParams<{ flowId?: string }>();

  const fd = useFlowDefinition();
  const lifecycle = useFlowLifecycle();
  const runTrace = useRunTrace();

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [connectMode, setConnectMode] = useState(false);
  const [runIdInput, setRunIdInput] = useState('');
  const [activeTab, setActiveTab] = useState<'palette' | 'lifecycle' | 'trace'>('palette');

  // Track 0 Turn 6 (v8 Finding 8.14 + v6 retry guard):
  //   DELETED render-time init pattern that existed at original lines 33-35:
  //     if (!fd.flow && !fd.loading) { fd.newFlow('New Flow'); }
  //   render-time mutation re-invokes newFlow on every re-render → state churn.
  //   REPLACED with useEffect:
  //     - If :flowId? present → loadFlow(flowId) once per flowId change.
  //     - Else → newFlow('New Flow') once if fd.flow is absent and not in error state.
  //   `!fd.error` guard prevents infinite retry loop when load/create fails.
  useEffect(() => {
    if (flowId) {
      if (!fd.flow || fd.flow.id !== flowId) {
        void fd.loadFlow(flowId);
      }
      return;
    }
    if (!fd.flow && !fd.loading && !fd.error) {
      fd.newFlow('New Flow');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowId, fd.flow?.id, fd.loading, fd.error]);

  const selectedNode = fd.flow?.nodes.find((n) => n.id === selectedNodeId) ?? null;

  const handleAddNode = useCallback(
    (type: string) => {
      nodeCounter++;
      const node: FlowNodeDef = {
        id: `node-${nodeCounter}`,
        type,
        label: `${type.charAt(0).toUpperCase() + type.slice(1)} ${nodeCounter}`,
        factoryId: '',
        factoryInterface: '',
        fabric: type === 'service' ? 'DATABASE' : 'CORE',
        position: { x: 0, y: 0 },
        config: {},
      };
      fd.addNode(node);
      setSelectedNodeId(node.id);
    },
    [fd],
  );

  const handleUpdateNode = useCallback(
    (updates: Partial<FlowNodeDef>) => {
      if (selectedNodeId) fd.updateNode(selectedNodeId, updates);
    },
    [selectedNodeId, fd],
  );

  const handleRemoveNode = useCallback(() => {
    if (selectedNodeId) {
      fd.removeNode(selectedNodeId);
      setSelectedNodeId(null);
    }
  }, [selectedNodeId, fd]);

  const handleEdgeCreate = useCallback(
    (sourceId: string, targetId: string) => {
      edgeCounter++;
      const edge: FlowEdgeDef = {
        id: `edge-${edgeCounter}`,
        source: sourceId,
        target: targetId,
      };
      fd.addEdge(edge);
      setConnectMode(false);
    },
    [fd],
  );

  const handleToggleConnect = useCallback(() => {
    setConnectMode((prev) => !prev);
    setSelectedNodeId(null);
  }, []);

  const handleLoadTrace = useCallback(() => {
    if (runIdInput.trim()) {
      runTrace.loadTrace(runIdInput.trim());
    }
  }, [runIdInput, runTrace]);

  const handlePollTrace = useCallback(() => {
    if (runIdInput.trim()) {
      runTrace.startPolling(runIdInput.trim());
    }
  }, [runIdInput, runTrace]);

  return (
    <div data-testid="page-designer">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Flow Designer</h1>

      {fd.flow && (
        <>
          <FlowToolbar
            flowName={fd.flow.name}
            dirty={fd.dirty}
            onSave={fd.saveFlow}
            onNew={() => {
              fd.newFlow('Untitled Flow');
              setSelectedNodeId(null);
              setConnectMode(false);
            }}
            saving={fd.loading}
            connectMode={connectMode}
            onToggleConnect={handleToggleConnect}
          />

          <div className="grid grid-cols-[1fr_260px] gap-4">
            {/* Canvas */}
            <FlowCanvas
              flow={fd.flow}
              selectedNodeId={selectedNodeId}
              onSelectNode={(id) => {
                setSelectedNodeId(id);
                if (id) setActiveTab('palette');
              }}
              connectMode={connectMode}
              onEdgeCreate={handleEdgeCreate}
              onConnectCancel={() => setConnectMode(false)}
            />

            {/* Right sidebar: tabs */}
            <div className="space-y-3">
              {/* Tab bar */}
              <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                {(['palette', 'lifecycle', 'trace'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-1 text-xs rounded capitalize ${
                      activeTab === tab
                        ? 'bg-white text-gray-800 shadow-sm font-medium'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                    data-testid={`tab-${tab}`}
                  >
                    {tab === 'palette' ? 'Nodes' : tab === 'lifecycle' ? 'Status' : 'Trace'}
                  </button>
                ))}
              </div>

              {/* Nodes tab */}
              {activeTab === 'palette' && (
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  {selectedNode ? (
                    <NodeConfigPanel
                      node={selectedNode}
                      onUpdate={handleUpdateNode}
                      onRemove={handleRemoveNode}
                    />
                  ) : (
                    <NodePalette onAdd={handleAddNode} />
                  )}
                </div>
              )}

              {/* Lifecycle tab */}
              {activeTab === 'lifecycle' && (
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <FlowLifecyclePanel
                    flowId={fd.flow.id}
                    record={lifecycle.record}
                    loading={lifecycle.loading}
                    error={lifecycle.error}
                    allowedNext={lifecycle.allowedNext}
                    onLoad={lifecycle.loadStatus}
                    onTransition={(toStatus) =>
                      lifecycle.transition(toStatus, lifecycle.record?.status)
                    }
                  />
                </div>
              )}

              {/* Run Trace tab */}
              {activeTab === 'trace' && (
                <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={runIdInput}
                      onChange={(e) => setRunIdInput(e.target.value)}
                      placeholder="Run ID…"
                      className="flex-1 px-2 py-1.5 text-xs border border-gray-200 rounded font-mono"
                      data-testid="run-id-input"
                    />
                    <button
                      onClick={handleLoadTrace}
                      className="px-2 py-1.5 text-xs bg-gray-700 text-white rounded hover:bg-gray-800"
                      data-testid="load-trace-btn"
                    >
                      Load
                    </button>
                    <button
                      onClick={runTrace.polling ? runTrace.stopPolling : handlePollTrace}
                      className={`px-2 py-1.5 text-xs rounded ${
                        runTrace.polling
                          ? 'bg-red-500 text-white hover:bg-red-600'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                      data-testid="poll-trace-btn"
                    >
                      {runTrace.polling ? 'Stop' : 'Live'}
                    </button>
                  </div>
                  <RunTracePanel
                    trace={runTrace.trace}
                    polling={runTrace.polling}
                    loading={runTrace.loading}
                    error={runTrace.error}
                  />
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {fd.error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">
          {fd.error}
        </div>
      )}
    </div>
  );
}

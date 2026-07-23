/**
 * FlowLibraryPage — tenant's flow library.
 *
 * Introduced by Track 0 Turn 6. Turn 3 (MVP Plan v3, Goal 2) added:
 *   - per-row badge for metadata.sourceType (DESIGN_SIM / TEACH_RUN / QA_RUN)
 *   - click-to-open version history side panel with click-through navigation
 *
 * Shows all flows visible to the tenant:
 *   - PRIVATE: tenant-owned (produced by CycleChain runs or saved from Designer)
 *   - GLOBAL:  platform-provided templates (forkable to PRIVATE)
 *
 * Route: /flow-library (App.tsx NAV_ITEMS entry added in same turn)
 *
 * Navigation:
 *   "Edit"           → /designer/:flowId (opens DesignerPage with the flow loaded)
 *   "View Topology"  → /flow-viewer/:flowId[?version=v1]
 *   "Fork"           → calls POST /api/flows/definitions/:flowId/fork
 *                      (disabled in UI until Turn 15 FLOW-18 integration; v8 Finding 8.16)
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFlowLibrary, FlowLibraryEntry } from '../hooks/useFlowLibrary';
import { useFlowVersions } from '../hooks/useFlowVersions';

export function FlowLibraryPage() {
  const navigate = useNavigate();
  const { flows, loading, error, refresh, fork } = useFlowLibrary();
  const [selectedFlowId, setSelectedFlowId] = useState<string | null>(null);
  const [forkingFlowId, setForkingFlowId] = useState<string | null>(null);

  // Turn 5 (MVP Plan v3, Goal 4a) — fork a GLOBAL template into a DRAFT
  // PRIVATE flow and refresh the list so the new flow appears immediately.
  const handleFork = async (flowId: string) => {
    setForkingFlowId(flowId);
    const newFlowId = await fork(flowId);
    setForkingFlowId(null);
    if (newFlowId) {
      // Navigate to the new DRAFT in Designer so the user can edit immediately.
      navigate(`/designer/${newFlowId}`);
    }
  };

  const privateFlows = flows.filter((f) => f.knowledge_scope === 'PRIVATE');
  const globalFlows = flows.filter((f) => f.knowledge_scope === 'GLOBAL');

  return (
    <div className="p-8 max-w-6xl" data-testid="flow-library-page">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Flow Library</h1>
          <p className="text-sm text-gray-500">
            {loading
              ? 'Loading…'
              : `${privateFlows.length} tenant flow(s) + ${globalFlows.length} global template(s)`}
          </p>
        </div>
        <button
          data-testid="refresh-button"
          onClick={() => void refresh()}
          className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div
          data-testid="flow-library-error"
          className="p-4 mb-4 bg-red-50 border border-red-300 text-red-700 rounded"
        >
          {error}
        </div>
      )}

      {/* Private flows section */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">My Flows</h2>
        {privateFlows.length === 0 ? (
          <p className="text-sm text-gray-500 italic">
            No private flows yet. Run a flow from the Run Flow page or fork a global template.
          </p>
        ) : (
          <FlowTable
            flows={privateFlows}
            onEdit={(id) => navigate(`/designer/${id}`)}
            onView={(id) => navigate(`/flow-viewer/${id}`)}
            onSelectRow={(id) => setSelectedFlowId(id)}
            selectedFlowId={selectedFlowId}
          />
        )}
      </section>

      {/* Global templates section */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Global Templates</h2>
        {globalFlows.length === 0 ? (
          <p className="text-sm text-gray-500 italic">No global templates available.</p>
        ) : (
          <FlowTable
            flows={globalFlows}
            onEdit={(id) => navigate(`/designer/${id}`)}
            onView={(id) => navigate(`/flow-viewer/${id}`)}
            onSelectRow={(id) => setSelectedFlowId(id)}
            selectedFlowId={selectedFlowId}
            showFork
            onFork={(id) => void handleFork(id)}
            forkingFlowId={forkingFlowId}
          />
        )}
      </section>

      {/* Turn 3 — version history side panel */}
      {selectedFlowId && (
        <VersionPanel
          flowId={selectedFlowId}
          onClose={() => setSelectedFlowId(null)}
          onViewVersion={(flowId, version) =>
            navigate(`/flow-viewer/${flowId}?version=${encodeURIComponent(version)}`)
          }
        />
      )}
    </div>
  );
}

interface FlowTableProps {
  flows: FlowLibraryEntry[];
  onEdit: (flowId: string) => void;
  onView: (flowId: string) => void;
  onSelectRow: (flowId: string) => void;
  selectedFlowId: string | null;
  showFork?: boolean;
  /** Turn 5 — fork handler; passed only for the Global Templates table. */
  onFork?: (flowId: string) => void;
  /** Turn 5 — flowId currently being forked (disables its Fork button). */
  forkingFlowId?: string | null;
}

/**
 * Turn 3 — sourceType → badge mapping. Unknown/legacy rows (no source_type)
 * render no badge. Colour palette deliberately distinct from status badges
 * (which use green/yellow/gray) so the two can sit side-by-side.
 */
function sourceTypeBadge(sourceType?: string): { label: string; className: string } | null {
  switch (sourceType) {
    case 'DESIGN_SIM':
      return { label: 'Simulation', className: 'bg-blue-100 text-blue-700' };
    case 'TEACH_RUN':
      return { label: 'Teach', className: 'bg-emerald-100 text-emerald-700' };
    case 'QA_RUN':
      return { label: 'QA', className: 'bg-amber-100 text-amber-700' };
    default:
      return null;
  }
}

function FlowTable({
  flows,
  onEdit,
  onView,
  onSelectRow,
  selectedFlowId,
  showFork = false,
  onFork,
  forkingFlowId = null,
}: FlowTableProps) {
  return (
    <div className="overflow-x-auto bg-white border border-gray-200 rounded">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
          <tr>
            <th className="px-4 py-2 text-start">Flow ID</th>
            <th className="px-4 py-2 text-start">Name</th>
            <th className="px-4 py-2 text-start">Type</th>
            <th className="px-4 py-2 text-start">Version</th>
            <th className="px-4 py-2 text-start">Status</th>
            <th className="px-4 py-2 text-start">Nodes</th>
            <th className="px-4 py-2 text-end">Actions</th>
          </tr>
        </thead>
        <tbody>
          {flows.map((f) => {
            const badge = sourceTypeBadge(f.source_type);
            const isSelected = selectedFlowId === f.flow_id;
            return (
              <tr
                key={f.flow_id}
                data-testid={`flow-row-${f.flow_id}`}
                className={`border-t border-gray-100 cursor-pointer ${
                  isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                }`}
                onClick={() => onSelectRow(f.flow_id)}
              >
                <td className="px-4 py-3 font-mono text-xs text-gray-700">{f.flow_id}</td>
                <td className="px-4 py-3 text-gray-900">{f.name}</td>
                <td className="px-4 py-3">
                  {badge ? (
                    <span
                      data-testid={`source-badge-${f.flow_id}`}
                      className={`px-2 py-0.5 text-xs rounded ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-600">{f.version}</td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-0.5 text-xs rounded ${
                      f.status === 'PUBLISHED'
                        ? 'bg-green-100 text-green-700'
                        : f.status === 'DRAFT'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {f.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">{f.node_count}</td>
                <td
                  className="px-4 py-3 text-end space-x-2"
                  // Stop row-click propagation so clicking an action doesn't also
                  // open the version panel for a different flow.
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    data-testid={`edit-button-${f.flow_id}`}
                    onClick={() => onEdit(f.flow_id)}
                    className="text-blue-600 hover:underline text-xs"
                  >
                    Edit
                  </button>
                  <button
                    data-testid={`view-button-${f.flow_id}`}
                    onClick={() => onView(f.flow_id)}
                    className="text-blue-600 hover:underline text-xs"
                  >
                    View Topology
                  </button>
                  {showFork && (
                    <button
                      data-testid={`fork-button-${f.flow_id}`}
                      onClick={() => onFork?.(f.flow_id)}
                      disabled={forkingFlowId === f.flow_id}
                      title="Fork this template into a new DRAFT you can edit"
                      className={`text-xs ${
                        forkingFlowId === f.flow_id
                          ? 'text-gray-400 cursor-wait'
                          : 'text-blue-600 hover:underline'
                      }`}
                    >
                      {forkingFlowId === f.flow_id ? 'Forking…' : 'Fork'}
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

interface VersionPanelProps {
  flowId: string;
  onClose: () => void;
  onViewVersion: (flowId: string, version: string) => void;
}

/**
 * Turn 3 — side panel rendering the version chain for a selected flow.
 * Styled as a lightweight right-anchored drawer; fixed width so it overlays
 * the flow table without a layout shift.
 */
function VersionPanel({ flowId, onClose, onViewVersion }: VersionPanelProps) {
  const { versions, loading, error } = useFlowVersions(flowId);

  return (
    <aside
      data-testid="flow-version-panel"
      className="fixed top-0 right-0 h-full w-96 bg-white border-l border-gray-200 shadow-lg p-6 overflow-y-auto z-40"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Version History</h2>
          <p className="text-xs font-mono text-gray-500 mt-1">{flowId}</p>
        </div>
        <button
          data-testid="version-panel-close"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-700 text-xl leading-none"
          aria-label="Close version panel"
        >
          ×
        </button>
      </div>

      {loading && (
        <p className="text-sm text-gray-500" data-testid="version-panel-loading">
          Loading versions…
        </p>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded">
          {error}
        </div>
      )}

      {!loading && !error && versions.length === 0 && (
        <p className="text-sm text-gray-500 italic">No version history available for this flow.</p>
      )}

      {!loading && versions.length > 0 && (
        <ul className="space-y-3">
          {versions.map((v, i) => (
            <li
              key={`${v.flow_id}:${v.version}:${i}`}
              data-testid={`version-row-${v.version}`}
              className="border border-gray-200 rounded p-3 bg-gray-50"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-sm font-medium text-gray-900">{v.version}</span>
                <span
                  className={`px-2 py-0.5 text-xs rounded ${
                    v.status === 'PUBLISHED'
                      ? 'bg-green-100 text-green-700'
                      : v.status === 'DRAFT'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {v.status}
                </span>
              </div>
              <div className="text-xs text-gray-500 mb-2">
                Updated {new Date(v.updated_at).toLocaleString()} · {v.node_count} node
                {v.node_count === 1 ? '' : 's'}
              </div>
              <div className="flex space-x-2">
                <button
                  data-testid={`version-view-${v.version}`}
                  onClick={() => onViewVersion(v.flow_id, v.version)}
                  className="text-blue-600 hover:underline text-xs"
                >
                  View
                </button>
                <button
                  data-testid={`version-revert-${v.version}`}
                  disabled
                  title="Revert → Fork delivered in Turn 5 (MVP Plan v3)"
                  className="text-gray-400 text-xs cursor-not-allowed"
                >
                  Revert
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}

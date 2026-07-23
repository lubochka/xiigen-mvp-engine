/**
 * MetaFlowEngineTopologyCanvas — FLOW-26 Grammar 4 (Topology Canvas).
 *
 * Reference implementation seeds the canvas with the 24 orphan processes
 * from docs/sessions/FLOW-26/UI-REFLECTION-STATE.md grouped into 6 logical
 * lifecycle phases, and wires them into a compact ReactFlow DAG matching
 * the FLOW-29 reference topology pattern:
 *
 *   INTAKE → GENERATION → VALIDATION → REGISTRATION → DEPLOYMENT → OBSERVATION
 *
 * Ref platform (per MARKET-REFERENCE-CATALOG §4): n8n meta-workflow view +
 * Temporal UI + Airflow DAG. Flow-as-node, colour + icon for state, side
 * panel on node click with human-readable description + event emitted.
 *
 * Deliberate simplifications vs. FLOW-29 (kept for scope discipline):
 *   - Single mock "capability-gap → publish" run instead of a run selector
 *   - State tint per node from a pre-baked RUN_STATE rather than ?run= URL param
 *   - Side panel derived from a local NODE_DESCRIPTIONS dictionary
 * The FLOW-29 zoom controls / path-summary fallback / budget strip are NOT
 * replicated here; they can be added in a later polish pass.
 */

import React, { useMemo, useState, useCallback } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MarkerType,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
} from 'reactflow';
import 'reactflow/dist/style.css';

// ── Phase + state taxonomy ────────────────────────────────────────────────────

type PhaseKey =
  | 'INTAKE'
  | 'GENERATION'
  | 'VALIDATION'
  | 'REGISTRATION'
  | 'DEPLOYMENT'
  | 'OBSERVATION';

type NodeState = 'idle' | 'running' | 'pending' | 'complete' | 'failed';

interface PhaseDef {
  key: PhaseKey;
  label: string;
  x: number; // column x offset
  accent: string; // tailwind bg class for the phase header chip
}

const PHASES: PhaseDef[] = [
  { key: 'INTAKE', label: 'Intake', x: 0, accent: 'bg-blue-100 text-blue-700' },
  { key: 'GENERATION', label: 'Generation', x: 280, accent: 'bg-indigo-100 text-indigo-700' },
  { key: 'VALIDATION', label: 'Validation', x: 560, accent: 'bg-amber-100 text-amber-700' },
  {
    key: 'REGISTRATION',
    label: 'Registration',
    x: 840,
    accent: 'bg-purple-100 text-purple-700',
  },
  { key: 'DEPLOYMENT', label: 'Deployment', x: 1120, accent: 'bg-emerald-100 text-emerald-700' },
  {
    key: 'OBSERVATION',
    label: 'Observation',
    x: 1400,
    accent: 'bg-rose-100 text-rose-700',
  },
];

const STATE_STYLES: Record<NodeState, { border: string; dot: string; tint: string; text: string }> =
  {
    idle: { border: '#CBD5E1', dot: 'bg-slate-400', tint: '#F8FAFC', text: 'text-slate-500' },
    running: { border: '#F59E0B', dot: 'bg-amber-500', tint: '#FFFBEB', text: 'text-amber-700' },
    pending: { border: '#CBD5E1', dot: 'bg-slate-300', tint: '#F8FAFC', text: 'text-slate-500' },
    complete: {
      border: '#10B981',
      dot: 'bg-emerald-500',
      tint: '#ECFDF5',
      text: 'text-emerald-700',
    },
    failed: { border: '#EF4444', dot: 'bg-red-500', tint: '#FEF2F2', text: 'text-red-700' },
  };

const STATE_LABELS: Record<NodeState, string> = {
  idle: 'Idle',
  running: 'Running',
  pending: 'Pending',
  complete: 'Complete',
  failed: 'Failed',
};

// ── 24 process seed ───────────────────────────────────────────────────────────

interface ProcessDef {
  id: string;
  label: string; // human-readable
  phase: PhaseKey;
  row: number; // y offset within phase column
  eventEmitted?: string; // from UI-REFLECTION-STATE
  description: string; // plain-English, no slug leak
}

const PROCESSES: ProcessDef[] = [
  // INTAKE (6)
  {
    id: 'flow-spec-parser',
    label: 'Flow spec parser',
    phase: 'INTAKE',
    row: 0,
    eventEmitted: 'flow.spec.parsed',
    description: 'Parses the incoming capability-gap proposal into a flow-spec AST.',
  },
  {
    id: 'flow-spec-validator',
    label: 'Flow spec validator',
    phase: 'INTAKE',
    row: 1,
    description: 'Validates the AST against the spec schema. Rejects malformed proposals here.',
  },
  {
    id: 'seed-prompt-registrar',
    label: 'Seed prompt registrar',
    phase: 'INTAKE',
    row: 2,
    eventEmitted: 'flow.prompts.registered',
    description: 'Registers the seed prompt set that the generation phase will use.',
  },
  {
    id: 'flow-template-resolver',
    label: 'Flow template resolver',
    phase: 'INTAKE',
    row: 3,
    eventEmitted: 'flow.templates.resolved',
    description: 'Resolves which existing flow templates the new flow inherits from.',
  },
  {
    id: 'cross-flow-impact-analyzer',
    label: 'Cross-flow impact analyzer',
    phase: 'INTAKE',
    row: 4,
    eventEmitted: 'flow.impact.analyzed',
    description: 'Analyses impact on existing flows — reads factory registry + task-type registry.',
  },
  {
    id: 'bfa-conflict-scanner',
    label: 'BFA conflict scanner',
    phase: 'INTAKE',
    row: 5,
    eventEmitted: 'flow.bfa.scanned',
    description:
      'Scans for cross-flow conflicts (entity overlap, route overlap, factory overlap). Blocks on conflict.',
  },
  // GENERATION (5)
  {
    id: 'contract-code-emitter',
    label: 'Contract code emitter',
    phase: 'GENERATION',
    row: 0,
    eventEmitted: 'flow.contract.emitted',
    description: 'Emits the TypeScript contract types for the new flow.',
  },
  {
    id: 'service-code-generator',
    label: 'Service code generator',
    phase: 'GENERATION',
    row: 1,
    eventEmitted: 'flow.service.generated',
    description: 'Generates the NestJS service class extending MicroserviceBase.',
  },
  {
    id: 'test-code-generator',
    label: 'Test code generator',
    phase: 'GENERATION',
    row: 2,
    eventEmitted: 'flow.tests.generated',
    description: 'Generates e2e + integration tests for the new flow.',
  },
  {
    id: 'code-scaffold-generator',
    label: 'Code scaffold generator',
    phase: 'GENERATION',
    row: 3,
    eventEmitted: 'flow.scaffold.generated',
    description: 'Scaffolds folder structure, barrel exports, module registration.',
  },
  {
    id: 'code-assembly-orchestrator',
    label: 'Code assembly orchestrator',
    phase: 'GENERATION',
    row: 4,
    eventEmitted: 'flow.code.assembled',
    description: 'Combines contract + service + tests + scaffold into a single code-change bundle.',
  },
  // VALIDATION (4)
  {
    id: 'dna-compliance-checker',
    label: 'DNA compliance checker',
    phase: 'VALIDATION',
    row: 0,
    eventEmitted: 'flow.dna.checked',
    description: 'Runs all 9 DNA-rule guards against the generated code.',
  },
  {
    id: 'syntax-validation-runner',
    label: 'Syntax validation runner',
    phase: 'VALIDATION',
    row: 1,
    eventEmitted: 'flow.syntax.validated',
    description: 'Runs TypeScript + ESLint + Prettier. Must pass before registration.',
  },
  {
    id: 'flow-quality-gate',
    label: 'Flow quality gate',
    phase: 'VALIDATION',
    row: 2,
    eventEmitted: 'flow.quality.passed',
    description: 'Runs the generated tests in an ephemeral sandbox. Rejects on test failure.',
  },
  {
    id: 'extension-health-scorer',
    label: 'Extension health scorer',
    phase: 'VALIDATION',
    row: 3,
    eventEmitted: 'flow.extension.scored',
    description: 'Scores the extension on DNA compliance + test coverage + BFA constraints.',
  },
  // REGISTRATION (4)
  {
    id: 'factory-registrar',
    label: 'Factory registrar',
    phase: 'REGISTRATION',
    row: 0,
    eventEmitted: 'flow.factory.registered',
    description: 'Registers any new factory interfaces with the factory registry.',
  },
  {
    id: 'task-type-registrar',
    label: 'Task-type registrar',
    phase: 'REGISTRATION',
    row: 1,
    eventEmitted: 'flow.tasktype.registered',
    description: "Registers the flow's task types (T-NNN assignments) with the catalog.",
  },
  {
    id: 'flow-registration-orchestrator',
    label: 'Flow registration orchestrator',
    phase: 'REGISTRATION',
    row: 2,
    eventEmitted: 'flow.registered',
    description: 'Registers the new flow in the flow registry (FLOW-XX slug + metadata).',
  },
  {
    id: 'flow-dependency-mapper',
    label: 'Flow dependency mapper',
    phase: 'REGISTRATION',
    row: 3,
    eventEmitted: 'flow.dependencies.mapped',
    description: "Maps the new flow's dependencies into the flow-dependency DAG.",
  },
  // DEPLOYMENT (2)
  {
    id: 'flow-deployment-gate',
    label: 'Flow deployment gate',
    phase: 'DEPLOYMENT',
    row: 0,
    eventEmitted: 'flow.deployment.approved',
    description: 'Final gate — requires human approval before deployment proceeds.',
  },
  {
    id: 'meta-flow-orchestrator',
    label: 'Meta flow orchestrator',
    phase: 'DEPLOYMENT',
    row: 1,
    eventEmitted: 'metaflow.orchestration.initiated',
    description: 'Triggers deployment pipeline and notifies downstream consumers.',
  },
  // OBSERVATION (3)
  {
    id: 'self-extension-learner',
    label: 'Self-extension learner',
    phase: 'OBSERVATION',
    row: 0,
    eventEmitted: 'flow.extension.learned',
    description: 'Captures learning signals from this run to improve future extensions.',
  },
  {
    id: 'meta-flow-audit-emitter',
    label: 'Meta-flow audit emitter',
    phase: 'OBSERVATION',
    row: 1,
    eventEmitted: 'metaflow.audit.emitted',
    description: 'Emits audit-trail events for compliance + debugging.',
  },
  {
    id: 'flow-evolution-tracker',
    label: 'Flow evolution tracker',
    phase: 'OBSERVATION',
    row: 2,
    eventEmitted: 'flow.evolution.tracked',
    description: 'Tracks flow revisions over time so governance can see the full history.',
  },
];

// ── Edge seed (22 edges — mostly linear DAG between phases) ──────────────────

const EDGES: { from: string; to: string; label?: string }[] = [
  // INTAKE internal
  { from: 'flow-spec-parser', to: 'flow-spec-validator', label: 'AST' },
  { from: 'flow-spec-validator', to: 'seed-prompt-registrar', label: 'validated' },
  { from: 'flow-spec-validator', to: 'flow-template-resolver', label: 'validated' },
  { from: 'seed-prompt-registrar', to: 'cross-flow-impact-analyzer' },
  { from: 'flow-template-resolver', to: 'cross-flow-impact-analyzer' },
  { from: 'cross-flow-impact-analyzer', to: 'bfa-conflict-scanner' },
  // INTAKE → GENERATION
  { from: 'bfa-conflict-scanner', to: 'contract-code-emitter', label: 'no conflict' },
  // GENERATION internal
  { from: 'contract-code-emitter', to: 'service-code-generator' },
  { from: 'service-code-generator', to: 'test-code-generator' },
  { from: 'test-code-generator', to: 'code-scaffold-generator' },
  { from: 'code-scaffold-generator', to: 'code-assembly-orchestrator' },
  // GENERATION → VALIDATION
  { from: 'code-assembly-orchestrator', to: 'dna-compliance-checker', label: 'bundle' },
  // VALIDATION internal
  { from: 'dna-compliance-checker', to: 'syntax-validation-runner' },
  { from: 'syntax-validation-runner', to: 'flow-quality-gate' },
  { from: 'flow-quality-gate', to: 'extension-health-scorer' },
  // VALIDATION → REGISTRATION
  { from: 'extension-health-scorer', to: 'factory-registrar' },
  { from: 'extension-health-scorer', to: 'task-type-registrar' },
  { from: 'factory-registrar', to: 'flow-registration-orchestrator' },
  { from: 'task-type-registrar', to: 'flow-registration-orchestrator' },
  { from: 'flow-registration-orchestrator', to: 'flow-dependency-mapper' },
  // REGISTRATION → DEPLOYMENT
  { from: 'flow-dependency-mapper', to: 'flow-deployment-gate' },
  { from: 'flow-deployment-gate', to: 'meta-flow-orchestrator', label: 'approved' },
  // DEPLOYMENT → OBSERVATION
  { from: 'meta-flow-orchestrator', to: 'meta-flow-audit-emitter' },
  { from: 'meta-flow-audit-emitter', to: 'self-extension-learner' },
  { from: 'self-extension-learner', to: 'flow-evolution-tracker' },
];

// ── Run state (pre-baked "mid-run" state matching FLOW-29 stalled demo) ──────

const RUN_STATE: Record<string, NodeState> = {
  'flow-spec-parser': 'complete',
  'flow-spec-validator': 'complete',
  'seed-prompt-registrar': 'complete',
  'flow-template-resolver': 'complete',
  'cross-flow-impact-analyzer': 'complete',
  'bfa-conflict-scanner': 'complete',
  'contract-code-emitter': 'complete',
  'service-code-generator': 'complete',
  'test-code-generator': 'running',
  'code-scaffold-generator': 'pending',
  'code-assembly-orchestrator': 'pending',
  'dna-compliance-checker': 'pending',
  'syntax-validation-runner': 'pending',
  'flow-quality-gate': 'pending',
  'extension-health-scorer': 'pending',
  'factory-registrar': 'idle',
  'task-type-registrar': 'idle',
  'flow-registration-orchestrator': 'idle',
  'flow-dependency-mapper': 'idle',
  'flow-deployment-gate': 'idle',
  'meta-flow-orchestrator': 'idle',
  'self-extension-learner': 'idle',
  'meta-flow-audit-emitter': 'idle',
  'flow-evolution-tracker': 'idle',
};

// ── Custom ReactFlow node ─────────────────────────────────────────────────────

interface ProcessNodeData {
  label: string;
  state: NodeState;
  selected: boolean;
}

function ProcessNode({ data }: { data: ProcessNodeData }) {
  const styles = STATE_STYLES[data.state];
  return (
    <div
      data-testid={`meta-node-${data.label.replace(/\s+/g, '-').toLowerCase()}`}
      data-node-state={data.state}
      data-node-selected={data.selected ? 'true' : 'false'}
      style={{
        minWidth: 220,
        padding: '8px 12px',
        borderRadius: 8,
        border: `2px solid ${styles.border}`,
        background: styles.tint,
        boxShadow: data.selected ? '0 0 0 3px rgba(59, 130, 246, 0.35)' : 'none',
        fontSize: 12,
      }}
    >
      <div className="flex items-center gap-2">
        <span className={`inline-block w-2 h-2 rounded-full ${styles.dot}`} aria-hidden="true" />
        <span className="font-semibold text-slate-800">{data.label}</span>
      </div>
      <div className={`mt-1 text-[11px] ${styles.text}`}>{STATE_LABELS[data.state]}</div>
    </div>
  );
}

const nodeTypes = { processNode: ProcessNode };

// ── Main canvas ───────────────────────────────────────────────────────────────

export function MetaFlowEngineTopologyCanvas(): React.ReactElement {
  const [selectedId, setSelectedId] = useState<string>('test-code-generator');

  const initialNodes: Node<ProcessNodeData>[] = useMemo(
    () =>
      PROCESSES.map((p) => {
        const phase = PHASES.find((ph) => ph.key === p.phase)!;
        return {
          id: p.id,
          type: 'processNode',
          position: { x: phase.x, y: p.row * 100 },
          data: {
            label: p.label,
            state: RUN_STATE[p.id] ?? 'idle',
            selected: p.id === selectedId,
          },
        };
      }),
    [selectedId],
  );

  const initialEdges: Edge[] = useMemo(
    () =>
      EDGES.map((e, i) => ({
        id: `edge-${i}`,
        source: e.from,
        target: e.to,
        label: e.label,
        style: { stroke: '#94A3B8', strokeWidth: 1.5 },
        labelStyle: { fontSize: 10, fill: '#64748B' },
        labelBgStyle: { fill: '#FFFFFF', fillOpacity: 0.85 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#94A3B8' },
      })),
    [],
  );

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  const onNodeClick = useCallback((_evt: React.MouseEvent, node: Node) => {
    setSelectedId(node.id);
  }, []);

  // Keep node `selected` flag in sync with selectedId.
  const displayedNodes = nodes.map((n) => ({
    ...n,
    data: { ...(n.data as ProcessNodeData), selected: n.id === selectedId },
  }));

  const selectedProcess = PROCESSES.find((p) => p.id === selectedId);
  const selectedPhase = selectedProcess
    ? PHASES.find((ph) => ph.key === selectedProcess.phase)
    : undefined;
  const selectedState = selectedProcess ? (RUN_STATE[selectedProcess.id] ?? 'idle') : 'idle';
  const selectedStyles = STATE_STYLES[selectedState];

  // Phase headers rendered above each column
  const phaseHeaderYOffset = -40;

  return (
    <div className="flex h-[700px] border border-gray-200 rounded-lg overflow-hidden bg-white">
      {/* Canvas */}
      <div className="flex-1 relative" data-testid="meta-topology-canvas">
        <ReactFlow
          nodes={displayedNodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#E5E7EB" gap={24} />
          <Controls showInteractive={false} />
          {/* Phase header overlays */}
          {PHASES.map((ph) => (
            <div
              key={ph.key}
              className={`absolute text-xs font-semibold px-2 py-0.5 rounded ${ph.accent}`}
              style={{
                left: ph.x + 32,
                top: phaseHeaderYOffset + 40,
                pointerEvents: 'none',
              }}
              data-testid={`meta-phase-${ph.key.toLowerCase()}`}
            >
              {ph.label}
            </div>
          ))}
        </ReactFlow>
      </div>

      {/* Side panel */}
      <aside
        className="w-80 border-l border-gray-200 bg-slate-50 p-4 overflow-y-auto"
        data-testid="meta-detail-panel"
        data-node-selected={selectedId}
      >
        {selectedProcess && selectedPhase && (
          <>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              {selectedPhase.label} phase
            </div>
            <h3 className="text-base font-semibold text-slate-900 mb-1">{selectedProcess.label}</h3>
            <div className="flex items-center gap-2 mb-3">
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border`}
                style={{
                  background: selectedStyles.tint,
                  borderColor: selectedStyles.border,
                }}
              >
                <span
                  className={`inline-block w-1.5 h-1.5 rounded-full ${selectedStyles.dot}`}
                  aria-hidden="true"
                />
                <span className={selectedStyles.text}>{STATE_LABELS[selectedState]}</span>
              </span>
            </div>
            <p
              className="text-sm text-slate-700 leading-relaxed mb-4"
              data-testid="meta-detail-description"
            >
              {selectedProcess.description}
            </p>
            {selectedProcess.eventEmitted && (
              <div className="text-xs">
                <div className="text-gray-500 mb-0.5">Emits event</div>
                <code className="font-mono text-slate-800 bg-white border border-gray-200 px-2 py-0.5 rounded">
                  {selectedProcess.eventEmitted}
                </code>
              </div>
            )}
          </>
        )}
      </aside>
    </div>
  );
}

/**
 * AdaptiveRagDeepResearchPage — FLOW-29 topology canvas (RUN-50 v2 rebuild).
 *
 * Market references (not invented):
 *   - LangSmith / Helicone run views  (pipeline + stage progress)
 *   - n8n / draw.io / Temporal UI     (node-graph canvas conventions)
 *   - Dagster asset graph             (DAG status colouring + detail panel)
 *
 * Skills applied to this iteration (RUN-50):
 *   ui-ux-pro-max        — Analytics Dashboard rule, chart#25 DAG a11y,
 *                          color-not-only, aria-labels, nav-state-active.
 *   design-for-ai        — ai-tells.md: no monospace-everywhere, no
 *                          identical-card grid, phase-cohesion via subtle
 *                          tint, warm/cool depth, one dominant element.
 *   interface-design     — Precision & Density system: slate foundation,
 *                          system-ui for labels, mono only for data IDs,
 *                          borders-only 0.5px, scale 11/12/13/14/16/18,
 *                          spacing base 4px, weights 400/500/600.
 *                        — CRITIQUE findings integrated: signature
 *                          "budget consumption strip" embedded in running
 *                          nodes (fuel-gauge-on-the-vehicle pattern);
 *                          domain-specific token aliases; explicit
 *                          aesthetic-intent block below.
 *
 * AESTHETIC INTENT (written once, referenced by every future iteration):
 *   Who opens this:  ML-ops engineer at 2am. Tired. Precise. Zero patience
 *                    for decoration. The thing they use when something is
 *                    wrong and they need to understand it.
 *   What they do:    Find what's blocking. Kill it or let it run.
 *   What it feels:   Cold precision. Scientific instrument. A terminal
 *                    that grew a UI. Not warm, not friendly — authoritative,
 *                    legible, immediate.
 *   What it is not:  A "modern SaaS dashboard." Not a "clean and friendly"
 *                    surface. Not warm gradient AI purple.
 *
 * USER INTENT (verbatim, docs/sessions/FLOW-29/FLOW-29-STEP-1-INVARIANTS.md):
 *   "When a deep research query arrives on the XIIGen engine, route it through
 *    the adaptive RAG pipeline, execute multi-hop graph traversal, and return
 *    synthesised findings with source attribution."
 *
 * SLUG → HUMAN LABEL TRANSLATION MAP (same as RUN-48, preserved):
 *   adaptive-rag-router              → "Route Research Query"
 *   bandit-model-selector            → "Select AI Model"
 *   vector-retrieval-step            → "Retrieve Vectors"
 *   graph-rag-community-query        → "Query Knowledge Community"
 *   multi-hop-graph-traversal        → "Traverse Knowledge Graph"
 *   hybrid-retrieval-fusion          → "Merge Retrieval Results"
 *   reranker-step                    → "Rerank Sources"
 *   budget-enforcement-gate          → "Check Budget Limit"
 *   context-efficiency-check         → "Check Context Fit"
 *   self-reflection-guard            → "Self-Reflect On Answer"
 *   eval-quality-gate                → "Score Answer Quality"
 *   knowledge-graph-edit-gate        → "Gate Knowledge Edits"
 *   control-plane-graph-edit         → "Apply Graph Edit"
 *   control-plane-node-renderer      → "Render Graph Node"
 *   domain-graph-index-rebuild       → "Rebuild Domain Index"
 *   domain-profile-compiler          → "Compile Domain Profile"
 *   community-summary-generator      → "Summarise Community"
 *   trace-span-capture               → "Capture Trace"
 *   user-feedback-ingest             → "Receive User Feedback"
 *   feedback-aggregation-window      → "Aggregate Feedback"
 *   improvement-suggestion-engine    → "Suggest Improvements"
 *   prompt-version-promoter          → "Promote Prompt Version"
 *   rag-asset-version-compare        → "Compare Asset Versions"
 *   rag-strategy-rollback            → "Rollback Strategy"
 *   routing-policy-updater           → "Update Routing Policy"
 *   promotion-pipeline-gate          → "Gate Promotion"
 *   ab-test-allocator                → "Allocate A/B Test"
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ReactFlow, {
  Background,
  MarkerType,
  type Node as RfNode,
  type Edge as RfEdge,
  type NodeProps,
  Handle,
  Position,
  useReactFlow,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  Workflow,
  Lock,
  Activity,
  CheckCircle2,
  Clock,
  XCircle,
  Circle,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from 'lucide-react';
import { BusinessStateCard, BusinessState } from '../../components/admin/BusinessStateCard';
import { RoleScopedView } from '../../components/common/RoleScopedView';
import { useViewerRole } from '../../hooks/useViewerRole';

// ──────────────────────────────────────────────────────────────────────────
// Design tokens (interface-design Precision & Density system)
// ──────────────────────────────────────────────────────────────────────────

// Domain-specific tokens (interface-design token-test):
// names speak XIIGen's world, not Tailwind's. A developer reading
// `budgetConsumed` knows what it means; `amber-500` tells them nothing.
const TOKEN = {
  // Foundation (cool slate — rack metal of server hardware, not pure black)
  canvasBg: '#0f172a', // slate-900
  surface: '#1e293b', // slate-800 (node backgrounds)
  surfaceAlt: '#334155', // slate-700 (phase-tint layer)
  border: '#334155', // slate-700 (node borders default)
  borderFaint: '#475569', // slate-600 (dividers)
  // Foreground (slate-based, not pure white)
  ink: '#e2e8f0', // slate-200 — primary text
  inkSecondary: '#cbd5e1', // slate-300 — brighter than fgMuted for edge labels
  fg: '#e2e8f0', // alias, keep compatibility
  fgSecondary: '#94a3b8', // slate-400
  fgMuted: '#64748b', // slate-500
  // Semantic domain colours (not decorative — they MEAN something)
  signal: '#10b981', // emerald-500 — "a signal that is alive and running"
  pipeline: '#f59e0b', // amber-500 — "old-school monitoring, pending"
  fault: '#ef4444', // red-500   — "physical indicator light that means stop"
  accent: '#3b82f6', // blue-500  — active/selected
  // Budget-consumption strip (signature element)
  budgetRemaining: '#334155', // slate-700 filled portion
  budgetConsumed: '#f59e0b', // amber — consumed but not yet critical
  budgetCritical: '#ef4444', // red — past critical threshold (>90%)
  // Font stack
  fontUi: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  fontMono: '"SF Mono", Consolas, Monaco, monospace',
} as const;

// Semantic state colours — follow market convention (green complete,
// amber pending, red failed). Each state carries icon + text label so
// meaning survives without colour (Pro Max color-not-only).
type NodeRuntimeState = 'idle' | 'running' | 'complete' | 'pending' | 'failed';

const STATE: Record<
  NodeRuntimeState,
  {
    border: string;
    dot: string;
    tint: string;
    label: string;
    Icon: typeof CheckCircle2;
  }
> = {
  idle: {
    border: '#475569', // slate-600
    dot: '#64748b',
    tint: 'transparent',
    label: 'Not reached',
    Icon: Circle,
  },
  running: {
    border: '#3b82f6', // blue-500
    dot: '#60a5fa',
    tint: 'rgba(59, 130, 246, 0.08)',
    label: 'Running',
    Icon: Activity,
  },
  pending: {
    border: '#f59e0b', // amber-500
    dot: '#fbbf24',
    tint: 'rgba(245, 158, 11, 0.08)',
    label: 'Pending',
    Icon: Clock,
  },
  complete: {
    border: '#10b981', // emerald-500
    dot: '#34d399',
    tint: 'rgba(16, 185, 129, 0.06)',
    label: 'Complete',
    Icon: CheckCircle2,
  },
  failed: {
    border: '#ef4444', // red-500
    dot: '#f87171',
    tint: 'rgba(239, 68, 68, 0.08)',
    label: 'Failed',
    Icon: XCircle,
  },
};

// Phase tinting — breaks the "identical card grid" ai-tell via subtle hue
// cohesion within a phase group. Not strong enough to distract, strong
// enough to communicate grouping at a glance.
type Phase = 'ingest' | 'retrieval' | 'gates' | 'knowledge' | 'feedback' | 'policy';

const PHASE: Record<Phase, { accent: string; label: string }> = {
  ingest: { accent: '#6366f1', label: 'Ingest' }, // indigo-500
  retrieval: { accent: '#0ea5e9', label: 'Retrieval' }, // sky-500
  gates: { accent: '#f59e0b', label: 'Gates' }, // amber-500
  knowledge: { accent: '#a855f7', label: 'Knowledge' }, // purple-500
  feedback: { accent: '#14b8a6', label: 'Feedback' }, // teal-500
  policy: { accent: '#ec4899', label: 'Policy' }, // pink-500
};

// ──────────────────────────────────────────────────────────────────────────
// MOCK_STATES (preserved — ?mock= early-return contract unchanged)
// ──────────────────────────────────────────────────────────────────────────

const MOCK_STATES: Record<string, BusinessState> = {
  'query-received': {
    idx: 1,
    label: 'Deep research query received — plan awaiting construction',
    status: 'RECEIVED',
    fields: {
      researchId: 'RES-2026-0419-001',
      question: 'Compare embedding providers for tenant-scoped flows',
      requester: 'planner-agent-01',
      receivedAt: '2026-04-19 11:00',
    },
  },
  'plan-queued': {
    idx: 2,
    label: 'Research plan queued — sub-queries enumerated',
    status: 'QUEUED',
    fields: {
      researchId: 'RES-2026-0419-001',
      subQueryCount: '5',
      depthBudget: '3',
      queuedAt: '2026-04-19 11:01',
    },
  },
  'search-running': {
    idx: 3,
    label: 'Search running — retrieval + expansion in progress',
    status: 'RUNNING',
    fields: {
      researchId: 'RES-2026-0419-001',
      activeSubQueries: '3 of 5',
      hitsGathered: '18',
      startedAt: '2026-04-19 11:02',
    },
  },
  'sources-gathered': {
    idx: 4,
    label: 'Sources gathered — 22 hits captured, deduplicated, ranked',
    status: 'CAPTURED',
    fields: {
      researchId: 'RES-2026-0419-001',
      totalHits: '22',
      uniqueDomains: '9',
      gatheredAt: '2026-04-19 11:07',
    },
  },
  'synthesis-done': {
    idx: 5,
    label: 'Synthesis complete — structured answer + citations published',
    status: 'COMPLETE',
    fields: {
      researchId: 'RES-2026-0419-001',
      citationCount: '12',
      confidenceScore: '0.88',
      synthesizedAt: '2026-04-19 11:14',
    },
  },
  'search-failed': {
    idx: 6,
    label: 'Search run failed — no sources returned within budget',
    status: 'FAILED',
    fields: {
      researchId: 'RES-2026-0419-002',
      reason: 'All sub-queries returned empty hits',
      budgetConsumed: '100%',
      failedAt: '2026-04-19 11:09',
    },
  },
  'clarification-escalated': {
    idx: 7,
    label: 'Ambiguous query escalated — requester clarification pending',
    status: 'ESCALATED',
    fields: {
      researchId: 'RES-2026-0419-003',
      ambiguityReason: 'Scope not specified (tenant | platform)',
      escalatedTo: 'requester',
      escalatedAt: '2026-04-19 11:11',
    },
  },
};

// ──────────────────────────────────────────────────────────────────────────
// Process inventory (from UI-REFLECTION-STATE.md; preserved from RUN-48)
// ──────────────────────────────────────────────────────────────────────────

interface ProcessNode {
  id: string;
  slug: string;
  label: string;
  description: string;
  phase: Phase;
  x: number;
  y: number;
  sampleInputs: string[];
  sampleOutputs: string[];
}

const PROCESS_NODES: ProcessNode[] = [
  // Ingest
  {
    id: 'adaptive-rag-router',
    slug: 'adaptive-rag-router',
    label: 'Route Research Query',
    description:
      'Receives the incoming deep-research question and routes it to the adaptive RAG pipeline.',
    phase: 'ingest',
    x: 0,
    y: 180,
    sampleInputs: ['Research query (free text)'],
    sampleOutputs: ['Routing plan', 'Query ID'],
  },
  {
    id: 'bandit-model-selector',
    slug: 'bandit-model-selector',
    label: 'Select AI Model',
    description:
      'Picks which model serves this query using a multi-armed bandit over past performance.',
    phase: 'ingest',
    x: 0,
    y: 310,
    sampleInputs: ['Query shape', 'Past model scores'],
    sampleOutputs: ['Chosen model', 'Exploration flag'],
  },
  // Retrieval
  {
    id: 'vector-retrieval-step',
    slug: 'vector-retrieval-step',
    label: 'Retrieve Vectors',
    description: 'Looks up the closest document vectors to the query embedding.',
    phase: 'retrieval',
    x: 300,
    y: 60,
    sampleInputs: ['Query embedding'],
    sampleOutputs: ['Top-K vector hits'],
  },
  {
    id: 'graph-rag-community-query',
    slug: 'graph-rag-community-query',
    label: 'Query Knowledge Community',
    description: 'Asks the knowledge-graph community layer for entities related to the query.',
    phase: 'retrieval',
    x: 300,
    y: 190,
    sampleInputs: ['Query entities'],
    sampleOutputs: ['Community matches'],
  },
  {
    id: 'multi-hop-graph-traversal',
    slug: 'multi-hop-graph-traversal',
    label: 'Traverse Knowledge Graph',
    description: 'Walks 2–3 hops through the knowledge graph to collect supporting context.',
    phase: 'retrieval',
    x: 300,
    y: 320,
    sampleInputs: ['Seed nodes', 'Hop budget'],
    sampleOutputs: ['Traversal path', 'Supporting nodes'],
  },
  {
    id: 'hybrid-retrieval-fusion',
    slug: 'hybrid-retrieval-fusion',
    label: 'Merge Retrieval Results',
    description: 'Fuses vector + graph + community hits into a single ranked set.',
    phase: 'retrieval',
    x: 580,
    y: 190,
    sampleInputs: ['Vector hits', 'Graph hits', 'Community hits'],
    sampleOutputs: ['Fused candidate set'],
  },
  {
    id: 'reranker-step',
    slug: 'reranker-step',
    label: 'Rerank Sources',
    description: 'Reranks the fused candidate set by relevance to the specific query.',
    phase: 'retrieval',
    x: 580,
    y: 320,
    sampleInputs: ['Fused candidates'],
    sampleOutputs: ['Reranked top-N'],
  },
  // Gates
  {
    id: 'budget-enforcement-gate',
    slug: 'budget-enforcement-gate',
    label: 'Check Budget Limit',
    description: 'Blocks further work if the query is about to exceed its token/time budget.',
    phase: 'gates',
    x: 860,
    y: 60,
    sampleInputs: ['Tokens used', 'Budget'],
    sampleOutputs: ['Continue / Halt'],
  },
  {
    id: 'context-efficiency-check',
    slug: 'context-efficiency-check',
    label: 'Check Context Fit',
    description: 'Verifies the selected sources fit inside the chosen model context window.',
    phase: 'gates',
    x: 860,
    y: 190,
    sampleInputs: ['Reranked sources', 'Model context size'],
    sampleOutputs: ['Trimmed sources'],
  },
  {
    id: 'self-reflection-guard',
    slug: 'self-reflection-guard',
    label: 'Self-Reflect On Answer',
    description: 'Asks the model to critique its own draft before publishing.',
    phase: 'gates',
    x: 860,
    y: 320,
    sampleInputs: ['Draft answer'],
    sampleOutputs: ['Critique', 'Revised draft'],
  },
  {
    id: 'eval-quality-gate',
    slug: 'eval-quality-gate',
    label: 'Score Answer Quality',
    description: 'Evaluates the final answer against reference criteria; blocks weak answers.',
    phase: 'gates',
    x: 860,
    y: 450,
    sampleInputs: ['Answer', 'Eval rubric'],
    sampleOutputs: ['Quality score'],
  },
  // Knowledge
  {
    id: 'knowledge-graph-edit-gate',
    slug: 'knowledge-graph-edit-gate',
    label: 'Gate Knowledge Edits',
    description: 'Decides whether a proposed knowledge-graph update should be applied.',
    phase: 'knowledge',
    x: 1140,
    y: 60,
    sampleInputs: ['Edit proposal'],
    sampleOutputs: ['Approved / Rejected'],
  },
  {
    id: 'control-plane-graph-edit',
    slug: 'control-plane-graph-edit',
    label: 'Apply Graph Edit',
    description: 'Writes an approved edit into the live knowledge graph.',
    phase: 'knowledge',
    x: 1140,
    y: 190,
    sampleInputs: ['Approved edit'],
    sampleOutputs: ['Edit commit'],
  },
  {
    id: 'control-plane-node-renderer',
    slug: 'control-plane-node-renderer',
    label: 'Render Graph Node',
    description: 'Produces a visual representation of a graph node for the operator console.',
    phase: 'knowledge',
    x: 1140,
    y: 320,
    sampleInputs: ['Node ID'],
    sampleOutputs: ['Rendered node data'],
  },
  {
    id: 'domain-graph-index-rebuild',
    slug: 'domain-graph-index-rebuild',
    label: 'Rebuild Domain Index',
    description: 'Regenerates the domain-specific retrieval indices after batch updates.',
    phase: 'knowledge',
    x: 1140,
    y: 450,
    sampleInputs: ['Changed domains'],
    sampleOutputs: ['Rebuilt index'],
  },
  {
    id: 'domain-profile-compiler',
    slug: 'domain-profile-compiler',
    label: 'Compile Domain Profile',
    description: 'Builds a per-domain profile (terms, entities, patterns) used for routing.',
    phase: 'knowledge',
    x: 1140,
    y: 580,
    sampleInputs: ['Domain corpus'],
    sampleOutputs: ['Domain profile'],
  },
  {
    id: 'community-summary-generator',
    slug: 'community-summary-generator',
    label: 'Summarise Community',
    description: 'Writes a short summary for each graph community for quick retrieval.',
    phase: 'knowledge',
    x: 1140,
    y: 710,
    sampleInputs: ['Community nodes'],
    sampleOutputs: ['Summary text'],
  },
  // Feedback
  {
    id: 'trace-span-capture',
    slug: 'trace-span-capture',
    label: 'Capture Trace',
    description: 'Captures a trace span per pipeline stage for observability.',
    phase: 'feedback',
    x: 300,
    y: 580,
    sampleInputs: ['Stage event'],
    sampleOutputs: ['Trace span'],
  },
  {
    id: 'user-feedback-ingest',
    slug: 'user-feedback-ingest',
    label: 'Receive User Feedback',
    description: 'Ingests the thumbs-up / thumbs-down and comments from the user on the answer.',
    phase: 'feedback',
    x: 580,
    y: 580,
    sampleInputs: ['Vote', 'Comment'],
    sampleOutputs: ['Feedback record'],
  },
  {
    id: 'feedback-aggregation-window',
    slug: 'feedback-aggregation-window',
    label: 'Aggregate Feedback',
    description: 'Groups feedback over a rolling window for trend analysis.',
    phase: 'feedback',
    x: 860,
    y: 580,
    sampleInputs: ['Feedback records'],
    sampleOutputs: ['Aggregated metrics'],
  },
  {
    id: 'improvement-suggestion-engine',
    slug: 'improvement-suggestion-engine',
    label: 'Suggest Improvements',
    description: 'Proposes prompt / strategy tweaks based on aggregated feedback.',
    phase: 'feedback',
    x: 580,
    y: 710,
    sampleInputs: ['Aggregated metrics'],
    sampleOutputs: ['Improvement proposals'],
  },
  // Policy
  {
    id: 'prompt-version-promoter',
    slug: 'prompt-version-promoter',
    label: 'Promote Prompt Version',
    description: 'Promotes a new prompt version if it beats the baseline on aggregated scores.',
    phase: 'policy',
    x: 300,
    y: 820,
    sampleInputs: ['Candidate prompt', 'Baseline scores'],
    sampleOutputs: ['Promoted version'],
  },
  {
    id: 'rag-asset-version-compare',
    slug: 'rag-asset-version-compare',
    label: 'Compare Asset Versions',
    description: 'Diffs RAG assets (prompts, indices, routers) between versions.',
    phase: 'policy',
    x: 580,
    y: 820,
    sampleInputs: ['Version A', 'Version B'],
    sampleOutputs: ['Diff report'],
  },
  {
    id: 'rag-strategy-rollback',
    slug: 'rag-strategy-rollback',
    label: 'Rollback Strategy',
    description: 'Reverts to the last-known-good RAG strategy if quality drops.',
    phase: 'policy',
    x: 860,
    y: 820,
    sampleInputs: ['Rollback target'],
    sampleOutputs: ['Restored strategy'],
  },
  {
    id: 'routing-policy-updater',
    slug: 'routing-policy-updater',
    label: 'Update Routing Policy',
    description: 'Updates the routing policy used by the router to send queries to models.',
    phase: 'policy',
    x: 1140,
    y: 820,
    sampleInputs: ['Promoted versions'],
    sampleOutputs: ['New policy'],
  },
  {
    id: 'promotion-pipeline-gate',
    slug: 'promotion-pipeline-gate',
    label: 'Gate Promotion',
    description: 'Last gate before a promotion becomes effective in production.',
    phase: 'policy',
    x: 1400,
    y: 820,
    sampleInputs: ['Promotion request'],
    sampleOutputs: ['Effective / Blocked'],
  },
  {
    id: 'ab-test-allocator',
    slug: 'ab-test-allocator',
    label: 'Allocate A/B Test',
    description: 'Decides how to split new vs. existing strategy during rollout.',
    phase: 'policy',
    x: 1400,
    y: 710,
    sampleInputs: ['Strategy pair'],
    sampleOutputs: ['Traffic split'],
  },
];

interface PipelineEdge {
  from: string;
  to: string;
  label: string;
}
const PIPELINE_EDGES: PipelineEdge[] = [
  { from: 'adaptive-rag-router', to: 'bandit-model-selector', label: 'chosen model' },
  { from: 'bandit-model-selector', to: 'vector-retrieval-step', label: 'query embedding' },
  { from: 'bandit-model-selector', to: 'graph-rag-community-query', label: 'query entities' },
  { from: 'bandit-model-selector', to: 'multi-hop-graph-traversal', label: 'seed nodes' },
  { from: 'vector-retrieval-step', to: 'hybrid-retrieval-fusion', label: 'vector hits' },
  { from: 'graph-rag-community-query', to: 'hybrid-retrieval-fusion', label: 'community hits' },
  { from: 'multi-hop-graph-traversal', to: 'reranker-step', label: 'graph hits' },
  { from: 'hybrid-retrieval-fusion', to: 'reranker-step', label: 'fused candidates' },
  { from: 'reranker-step', to: 'budget-enforcement-gate', label: 'reranked top-N' },
  { from: 'budget-enforcement-gate', to: 'context-efficiency-check', label: 'continue' },
  { from: 'context-efficiency-check', to: 'self-reflection-guard', label: 'trimmed sources' },
  { from: 'self-reflection-guard', to: 'eval-quality-gate', label: 'revised answer' },
  { from: 'eval-quality-gate', to: 'user-feedback-ingest', label: 'final answer' },
  { from: 'user-feedback-ingest', to: 'feedback-aggregation-window', label: 'feedback record' },
  {
    from: 'feedback-aggregation-window',
    to: 'improvement-suggestion-engine',
    label: 'aggregated metrics',
  },
  { from: 'improvement-suggestion-engine', to: 'prompt-version-promoter', label: 'proposal' },
  { from: 'prompt-version-promoter', to: 'rag-asset-version-compare', label: 'new prompt' },
  { from: 'rag-asset-version-compare', to: 'rag-strategy-rollback', label: 'quality delta' },
  { from: 'rag-asset-version-compare', to: 'routing-policy-updater', label: 'promoted asset' },
  { from: 'routing-policy-updater', to: 'promotion-pipeline-gate', label: 'policy update' },
  { from: 'promotion-pipeline-gate', to: 'ab-test-allocator', label: 'effective' },
  { from: 'reranker-step', to: 'trace-span-capture', label: 'span' },
  { from: 'knowledge-graph-edit-gate', to: 'control-plane-graph-edit', label: 'approved edit' },
  { from: 'control-plane-graph-edit', to: 'control-plane-node-renderer', label: 'commit' },
  { from: 'control-plane-graph-edit', to: 'domain-graph-index-rebuild', label: 'changed domain' },
  { from: 'domain-graph-index-rebuild', to: 'domain-profile-compiler', label: 'new index' },
  { from: 'domain-profile-compiler', to: 'community-summary-generator', label: 'profile' },
];

const STALLED_RUN_STATE: Record<string, NodeRuntimeState> = {
  'adaptive-rag-router': 'complete',
  'bandit-model-selector': 'complete',
  'vector-retrieval-step': 'complete',
  'graph-rag-community-query': 'complete',
  'multi-hop-graph-traversal': 'running',
  'hybrid-retrieval-fusion': 'running',
  'reranker-step': 'pending',
  'budget-enforcement-gate': 'pending',
  'context-efficiency-check': 'idle',
  'self-reflection-guard': 'idle',
  'eval-quality-gate': 'idle',
  'trace-span-capture': 'running',
  'user-feedback-ingest': 'idle',
  'feedback-aggregation-window': 'idle',
  'improvement-suggestion-engine': 'idle',
  'knowledge-graph-edit-gate': 'idle',
  'control-plane-graph-edit': 'idle',
  'control-plane-node-renderer': 'idle',
  'domain-graph-index-rebuild': 'idle',
  'domain-profile-compiler': 'idle',
  'community-summary-generator': 'idle',
  'prompt-version-promoter': 'idle',
  'rag-asset-version-compare': 'idle',
  'rag-strategy-rollback': 'idle',
  'routing-policy-updater': 'idle',
  'promotion-pipeline-gate': 'idle',
  'ab-test-allocator': 'idle',
};

// ──────────────────────────────────────────────────────────────────────────
// Custom node — Precision & Density + color-not-only + phase tint
// ──────────────────────────────────────────────────────────────────────────

interface ProcessNodeData {
  label: string;
  slug: string;
  state: NodeRuntimeState;
  phase: Phase;
  selected: boolean;
  isAnchor: boolean;
  /** Live budget consumption on this running node (0..1). Only rendered
   *  on the anchor running node — the fuel-gauge-on-the-vehicle pattern
   *  from interface-design's signature-element critique. */
  budgetConsumed?: number;
}

function TopologyProcessNode({ data }: NodeProps<ProcessNodeData>) {
  const s = STATE[data.state];
  const p = PHASE[data.phase];
  const StateIcon = s.Icon;
  const [hover, setHover] = useState(false);
  // Anchor = currently-running node gets a ring glow for "one dominant element"
  // per design-for-ai composition principle. Other nodes are peers.
  const ring = data.isAnchor
    ? `0 0 0 2px ${s.border}, 0 0 24px 0 rgba(59,130,246,0.25)`
    : hover
      ? `0 0 0 1px ${TOKEN.accent}`
      : 'none';
  const showBudget = data.isAnchor && typeof data.budgetConsumed === 'number';
  const budgetPct = Math.round((data.budgetConsumed ?? 0) * 100);
  const budgetCritical = budgetPct >= 80;
  return (
    <div
      data-testid={`node-${data.slug}`}
      data-node-state={data.state}
      data-node-phase={data.phase}
      data-node-anchor={data.isAnchor ? 'true' : undefined}
      data-node-hover={hover ? 'true' : undefined}
      role="button"
      aria-label={`${data.label} — ${s.label}, ${p.label} phase${
        showBudget ? `, ${budgetPct}% budget consumed` : ''
      }`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: 220,
        background: data.state === 'idle' ? TOKEN.surface : s.tint,
        // Borders-only depth — 0.5px on idle, 1px accent on active
        border: `${data.state === 'idle' ? 0.5 : 1}px solid ${s.border}`,
        borderRadius: 6,
        padding: '10px 12px',
        fontFamily: TOKEN.fontUi,
        boxShadow: ring,
        cursor: 'pointer',
        transition: 'box-shadow 120ms',
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: s.dot, width: 6, height: 6 }}
      />
      {/* Phase + state strip — breaks "identical card grid" ai-tell */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 6,
        }}
      >
        <span
          aria-hidden="true"
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: p.accent,
            letterSpacing: 0.4,
            textTransform: 'uppercase',
          }}
        >
          {p.label}
        </span>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 11,
            fontWeight: 600,
            color: s.dot,
            letterSpacing: 0.3,
          }}
        >
          <StateIcon size={11} strokeWidth={2.5} aria-hidden="true" />
          {s.label}
        </span>
      </div>
      <div
        style={{
          color: TOKEN.ink,
          fontSize: 13,
          fontWeight: 500,
          lineHeight: 1.3,
        }}
      >
        {data.label}
      </div>

      {/* Budget consumption strip — XIIGen's signature element
          (interface-design, domain-derived). A fuel gauge embedded in the
          vehicle burning the fuel, not in a separate panel. Only the
          anchor (running) node shows it so the eye has one place to check. */}
      {showBudget && (
        <div
          data-testid={`node-${data.slug}-budget`}
          style={{ marginTop: 8 }}
          aria-label={`Budget consumed: ${budgetPct} percent`}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: 10,
              color: TOKEN.fgSecondary,
              marginBottom: 3,
              fontWeight: 500,
              letterSpacing: 0.3,
            }}
          >
            <span style={{ textTransform: 'uppercase' }}>Budget</span>
            <span
              style={{
                fontFamily: TOKEN.fontMono,
                color: budgetCritical ? TOKEN.budgetCritical : TOKEN.budgetConsumed,
                fontWeight: 600,
              }}
            >
              {budgetPct}%
            </span>
          </div>
          <div
            style={{
              height: 4,
              background: TOKEN.budgetRemaining,
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${budgetPct}%`,
                height: '100%',
                background: budgetCritical ? TOKEN.budgetCritical : TOKEN.budgetConsumed,
                transition: 'width 300ms',
              }}
            />
          </div>
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        style={{ background: s.dot, width: 6, height: 6 }}
      />
    </div>
  );
}

// Phase-group background node (impeccable cognitive-chunking fix).
// Renders as a dashed translucent rectangle BEHIND the process nodes,
// giving the 27-node canvas visible phase boundaries (Ingest / Retrieval /
// Gates / Knowledge / Feedback / Policy) so the eye can scan by group
// instead of scanning 27 individual cards.
interface PhaseGroupData {
  phase: Phase;
  width: number;
  height: number;
}

function PhaseGroupNode({ data }: NodeProps<PhaseGroupData>) {
  const p = PHASE[data.phase];
  return (
    <div
      id={`phase-group-${data.phase}`}
      data-testid={`phase-group-${data.phase}`}
      aria-hidden="true"
      style={{
        width: data.width,
        height: data.height,
        border: `1px dashed ${p.accent}40`,
        borderRadius: 10,
        background: `${p.accent}06`,
        pointerEvents: 'none',
        position: 'relative',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: -10,
          left: 16,
          padding: '0 8px',
          background: TOKEN.canvasBg,
          color: p.accent,
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
          fontFamily: TOKEN.fontUi,
        }}
      >
        {p.label}
      </span>
    </div>
  );
}

const nodeTypes = { topologyProcess: TopologyProcessNode, phaseGroup: PhaseGroupNode };

// Compute bounding-box + small padding for each phase's nodes. Used to
// render the dashed group container behind each phase cluster.
const NODE_W = 220;
const NODE_H_ESTIMATE = 72; // approx card height without budget strip
const NODE_H_WITH_BUDGET = 108; // approx when budget strip renders
const PHASE_PAD = 24;

function computePhaseBoxes(): Array<{
  id: string;
  phase: Phase;
  x: number;
  y: number;
  width: number;
  height: number;
}> {
  const byPhase = new Map<Phase, ProcessNode[]>();
  for (const n of PROCESS_NODES) {
    const arr = byPhase.get(n.phase) ?? [];
    arr.push(n);
    byPhase.set(n.phase, arr);
  }
  const boxes: Array<{
    id: string;
    phase: Phase;
    x: number;
    y: number;
    width: number;
    height: number;
  }> = [];
  byPhase.forEach((ns, phase) => {
    const xs = ns.map((n) => n.x);
    const ys = ns.map((n) => n.y);
    const minX = Math.min(...xs) - PHASE_PAD;
    const minY = Math.min(...ys) - PHASE_PAD;
    const maxX = Math.max(...xs) + NODE_W + PHASE_PAD;
    const maxY = Math.max(...ys) + NODE_H_WITH_BUDGET + PHASE_PAD;
    boxes.push({
      id: `phase-${phase}`,
      phase,
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    });
  });
  return boxes;
}

const PHASE_BOXES = computePhaseBoxes();

// ──────────────────────────────────────────────────────────────────────────
// Custom aria-labelled zoom controls (Pro Max P1 aria-labels)
// ──────────────────────────────────────────────────────────────────────────

function AccessibleControls() {
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  // Impeccable fix (Nielsen H7 Flexibility & Efficiency) — keyboard
  // shortcuts for zoom. +/=/- to zoom; 0 to fit. Works when the canvas is
  // focused. Guards against firing while the user is typing in any input.
  useEffect(() => {
    const isTypingTarget = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return false;
      const tag = t.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || t.isContentEditable;
    };
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e)) return;
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        zoomIn({ duration: 200 });
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        zoomOut({ duration: 200 });
      } else if (e.key === '0') {
        e.preventDefault();
        fitView({ duration: 200, padding: 0.12 });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zoomIn, zoomOut, fitView]);

  const btn: React.CSSProperties = {
    width: 32,
    height: 32,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: TOKEN.surface,
    border: `0.5px solid ${TOKEN.border}`,
    borderRadius: 4,
    color: TOKEN.fg,
    cursor: 'pointer',
  };
  return (
    <div
      data-testid="topology-controls"
      style={{
        position: 'absolute',
        bottom: 12,
        left: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        zIndex: 10,
      }}
    >
      <button
        type="button"
        aria-label="Zoom in (keyboard: +)"
        title="Zoom in  (+)"
        onClick={() => zoomIn({ duration: 200 })}
        style={btn}
      >
        <ZoomIn size={16} strokeWidth={2} aria-hidden="true" />
      </button>
      <button
        type="button"
        aria-label="Zoom out (keyboard: -)"
        title="Zoom out  (−)"
        onClick={() => zoomOut({ duration: 200 })}
        style={btn}
      >
        <ZoomOut size={16} strokeWidth={2} aria-hidden="true" />
      </button>
      <button
        type="button"
        aria-label="Fit all nodes in view (keyboard: 0)"
        title="Fit to view  (0)"
        onClick={() => fitView({ duration: 200, padding: 0.12 })}
        style={btn}
      >
        <Maximize2 size={16} strokeWidth={2} aria-hidden="true" />
      </button>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Side panel (font system fixed per design-for-ai)
// ──────────────────────────────────────────────────────────────────────────

function NodeDetailPanel({
  node,
  runState,
  readOnly,
}: {
  node: ProcessNode | null;
  runState: NodeRuntimeState;
  readOnly: boolean;
}) {
  if (!node) {
    return (
      <aside
        data-testid="topology-detail-panel-empty"
        style={{
          padding: 16,
          fontFamily: TOKEN.fontUi,
          color: TOKEN.fgSecondary,
          background: TOKEN.surface,
          border: `0.5px solid ${TOKEN.border}`,
          borderRadius: 6,
          fontSize: 13,
          minHeight: 220,
        }}
      >
        <p style={{ color: TOKEN.fg, fontWeight: 500, marginBottom: 8, fontSize: 14 }}>
          Node details
        </p>
        <p style={{ lineHeight: 1.5 }}>
          Click any node on the canvas to see what it does and its current live state.
        </p>
      </aside>
    );
  }
  const s = STATE[runState];
  const p = PHASE[node.phase];
  const StateIcon = s.Icon;
  return (
    <aside
      data-testid="topology-detail-panel"
      data-node-selected={node.slug}
      style={{
        padding: 16,
        fontFamily: TOKEN.fontUi,
        background: TOKEN.surface,
        border: `0.5px solid ${TOKEN.border}`,
        borderRadius: 6,
        fontSize: 13,
      }}
    >
      {/* Co-located state legend (impeccable: working-memory load fix —
          don't make the user remember colour→state from the top of the page
          while reading details on the right). */}
      <div
        data-testid="topology-detail-legend-inline"
        style={{
          display: 'flex',
          gap: 10,
          flexWrap: 'wrap',
          marginBottom: 14,
          paddingBottom: 10,
          borderBottom: `0.5px solid ${TOKEN.border}`,
          fontSize: 10,
          color: TOKEN.fgMuted,
        }}
      >
        {(['idle', 'running', 'pending', 'complete', 'failed'] as const).map((st) => {
          const si = STATE[st];
          const Ic = si.Icon;
          const active = st === runState;
          return (
            <span
              key={st}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                color: active ? si.dot : TOKEN.fgMuted,
                fontWeight: active ? 600 : 400,
              }}
            >
              <Ic size={10} strokeWidth={2.5} aria-hidden="true" />
              {si.label}
            </span>
          );
        })}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <span
          style={{
            fontSize: 10,
            fontWeight: 500,
            color: p.accent,
            letterSpacing: 0.4,
            textTransform: 'uppercase',
          }}
        >
          {p.label}
        </span>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 11,
            fontWeight: 500,
            color: s.dot,
          }}
        >
          <StateIcon size={12} strokeWidth={2.5} aria-hidden="true" />
          {s.label}
        </span>
      </div>
      <h2 style={{ color: TOKEN.fg, fontSize: 16, margin: '0 0 8px 0', fontWeight: 600 }}>
        {node.label}
      </h2>
      <p
        data-testid="topology-detail-description"
        style={{ color: TOKEN.fg, lineHeight: 1.5, marginBottom: 16 }}
      >
        {node.description}
      </p>
      <p
        style={{
          fontFamily: TOKEN.fontMono,
          fontSize: 11,
          color: TOKEN.fgMuted,
          marginBottom: 12,
        }}
      >
        {node.slug}
      </p>

      <Section title="Inputs">
        {node.sampleInputs.map((inp, i) => (
          <li key={i} data-testid={`topology-detail-input-${i}`} style={{ marginBottom: 4 }}>
            {inp}
          </li>
        ))}
      </Section>
      <Section title="Outputs">
        {node.sampleOutputs.map((out, i) => (
          <li key={i} data-testid={`topology-detail-output-${i}`} style={{ marginBottom: 4 }}>
            {out}
          </li>
        ))}
      </Section>

      {readOnly && (
        <div
          data-testid="topology-detail-readonly-banner"
          style={{
            marginTop: 14,
            padding: 10,
            background: 'rgba(100, 116, 139, 0.1)',
            border: `0.5px solid ${TOKEN.borderFaint}`,
            borderRadius: 4,
            color: TOKEN.fgSecondary,
            fontSize: 11,
            lineHeight: 1.5,
          }}
        >
          Read-only for support access. Escalate to a platform-admin for Kill or Rebudget.
        </div>
      )}
    </aside>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <p
        style={{
          color: TOKEN.fgMuted,
          fontSize: 10,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
          marginBottom: 6,
          fontWeight: 500,
        }}
      >
        {title}
      </p>
      <ul
        style={{
          margin: 0,
          paddingLeft: 16,
          color: TOKEN.fg,
          fontSize: 13,
          lineHeight: 1.5,
        }}
      >
        {children}
      </ul>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Top bar — user intent + run tiles. One visual anchor (user intent heading).
// ──────────────────────────────────────────────────────────────────────────

function TopBar({
  runActive,
  inFlight,
  stateMap,
  expandedPhases,
  togglePhase,
  showAllPhases,
  collapseAll,
}: {
  runActive: boolean;
  inFlight: { running: number; pending: number; complete: number; failed: number };
  stateMap: Record<string, NodeRuntimeState>;
  expandedPhases: Set<Phase>;
  togglePhase: (p: Phase) => void;
  showAllPhases: () => void;
  collapseAll: () => void;
}) {
  return (
    <header
      data-testid="topology-top-bar"
      style={{
        background: TOKEN.surface,
        border: `0.5px solid ${TOKEN.border}`,
        borderRadius: 6,
        padding: '14px 18px',
        marginBottom: 12,
        fontFamily: TOKEN.fontUi,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <Workflow size={16} strokeWidth={2} aria-hidden="true" style={{ color: TOKEN.accent }} />
        <h1
          style={{
            margin: 0,
            color: TOKEN.fg,
            fontSize: 16,
            fontWeight: 600,
            letterSpacing: 0.2,
          }}
        >
          Adaptive RAG / Deep Research
        </h1>
        {/* RUN-173 FIX P4-2: Rule 16 — FLOW-NN numeric badges are engineering
            identifiers, never rendered UI text. The "Platform only" role pill
            already conveys the audience; the page title conveys identity. */}
        <span
          data-flow-id="FLOW-29"
          style={{
            fontSize: 10,
            color: TOKEN.fgSecondary,
            letterSpacing: 0.5,
            textTransform: 'uppercase',
            fontWeight: 500,
          }}
          title="Platform-only surface \u2014 visible to XIIGen platform-admin and platform-support roles"
        >
          {/* RUN-124: 'Engine Internal' \u2192 'Platform only' per plain-language audit */}
          Platform only
        </span>
      </div>
      <p
        data-testid="topology-user-intent"
        style={{
          fontSize: 13,
          color: TOKEN.fgSecondary,
          lineHeight: 1.55,
          marginBottom: runActive ? 12 : 0,
          maxWidth: 720,
        }}
      >
        When a deep research query arrives, route it through the adaptive RAG pipeline, execute
        multi-hop graph traversal, and return synthesised findings with source attribution.
      </p>
      {runActive && (
        <div
          data-testid="topology-run-tiles"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 }}
        >
          {(
            [
              { label: 'Running', count: inFlight.running, state: 'running' as const },
              { label: 'Complete', count: inFlight.complete, state: 'complete' as const },
              { label: 'Pending', count: inFlight.pending, state: 'pending' as const },
              { label: 'Failed', count: inFlight.failed, state: 'failed' as const },
            ] as const
          ).map((tile) => {
            const s = STATE[tile.state];
            const Ic = s.Icon;
            return (
              <div
                key={tile.label}
                data-testid={`topology-tile-${tile.label.toLowerCase()}`}
                style={{
                  padding: '8px 12px',
                  border: `0.5px solid ${s.border}40`,
                  borderRadius: 4,
                  background: s.tint,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <Ic size={14} strokeWidth={2} aria-hidden="true" style={{ color: s.dot }} />
                <div>
                  <p
                    style={{
                      fontSize: 10,
                      color: TOKEN.fgSecondary,
                      letterSpacing: 0.4,
                      margin: 0,
                      textTransform: 'uppercase',
                      fontWeight: 500,
                    }}
                  >
                    {tile.label}
                  </p>
                  <p
                    style={{
                      fontFamily: TOKEN.fontMono,
                      fontSize: 16,
                      color: s.dot,
                      margin: 0,
                      fontWeight: 600,
                    }}
                  >
                    {tile.count}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* RUN-124 + 2026-04-21 progressive disclosure: per-phase summary strip.
          Luba directive (2026-04-21): "Topology shouldn't be displayed all at
          once — should show high level and mark nodes connected to sub-flows,
          with option to dig into deeper topology."

          Phase chips render ALWAYS (V-R7 directive intent — Level-1 default with
          visible chips + chevrons). Only the canvas below collapses to the
          empty-state placeholder when no phases are expanded. */}
      <nav
        aria-label="Phase summary"
        data-testid="topology-phase-strip"
        style={{
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
          paddingTop: 4,
          alignItems: 'center',
        }}
      >
        {(Object.keys(PHASE) as Phase[]).map((phaseKey) => {
          const p = PHASE[phaseKey];
          const phaseNodes = PROCESS_NODES.filter((n) => n.phase === phaseKey);
          const counts = phaseNodes.reduce(
            (acc, n) => {
              const st = stateMap[n.id] ?? 'idle';
              acc[st] = (acc[st] ?? 0) + 1;
              return acc;
            },
            {} as Record<string, number>,
          );
          const activeStates = ['running', 'complete', 'pending', 'failed'] as const;
          const isExpanded = expandedPhases.has(phaseKey);
          return (
            <button
              key={phaseKey}
              type="button"
              onClick={() => togglePhase(phaseKey)}
              data-testid={`topology-phase-chip-${phaseKey}`}
              data-phase-expanded={isExpanded ? 'true' : 'false'}
              aria-expanded={isExpanded}
              aria-controls={`phase-group-${phaseKey}`}
              style={{
                flex: '0 0 auto',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 10px',
                border: `0.5px solid ${isExpanded ? p.accent : `${p.accent}40`}`,
                borderRadius: 999,
                background: isExpanded ? `${p.accent}28` : `${p.accent}08`,
                color: TOKEN.fg,
                textDecoration: 'none',
                fontSize: 11,
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: TOKEN.fontUi,
                transition: 'background 120ms, border-color 120ms',
              }}
              title={`Phase: ${p.label} \u2014 ${phaseNodes.length} node${phaseNodes.length === 1 ? '' : 's'}. ${isExpanded ? 'Click to collapse.' : 'Click to expand on canvas.'}`}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 10,
                  display: 'inline-block',
                  color: p.accent,
                  fontWeight: 700,
                  fontSize: 12,
                  lineHeight: 1,
                }}
              >
                {isExpanded ? '\u25BE' : '\u25B8'}
              </span>
              <span
                aria-hidden="true"
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background: p.accent,
                  display: 'inline-block',
                }}
              />
              <span style={{ color: p.accent, fontWeight: 600 }}>{p.label}</span>
              <span style={{ color: TOKEN.fgSecondary, fontFamily: TOKEN.fontMono, fontSize: 10 }}>
                {phaseNodes.length}
              </span>
              {activeStates.map((st) => {
                const c = counts[st];
                if (!c) return null;
                const s = STATE[st];
                return (
                  <span
                    key={st}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 3,
                      color: s.dot,
                      fontFamily: TOKEN.fontMono,
                      fontSize: 10,
                      fontWeight: 600,
                    }}
                    title={`${s.label}: ${c}`}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: 999,
                        background: s.dot,
                        display: 'inline-block',
                      }}
                    />
                    {c}
                  </span>
                );
              })}
            </button>
          );
        })}
        <span
          aria-hidden="true"
          style={{
            flex: '0 0 auto',
            width: 1,
            alignSelf: 'stretch',
            background: TOKEN.borderFaint,
            margin: '0 4px',
          }}
        />
        <button
          type="button"
          onClick={showAllPhases}
          data-testid="topology-phase-show-all"
          disabled={expandedPhases.size === Object.keys(PHASE).length}
          style={{
            flex: '0 0 auto',
            padding: '6px 10px',
            border: `0.5px solid ${TOKEN.borderFaint}`,
            borderRadius: 999,
            background: 'transparent',
            color: TOKEN.fgSecondary,
            fontSize: 11,
            fontWeight: 500,
            cursor: expandedPhases.size === Object.keys(PHASE).length ? 'default' : 'pointer',
            fontFamily: TOKEN.fontUi,
            opacity: expandedPhases.size === Object.keys(PHASE).length ? 0.5 : 1,
          }}
          title="Expand all phases on canvas"
        >
          Show all phases
        </button>
        <button
          type="button"
          onClick={collapseAll}
          data-testid="topology-phase-collapse-all"
          disabled={expandedPhases.size === 0}
          style={{
            flex: '0 0 auto',
            padding: '6px 10px',
            border: `0.5px solid ${TOKEN.borderFaint}`,
            borderRadius: 999,
            background: 'transparent',
            color: TOKEN.fgSecondary,
            fontSize: 11,
            fontWeight: 500,
            cursor: expandedPhases.size === 0 ? 'default' : 'pointer',
            fontFamily: TOKEN.fontUi,
            opacity: expandedPhases.size === 0 ? 0.5 : 1,
          }}
          title="Collapse all phases (return to summary)"
        >
          Collapse
        </button>
      </nav>
    </header>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Legend — icon + swatch + text (Pro Max color-not-only)
// ──────────────────────────────────────────────────────────────────────────

function Legend() {
  return (
    <div
      data-testid="topology-legend"
      style={{
        background: TOKEN.surface,
        border: `0.5px solid ${TOKEN.border}`,
        borderRadius: 4,
        padding: '8px 14px',
        display: 'flex',
        gap: 20,
        fontFamily: TOKEN.fontUi,
        fontSize: 11,
        color: TOKEN.fgSecondary,
        flexWrap: 'wrap',
        alignItems: 'center',
      }}
    >
      <span
        style={{
          fontSize: 10,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
          color: TOKEN.fgMuted,
        }}
      >
        Node state
      </span>
      {(['idle', 'running', 'pending', 'complete', 'failed'] as const).map((st) => {
        const s = STATE[st];
        const Ic = s.Icon;
        return (
          <span key={st} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Ic size={12} strokeWidth={2.5} aria-hidden="true" style={{ color: s.dot }} />
            {s.label}
          </span>
        );
      })}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Accessibility fallback — collapsible path-summary table (Pro Max chart#25)
// Required by DAG-B accessibility grade. Reviewer who can't parse the canvas
// (screen reader, cognitive-load constraints, colour-blind user) gets full
// information here instead.
// ──────────────────────────────────────────────────────────────────────────

function PathSummaryTable({ stateMap }: { stateMap: Record<string, NodeRuntimeState> }) {
  return (
    <details
      data-testid="topology-path-summary"
      style={{
        marginTop: 12,
        background: TOKEN.surface,
        border: `0.5px solid ${TOKEN.border}`,
        borderRadius: 6,
        fontFamily: TOKEN.fontUi,
      }}
    >
      <summary
        style={{
          padding: '10px 14px',
          cursor: 'pointer',
          color: TOKEN.fg,
          fontSize: 13,
          fontWeight: 500,
          outline: 'none',
        }}
      >
        Path summary (text view) — {PROCESS_NODES.length} nodes across {Object.keys(PHASE).length}{' '}
        phases
      </summary>
      <div style={{ overflowX: 'auto' }}>
        <table
          style={{
            width: '100%',
            fontSize: 13,
            borderCollapse: 'collapse',
            color: TOKEN.fg,
          }}
        >
          <thead>
            <tr style={{ borderBottom: `0.5px solid ${TOKEN.border}` }}>
              <th style={thStyle}>Phase</th>
              <th style={thStyle}>Node</th>
              <th style={thStyle}>State</th>
              <th style={thStyle}>What it does</th>
            </tr>
          </thead>
          <tbody>
            {PROCESS_NODES.map((n) => {
              const st = stateMap[n.id] ?? 'idle';
              const s = STATE[st];
              const p = PHASE[n.phase];
              const Ic = s.Icon;
              return (
                <tr
                  key={n.id}
                  data-testid={`topology-path-row-${n.slug}`}
                  style={{ borderBottom: `0.5px solid ${TOKEN.border}` }}
                >
                  <td style={{ ...tdStyle, color: p.accent, fontWeight: 500 }}>{p.label}</td>
                  <td style={tdStyle}>{n.label}</td>
                  <td style={tdStyle}>
                    <span
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: s.dot }}
                    >
                      <Ic size={12} strokeWidth={2.5} aria-hidden="true" />
                      {s.label}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, color: TOKEN.fgSecondary }}>{n.description}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </details>
  );
}

const thStyle: React.CSSProperties = {
  padding: '8px 12px',
  textAlign: 'left',
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  color: TOKEN.fgMuted,
  fontWeight: 500,
};
const tdStyle: React.CSSProperties = { padding: '10px 12px' };

// ──────────────────────────────────────────────────────────────────────────
// Main topology branch
// ──────────────────────────────────────────────────────────────────────────

function TopologyCanvasBranch({ readOnly }: { readOnly: boolean }) {
  const [searchParams] = useSearchParams();
  const runParam = searchParams.get('run');
  const selectParam = searchParams.get('select');
  const runActive = runParam === 'stalled';
  const stateMap: Record<string, NodeRuntimeState> = runActive ? STALLED_RUN_STATE : {};

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(selectParam);

  // Progressive disclosure (Luba directive 2026-04-21): start collapsed, the
  // Level-1 phase strip is the default surface. User clicks a phase chip to
  // reveal that phase's nodes on the canvas. Show all / Collapse are the two
  // shortcuts.
  //
  // Deep-link compatibility: if `?select=` names a node, auto-expand that
  // node's phase so the canvas renders with the node visible. If `?run=` is
  // set, expand every phase with a non-idle node so reviewers land on the
  // live canvas. Preserves e2e expectations in flow-29-topology.spec.ts and
  // run-65-regen.spec.ts.
  const [expandedPhases, setExpandedPhases] = useState<Set<Phase>>(() => {
    const seed = new Set<Phase>();
    if (selectParam) {
      const selected = PROCESS_NODES.find((n) => n.id === selectParam);
      if (selected) seed.add(selected.phase);
    }
    if (runActive) {
      for (const n of PROCESS_NODES) {
        const st = STALLED_RUN_STATE[n.id];
        if (st && st !== 'idle') seed.add(n.phase);
      }
    }
    return seed;
  });
  const togglePhase = (p: Phase) =>
    setExpandedPhases((s) => {
      const next = new Set(s);
      if (next.has(p)) {
        next.delete(p);
      } else {
        next.add(p);
      }
      return next;
    });
  const showAllPhases = () => setExpandedPhases(new Set(Object.keys(PHASE) as Phase[]));
  const collapseAll = () => setExpandedPhases(new Set());

  const selectedNode = useMemo(
    () => PROCESS_NODES.find((n) => n.id === selectedNodeId) ?? null,
    [selectedNodeId],
  );
  const selectedNodeState: NodeRuntimeState = selectedNode
    ? (stateMap[selectedNode.id] ?? 'idle')
    : 'idle';

  // Anchor = the first running node (the one a reviewer is most likely
  // investigating). One dominant element per design-for-ai composition.
  const anchorNodeId = useMemo(
    () => PROCESS_NODES.find((n) => stateMap[n.id] === 'running')?.id ?? null,
    [stateMap],
  );

  const rfNodes: RfNode[] = useMemo(() => {
    // Phase-group background rectangles first (rendered behind process nodes).
    // Only render groups for expanded phases.
    const groupNodes: RfNode<PhaseGroupData>[] = PHASE_BOXES.filter((b) =>
      expandedPhases.has(b.phase),
    ).map((b) => ({
      id: b.id,
      type: 'phaseGroup',
      position: { x: b.x, y: b.y },
      data: { phase: b.phase, width: b.width, height: b.height },
      draggable: false,
      selectable: false,
      zIndex: 0,
    }));
    // Process nodes on top, interactive. Only render nodes whose phase is expanded.
    const processNodes: RfNode<ProcessNodeData>[] = PROCESS_NODES.filter((n) =>
      expandedPhases.has(n.phase),
    ).map((n) => ({
      id: n.id,
      type: 'topologyProcess',
      position: { x: n.x, y: n.y },
      zIndex: 1,
      data: {
        label: n.label,
        slug: n.slug,
        state: (stateMap[n.id] ?? 'idle') as NodeRuntimeState,
        phase: n.phase,
        selected: selectedNodeId === n.id,
        isAnchor: anchorNodeId === n.id,
        // Anchor node in the stalled-run demo burns 78% of its budget —
        // derived from MOCK_STATES 'search-running' which documents "budget
        // consumed 78%" as the canonical stalled-run sample state.
        budgetConsumed: anchorNodeId === n.id && runActive ? 0.78 : undefined,
      },
    }));
    return [...groupNodes, ...processNodes];
  }, [selectedNodeId, stateMap, anchorNodeId, runActive, expandedPhases]);

  const rfEdges: RfEdge[] = useMemo(
    () =>
      PIPELINE_EDGES.filter((e) => {
        // Only render edges where BOTH endpoints are in currently-expanded phases.
        const fromPhase = PROCESS_NODES.find((n) => n.id === e.from)?.phase;
        const toPhase = PROCESS_NODES.find((n) => n.id === e.to)?.phase;
        return (
          !!fromPhase && !!toPhase && expandedPhases.has(fromPhase) && expandedPhases.has(toPhase)
        );
      }).map((e, i) => {
        const fromState = (stateMap[e.from] ?? 'idle') as NodeRuntimeState;
        const active = fromState === 'complete' || fromState === 'running';
        return {
          id: `edge-${i}`,
          source: e.from,
          target: e.to,
          label: e.label,
          animated: fromState === 'running',
          style: {
            stroke: active ? STATE[fromState].border : TOKEN.borderFaint,
            strokeWidth: active ? 1.5 : 1,
          },
          // Critique fix: edge labels were invisible on lower rows due to
          // fgMuted (too close to canvas bg). Brighter = findable per
          // interface-design principle "borders disappear when not looked for,
          // but findable when you need the structure."
          labelStyle: {
            fontSize: 11,
            fill: TOKEN.inkSecondary,
            fontFamily: TOKEN.fontUi,
            fontWeight: 500,
          },
          labelBgStyle: { fill: TOKEN.canvasBg, fillOpacity: 0.95 },
          labelBgPadding: [4, 2] as [number, number],
          labelBgBorderRadius: 3,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: active ? STATE[fromState].border : TOKEN.borderFaint,
          },
        };
      }),
    [stateMap, expandedPhases],
  );

  const inFlight = useMemo(() => {
    const counts = { running: 0, pending: 0, complete: 0, failed: 0 };
    Object.values(stateMap).forEach((st) => {
      if (st === 'running') counts.running += 1;
      else if (st === 'pending') counts.pending += 1;
      else if (st === 'complete') counts.complete += 1;
      else if (st === 'failed') counts.failed += 1;
    });
    return counts;
  }, [stateMap]);

  return (
    <div style={{ background: TOKEN.canvasBg, minHeight: '100vh', padding: 16 }}>
      <TopBar
        runActive={runActive}
        inFlight={inFlight}
        stateMap={stateMap}
        expandedPhases={expandedPhases}
        togglePhase={togglePhase}
        showAllPhases={showAllPhases}
        collapseAll={collapseAll}
      />

      {readOnly && (
        <div
          data-testid="topology-readonly-banner"
          role="note"
          style={{
            padding: '10px 14px',
            marginBottom: 12,
            background: 'rgba(100, 116, 139, 0.1)',
            border: `0.5px solid ${TOKEN.borderFaint}`,
            borderRadius: 4,
            fontFamily: TOKEN.fontUi,
            color: TOKEN.fgSecondary,
            fontSize: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Lock size={14} aria-hidden="true" style={{ color: TOKEN.accent }} />
          <span>
            Read-only for support access. Canvas is inspectable; Kill and Rebudget are
            platform-admin only.
          </span>
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 340px',
          gap: 12,
          alignItems: 'start',
        }}
      >
        <div>
          <Legend />
          {expandedPhases.size > 0 ? (
            <div
              data-testid="topology-canvas"
              data-canvas-visible="true"
              style={{
                marginTop: 12,
                height: 680,
                border: `0.5px solid ${TOKEN.border}`,
                borderRadius: 6,
                background: TOKEN.canvasBg,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <ReactFlowProvider>
                <ReactFlow
                  nodes={rfNodes}
                  edges={rfEdges}
                  nodeTypes={nodeTypes}
                  fitView
                  fitViewOptions={{ padding: 0.12 }}
                  minZoom={0.3}
                  maxZoom={1.5}
                  nodesDraggable={!readOnly}
                  nodesConnectable={false}
                  elementsSelectable
                  onNodeClick={(_, n) => setSelectedNodeId(n.id)}
                  proOptions={{ hideAttribution: true }}
                  style={{ background: TOKEN.canvasBg }}
                >
                  <Background color={TOKEN.borderFaint} gap={24} size={1} />
                  <AccessibleControls />
                </ReactFlow>
              </ReactFlowProvider>
            </div>
          ) : (
            <div
              data-testid="topology-canvas-placeholder"
              data-canvas-visible="false"
              role="note"
              style={{
                marginTop: 12,
                padding: '48px 24px',
                border: `0.5px dashed ${TOKEN.borderFaint}`,
                borderRadius: 6,
                background: TOKEN.surface,
                color: TOKEN.fgSecondary,
                fontFamily: TOKEN.fontUi,
                fontSize: 13,
                textAlign: 'center',
                lineHeight: 1.55,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: 0.6,
                  color: TOKEN.fgMuted,
                  marginBottom: 6,
                }}
              >
                Level 1 view
              </div>
              <div style={{ color: TOKEN.ink, fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
                Click a phase above to expand its topology.
              </div>
              <div>
                Each chip shows the phase&rsquo;s node count and running / complete / pending /
                failed breakdown. Expand one phase, several, or{' '}
                <button
                  type="button"
                  onClick={showAllPhases}
                  data-testid="topology-placeholder-show-all"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    color: TOKEN.accent,
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    fontFamily: 'inherit',
                  }}
                >
                  show all phases
                </button>
                .
              </div>
            </div>
          )}

          <PathSummaryTable stateMap={stateMap} />
        </div>

        <NodeDetailPanel node={selectedNode} runState={selectedNodeState} readOnly={readOnly} />
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Page shell — preserves ?mock= early-return + role branches
// ──────────────────────────────────────────────────────────────────────────

export function AdaptiveRagDeepResearchPage() {
  const [searchParams] = useSearchParams();
  const mockState = searchParams.get('mock');
  const { role } = useViewerRole();

  if (mockState && MOCK_STATES[mockState]) {
    return (
      <BusinessStateCard
        slug="adaptive-rag-deep-research"
        flowId="FLOW-29"
        title="Adaptive RAG / Deep Research"
        state={MOCK_STATES[mockState]}
        description="Admin view of multi-step research queries: plan construction, retrieval, gathering, synthesis, and escalation."
      />
    );
  }

  return (
    <div data-testid="page-adaptive-rag-deep-research" data-viewer-role={role}>
      <RoleScopedView role={role} testIdPrefix="rag-role">
        <RoleScopedView.Case when="platform-admin">
          <TopologyCanvasBranch readOnly={false} />
        </RoleScopedView.Case>
        <RoleScopedView.Case when="platform-support">
          <TopologyCanvasBranch readOnly />
        </RoleScopedView.Case>
        <RoleScopedView.Fallback>
          <div
            data-testid="rag-not-available"
            role="note"
            style={{
              padding: 24,
              background: TOKEN.surface,
              color: TOKEN.fg,
              border: `0.5px solid ${TOKEN.border}`,
              borderRadius: 6,
              maxWidth: 640,
              margin: '48px auto',
              fontFamily: TOKEN.fontUi,
              fontSize: 14,
            }}
          >
            <h1
              style={{
                color: TOKEN.fg,
                fontSize: 16,
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontWeight: 600,
              }}
            >
              <AlertTriangle size={18} aria-hidden="true" style={{ color: TOKEN.accent }} />
              Adaptive RAG / Deep Research
            </h1>
            <p style={{ marginTop: 12, color: TOKEN.fgSecondary, lineHeight: 1.55 }}>
              This is an engine-internal operations surface for the platform team. Not available for
              your current role.
            </p>
          </div>
        </RoleScopedView.Fallback>
      </RoleScopedView>
    </div>
  );
}

// FT-N-AUTO — n8n Auto-Builder — Layer 3: STACK_COUPLED
// No n8n SDK import at module level — injected writer pattern throughout.

import type {
  N8nNodeSpec, SharedWorkflowStep, SharedWorkflowStyle,
  WorkflowReadResult, WorkflowConfigOutput, WorkflowWriteResult,
} from './types';

const ENTRY_TYPES = new Set(['trigger', 'webhook', 'schedule']);

function inferStepRole(node: N8nNodeSpec): SharedWorkflowStep['type'] {
  if (ENTRY_TYPES.has(node.type)) return 'TRIGGER';
  if (node.type === 'filter') return 'CONDITION';
  if (node.type === 'merge') return 'TRANSFORM';
  if (!node.nextNodeIds || node.nextNodeIds.length === 0) return 'OUTPUT';
  return 'ACTION';
}

export function mapN8nToWorkflowStep(node: N8nNodeSpec): SharedWorkflowStep {
  return {
    type: inferStepRole(node),
    name: node.name,
    nextSteps: node.nextNodeIds,
  };
}

export function mapN8nToWorkflowStyle(node: N8nNodeSpec): SharedWorkflowStyle {
  const role = inferStepRole(node);
  return {
    stepRole: role,
    isEntryPoint: role === 'TRIGGER',
    requiresConfig: node.type === 'http_request' || node.type === 'code' || node.type === 'webhook',
  };
}

export function mapWorkflowStyleToN8n(style: SharedWorkflowStyle): Partial<N8nNodeSpec> {
  const TYPE_MAP: Record<SharedWorkflowStyle['stepRole'], N8nNodeSpec['type']> = {
    TRIGGER: 'trigger', ACTION: 'http_request', CONDITION: 'filter',
    TRANSFORM: 'merge', OUTPUT: 'set',
  };
  return { type: TYPE_MAP[style.stepRole] };
}

export function readWorkflowSpec(nodes: N8nNodeSpec[]): WorkflowReadResult {
  return {
    steps: nodes.map(mapN8nToWorkflowStep),
    styles: nodes.map(mapN8nToWorkflowStyle),
    sourceNodes: nodes,
  };
}

export async function writeWorkflowConfig(
  outputs: WorkflowConfigOutput[],
  writer: (payload: Record<string, unknown>) => Promise<void>,
): Promise<WorkflowWriteResult> {
  let written = 0;
  let failed = 0;
  for (const output of outputs) {
    try {
      const base = mapWorkflowStyleToN8n(output.style) as Record<string, unknown>;
      await writer({
        ...base,
        type: 'WORKFLOW_NODE',
        name: output.step.name,
        stepRole: output.style.stepRole,
        nodeType: output.generatedConfig.nodeType,
        parameters: output.generatedConfig.parameters,
      });
      written++;
    } catch {
      failed++;
    }
  }
  return { written, failed };
}

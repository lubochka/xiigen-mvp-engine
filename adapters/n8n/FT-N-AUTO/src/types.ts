// FT-N-AUTO — n8n Auto-Builder (AUTO family: text→workflow)
// Platform: n8n workflow automation. N prefix = n8n per master plan.

export interface N8nNodeSpec {
  id: string;
  type: 'trigger' | 'http_request' | 'code' | 'filter' | 'merge' | 'set' | 'webhook' | 'schedule';
  name: string;
  parameters?: Record<string, unknown>;
  nextNodeIds?: string[];
}

export interface SharedWorkflowStep {
  type: 'TRIGGER' | 'ACTION' | 'CONDITION' | 'TRANSFORM' | 'OUTPUT';
  name: string;
  description?: string;
  nextSteps?: string[];
}

export interface SharedWorkflowStyle {
  stepRole: 'TRIGGER' | 'ACTION' | 'CONDITION' | 'TRANSFORM' | 'OUTPUT';
  isEntryPoint: boolean;
  requiresConfig: boolean;
}

export interface WorkflowConfigOutput {
  step: SharedWorkflowStep;
  style: SharedWorkflowStyle;
  generatedConfig: { nodeType: string; parameters: Record<string, unknown> };
}

export interface WorkflowReadResult {
  steps: SharedWorkflowStep[];
  styles: SharedWorkflowStyle[];
  sourceNodes: N8nNodeSpec[];
}

export interface WorkflowWriteResult {
  written: number;
  failed: number;
}

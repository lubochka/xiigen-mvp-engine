// FT-CH-AUTO — Chrome Auto-Builder — Layer 3: STACK_COUPLED

import type {
  ChromeAutomationAction, SharedWorkflowStep, SharedWorkflowStyle,
  AutomationReadResult, AutomationOutput, AutomationWriteResult,
} from './types';

function inferStepRole(action: ChromeAutomationAction): SharedWorkflowStep['type'] {
  if (action.type === 'navigate') return 'TRIGGER';
  if (action.type === 'extract') return 'TRANSFORM';
  if (action.type === 'screenshot') return 'OUTPUT';
  return 'ACTION';
}

export function mapChromeToWorkflowStep(action: ChromeAutomationAction): SharedWorkflowStep {
  return {
    type: inferStepRole(action),
    name: action.description,
    description: action.selector ?? action.url,
  };
}

export function mapChromeToWorkflowStyle(action: ChromeAutomationAction): SharedWorkflowStyle {
  const role = inferStepRole(action);
  return {
    stepRole: role,
    isEntryPoint: role === 'TRIGGER',
    requiresConfig: action.type === 'fill' || action.type === 'navigate',
  };
}

export function mapWorkflowStyleToChrome(style: SharedWorkflowStyle): Partial<ChromeAutomationAction> {
  const TYPE_MAP: Record<SharedWorkflowStyle['stepRole'], ChromeAutomationAction['type']> = {
    TRIGGER: 'navigate', ACTION: 'click', CONDITION: 'wait',
    TRANSFORM: 'extract', OUTPUT: 'screenshot',
  };
  return { type: TYPE_MAP[style.stepRole] };
}

export function readAutomationActions(actions: ChromeAutomationAction[]): AutomationReadResult {
  const sorted = [...actions].sort((a, b) => a.order - b.order);
  return {
    steps: sorted.map(mapChromeToWorkflowStep),
    styles: sorted.map(mapChromeToWorkflowStyle),
    sourceActions: sorted,
  };
}

export async function writeAutomationScript(
  outputs: AutomationOutput[],
  writer: (payload: Record<string, unknown>) => Promise<void>,
): Promise<AutomationWriteResult> {
  let written = 0;
  let failed = 0;
  for (const output of outputs) {
    try {
      const base = mapWorkflowStyleToChrome(output.style) as Record<string, unknown>;
      await writer({
        ...base,
        type: 'AUTOMATION_STEP',
        name: output.step.name,
        stepRole: output.style.stepRole,
        script: output.generatedScript,
      });
      written++;
    } catch {
      failed++;
    }
  }
  return { written, failed };
}

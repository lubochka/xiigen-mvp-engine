// FT-CH-AUTO — Chrome Auto-Builder (AUTO family: page analysis→browser automation)

export interface ChromeAutomationAction {
  id: string;
  type: 'click' | 'fill' | 'navigate' | 'scroll' | 'extract' | 'wait' | 'screenshot';
  selector?: string;
  value?: string;
  url?: string;
  description: string;
  order: number;
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

export interface AutomationOutput {
  step: SharedWorkflowStep;
  style: SharedWorkflowStyle;
  generatedScript: string;
}

export interface AutomationReadResult {
  steps: SharedWorkflowStep[];
  styles: SharedWorkflowStyle[];
  sourceActions: ChromeAutomationAction[];
}

export interface AutomationWriteResult {
  written: number;
  failed: number;
}

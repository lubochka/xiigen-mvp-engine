// server/src/guardrails/named-checks/named-check.types.ts
// Shared types for BFA named check functions.

export interface CheckContext {
  taskTypeId: string;
  flowId: string;
  generatedCode?: string;
  contractFields?: Record<string, unknown>;
  importsList?: string[];
  queryFilters?: string[];
  eventHandlers?: Array<{ event: string; handler: string; synchronous: boolean }>;
}

export interface CheckResult {
  passed: boolean;
  cfRule: string;
  message: string;
  severity: 'BLOCKER' | 'CRITICAL' | 'HIGH' | 'MEDIUM';
}

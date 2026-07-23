// FT-MON1 — monday.com AI Task Enhancer — Layer 3: STACK_COUPLED

import type {
  MondayBoardItem, SharedTaskElement, SharedTaskStyle,
  TaskReadResult, TaskEnhancedOutput, TaskWriteResult,
} from './types';

const STATUS_MAP: Record<string, SharedTaskElement['status']> = {
  'Done': 'DONE',
  'Working on it': 'IN_PROGRESS',
  'Stuck': 'BLOCKED',
};

const PRIORITY_MAP: Record<NonNullable<MondayBoardItem['priority']>, SharedTaskStyle['priority']> = {
  critical: 'CRITICAL', high: 'HIGH', medium: 'MEDIUM', low: 'LOW',
};

export function mapMondayToTaskElement(item: MondayBoardItem): SharedTaskElement {
  return {
    type: 'TASK',
    name: item.name,
    status: STATUS_MAP[item.status.text] ?? 'TODO',
    assignee: item.assignee?.name,
    groupName: item.groupName,
  };
}

export function mapMondayToTaskStyle(item: MondayBoardItem): SharedTaskStyle {
  return {
    priority: item.priority ? PRIORITY_MAP[item.priority] : 'LOW',
    taskType: 'TASK',
    isOverdue: item.dueDate ? new Date(item.dueDate) < new Date() : false,
  };
}

export function mapTaskStyleToMonday(style: SharedTaskStyle): Partial<MondayBoardItem> {
  const PRIORITY_BACK: Record<SharedTaskStyle['priority'], MondayBoardItem['priority']> = {
    CRITICAL: 'critical', HIGH: 'high', MEDIUM: 'medium', LOW: 'low',
  };
  return { priority: PRIORITY_BACK[style.priority] };
}

export function readBoardItems(items: MondayBoardItem[]): TaskReadResult {
  return {
    elements: items.map(mapMondayToTaskElement),
    styles: items.map(mapMondayToTaskStyle),
    sourceItems: items,
  };
}

export async function writeEnhancedTasks(
  outputs: TaskEnhancedOutput[],
  writer: (payload: Record<string, unknown>) => Promise<void>,
): Promise<TaskWriteResult> {
  let written = 0;
  let failed = 0;
  for (const output of outputs) {
    try {
      const base = mapTaskStyleToMonday(output.style) as Record<string, unknown>;
      await writer({
        ...base,
        type: 'TASK_UPDATE',
        name: output.element.name,
        status: output.element.status,
        assignee: output.element.assignee,
        description: output.generatedDescription,
      });
      written++;
    } catch {
      failed++;
    }
  }
  return { written, failed };
}

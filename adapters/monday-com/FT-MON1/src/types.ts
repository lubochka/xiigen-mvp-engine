// FT-MON1 — monday.com AI Task Enhancer (UTILITY family)
// Platform: monday.com Work OS. MON prefix per master plan.

export interface MondayBoardItem {
  id: string;
  name: string;
  groupId: string;
  groupName: string;
  status: { text: string; color: string };
  priority?: 'critical' | 'high' | 'medium' | 'low';
  assignee?: { name: string };
  dueDate?: string;
}

export interface SharedTaskElement {
  type: 'TASK' | 'EPIC' | 'BUG' | 'STORY';
  name: string;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE' | 'BLOCKED';
  assignee?: string;
  groupName: string;
}

export interface SharedTaskStyle {
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  taskType: 'TASK' | 'EPIC' | 'BUG' | 'STORY';
  isOverdue: boolean;
}

export interface TaskEnhancedOutput {
  element: SharedTaskElement;
  style: SharedTaskStyle;
  generatedDescription: string;
}

export interface TaskReadResult {
  elements: SharedTaskElement[];
  styles: SharedTaskStyle[];
  sourceItems: MondayBoardItem[];
}

export interface TaskWriteResult {
  written: number;
  failed: number;
}

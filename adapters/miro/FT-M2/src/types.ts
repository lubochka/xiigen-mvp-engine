/**
 * FT-M2 — Miro Sprint Planner Adapter Types
 *
 * Layer 3 (STACK_COUPLED) domain types for the Miro Apps platform.
 * Shared sprint planning engine types are platform-neutral.
 *
 * FLOW-34 FC-24: CLIENT_BUILD = webpack (Miro Apps SDK constraint).
 */

export interface MiroSprintItem {
  id: string;
  type: 'card' | 'sticky_note' | 'frame';
  title?: string;
  content?: string;
  status?: 'todo' | 'in_progress' | 'done';
  storyPoints?: number;
  style: {
    fillColor: string;
    borderColor: string;
    textColor: string;
  };
  position: { x: number; y: number };
  geometry: { width: number; height: number };
}

export interface SharedSprintElement {
  type: 'TASK' | 'NOTE' | 'EPIC';
  title: string;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  content?: string;
  storyPoints?: number;
}

export interface SharedSprintStyle {
  fillColor: string;
  borderColor: string;
  textColor: string;
  taskType: 'TASK' | 'NOTE' | 'EPIC';
}

export interface SprintAdapterReadResult {
  elements: SharedSprintElement[];
  styles: SharedSprintStyle[];
  sourceItems: MiroSprintItem[];
}

export interface SprintAdapterWriteResult {
  written: number;
  failed: number;
}

export interface SprintEnhancedOutput {
  element: SharedSprintElement;
  style: SharedSprintStyle;
}

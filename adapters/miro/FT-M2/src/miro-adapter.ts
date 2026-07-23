/**
 * FT-M2 — Miro Sprint Planner Adapter
 *
 * Layer 3 STACK_COUPLED adapter for Miro Apps SDK (Sprint domain).
 * Maps Miro board items → shared sprint planning engine model.
 * 90% shared sprint engine is UNCHANGED from platform to platform.
 *
 * FLOW-34 FC-26: API mapping — Miro sprint items → shared sprint model.
 *
 * Property mapping (Miro → Shared):
 *   item.type 'card'       → SharedSprintElement.type 'TASK'
 *   item.type 'sticky_note'→ SharedSprintElement.type 'NOTE'
 *   item.type 'frame'      → SharedSprintElement.type 'EPIC'
 *   item.title ?? content  → SharedSprintElement.title
 *   item.status 'todo'     → SharedSprintElement.status 'TODO'
 *   item.status 'in_progress' → 'IN_PROGRESS'
 *   item.status 'done'     → 'DONE'
 *   item.storyPoints       → SharedSprintElement.storyPoints
 *   item.style.*           → SharedSprintStyle.*
 */

import type {
  MiroSprintItem,
  SharedSprintElement,
  SharedSprintStyle,
  SprintAdapterReadResult,
  SprintAdapterWriteResult,
  SprintEnhancedOutput,
} from './types';

const MIRO_TYPE_MAP: Record<MiroSprintItem['type'], SharedSprintElement['type']> = {
  card: 'TASK',
  sticky_note: 'NOTE',
  frame: 'EPIC',
};

const SHARED_TYPE_TO_MIRO: Record<SharedSprintElement['type'], MiroSprintItem['type']> = {
  TASK: 'card',
  NOTE: 'sticky_note',
  EPIC: 'frame',
};

const STATUS_MAP: Record<NonNullable<MiroSprintItem['status']>, SharedSprintElement['status']> = {
  todo: 'TODO',
  in_progress: 'IN_PROGRESS',
  done: 'DONE',
};

const STATUS_TO_MIRO: Record<SharedSprintElement['status'], NonNullable<MiroSprintItem['status']>> = {
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  DONE: 'done',
};

export function mapMiroSprintToElement(item: MiroSprintItem): SharedSprintElement {
  const result: SharedSprintElement = {
    type: MIRO_TYPE_MAP[item.type],
    title: item.title ?? item.content ?? '',
    status: STATUS_MAP[item.status ?? 'todo'],
  };
  if (item.content !== undefined) result.content = item.content;
  if (item.storyPoints !== undefined) result.storyPoints = item.storyPoints;
  return result;
}

export function mapMiroSprintToStyle(item: MiroSprintItem): SharedSprintStyle {
  return {
    fillColor: item.style.fillColor,
    borderColor: item.style.borderColor,
    textColor: item.style.textColor,
    taskType: MIRO_TYPE_MAP[item.type],
  };
}

export function mapSprintStyleToMiro(style: SharedSprintStyle): Partial<MiroSprintItem> {
  return {
    type: SHARED_TYPE_TO_MIRO[style.taskType],
    status: STATUS_TO_MIRO['TODO'],
    style: {
      fillColor: style.fillColor,
      borderColor: style.borderColor,
      textColor: style.textColor,
    },
  };
}

export function readSprintBoard(items: MiroSprintItem[]): SprintAdapterReadResult {
  return {
    elements: items.map(mapMiroSprintToElement),
    styles: items.map(mapMiroSprintToStyle),
    sourceItems: items,
  };
}

export async function writeSprintToBoard(
  enhanced: SprintEnhancedOutput[],
  writer: (payload: Record<string, unknown>) => Promise<void>,
): Promise<SprintAdapterWriteResult> {
  let written = 0;
  let failed = 0;
  for (const item of enhanced) {
    try {
      const miroPartial = mapSprintStyleToMiro(item.style);
      await writer({
        type: miroPartial.type,
        title: item.element.title,
        status: STATUS_TO_MIRO[item.element.status],
        storyPoints: item.element.storyPoints,
        style: miroPartial.style,
      });
      written++;
    } catch {
      failed++;
    }
  }
  return { written, failed };
}

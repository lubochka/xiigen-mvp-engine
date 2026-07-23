import type { MiroBoardItem, MiroShapeClassification } from './types';

function area(item: MiroBoardItem): number {
  return item.geometry.width * item.geometry.height;
}

function contentText(item: MiroBoardItem): string {
  return `${item.title ?? ''} ${item.content ?? ''}`.trim();
}

export function classifyMiroShape(item: MiroBoardItem): MiroShapeClassification {
  const text = contentText(item);
  const width = item.geometry.width;
  const height = item.geometry.height;
  const fontSize = item.style.fontSize ?? 14;

  if (item.type === 'frame') {
    return { ruleId: 'R1', label: 'frame', sharedType: 'BOUNDARY', confidence: 0.95 };
  }

  if (item.type === 'sticky_note') {
    return { ruleId: 'R2', label: 'sticky-note', sharedType: 'COMPONENT', confidence: 0.95 };
  }

  if (item.type === 'connector') {
    return { ruleId: 'R3', label: 'connector', sharedType: 'RELATION', confidence: 0.95 };
  }

  if (item.type === 'text' && fontSize >= 24) {
    return { ruleId: 'R4', label: 'heading', sharedType: 'LABEL', confidence: 0.9 };
  }

  if (item.type === 'text') {
    return { ruleId: 'R5', label: 'label', sharedType: 'LABEL', confidence: 0.85 };
  }

  if (item.type === 'card') {
    return { ruleId: 'R6', label: 'card', sharedType: 'COMPONENT', confidence: 0.8 };
  }

  if (item.type === 'shape' && area(item) >= 40000 && text.length === 0) {
    return { ruleId: 'R7', label: 'container', sharedType: 'BOUNDARY', confidence: 0.7 };
  }

  if (item.type === 'shape' && (item.shape === 'circle' || item.shape === 'ellipse')) {
    return { ruleId: 'R8', label: 'avatar', sharedType: 'COMPONENT', confidence: 0.7 };
  }

  if (item.type === 'shape' && width <= 120 && height <= 48 && text.length > 0) {
    return { ruleId: 'R9', label: 'badge', sharedType: 'LABEL', confidence: 0.65 };
  }

  return { ruleId: 'R10', label: 'unknown', sharedType: 'STRUCTURE', confidence: 0.5 };
}

export function classifyMiroShapes(items: MiroBoardItem[]): MiroShapeClassification[] {
  return items.map(classifyMiroShape);
}

import type { MiroBoardItem, MiroLayoutMode, MiroSpatialAnalysis, MiroSpatialNode } from './types';

function left(item: MiroBoardItem): number {
  return item.position.x;
}

function top(item: MiroBoardItem): number {
  return item.position.y;
}

function right(item: MiroBoardItem): number {
  return item.position.x + item.geometry.width;
}

function bottom(item: MiroBoardItem): number {
  return item.position.y + item.geometry.height;
}

function area(item: MiroBoardItem): number {
  return item.geometry.width * item.geometry.height;
}

export function containsItem(parent: MiroBoardItem, child: MiroBoardItem, tolerance = 5): boolean {
  if (parent.id === child.id) {
    return false;
  }

  return (
    left(child) >= left(parent) - tolerance &&
    top(child) >= top(parent) - tolerance &&
    right(child) <= right(parent) + tolerance &&
    bottom(child) <= bottom(parent) + tolerance
  );
}

export function inferLayoutMode(items: MiroBoardItem[]): MiroLayoutMode {
  if (items.length < 2) {
    return 'absolute';
  }

  const xs = items.map((item) => item.position.x);
  const ys = items.map((item) => item.position.y);
  const xRange = Math.max(...xs) - Math.min(...xs);
  const yRange = Math.max(...ys) - Math.min(...ys);

  if (yRange < 20 || xRange / Math.max(yRange, 1) > 2) {
    return 'row';
  }

  if (xRange < 20 || yRange / Math.max(xRange, 1) > 2) {
    return 'column';
  }

  return 'absolute';
}

function estimateGap(items: MiroBoardItem[], mode: MiroLayoutMode): number {
  if (items.length < 2 || mode === 'absolute') {
    return 0;
  }

  const sorted = [...items].sort((a, b) =>
    mode === 'row' ? a.position.x - b.position.x : a.position.y - b.position.y,
  );

  const gaps: number[] = [];
  for (let index = 1; index < sorted.length; index++) {
    const previous = sorted[index - 1];
    const current = sorted[index];
    gaps.push(mode === 'row' ? left(current) - right(previous) : top(current) - bottom(previous));
  }

  return Math.max(0, Math.round(gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length));
}

function estimatePadding(parent: MiroBoardItem, children: MiroBoardItem[]) {
  if (children.length === 0) {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }

  return {
    top: Math.max(0, Math.round(Math.min(...children.map(top)) - top(parent))),
    right: Math.max(0, Math.round(right(parent) - Math.max(...children.map(right)))),
    bottom: Math.max(0, Math.round(bottom(parent) - Math.max(...children.map(bottom)))),
    left: Math.max(0, Math.round(Math.min(...children.map(left)) - left(parent))),
  };
}

export function analyzeSpatialLayout(items: MiroBoardItem[], tolerance = 5): MiroSpatialAnalysis {
  const nodes = new Map<string, MiroSpatialNode>();
  items.forEach((item) => {
    nodes.set(item.id, {
      item,
      children: [],
      layoutMode: 'absolute',
      gap: 0,
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
    });
  });

  const parentByChild = new Map<string, string>();
  const candidates = [...items].sort((a, b) => area(a) - area(b));

  for (const child of items) {
    const parent = candidates.find((candidate) => area(candidate) > area(child) && containsItem(candidate, child, tolerance));
    if (parent) {
      parentByChild.set(child.id, parent.id);
      nodes.get(parent.id)!.children.push(nodes.get(child.id)!);
    }
  }

  const roots = items
    .filter((item) => !parentByChild.has(item.id))
    .sort((a, b) => area(b) - area(a))
    .map((item) => nodes.get(item.id)!);

  nodes.forEach((node) => {
    const childItems = node.children.map((child) => child.item);
    node.layoutMode = inferLayoutMode(childItems);
    node.gap = estimateGap(childItems, node.layoutMode);
    node.padding = estimatePadding(node.item, childItems);
  });

  return { roots, nodeCount: items.length, tolerance };
}

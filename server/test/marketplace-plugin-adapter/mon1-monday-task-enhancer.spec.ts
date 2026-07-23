/**
 * FLOW-34 — MON1 monday.com AI Task Enhancer Adapter Tests
 * 26 tests: MON1-R-1..10, MON1-W-1..8, MON1-E-1..4, MON1-P-1..4
 */

import {
  mapMondayToTaskElement,
  mapMondayToTaskStyle,
  mapTaskStyleToMonday,
  readBoardItems,
  writeEnhancedTasks,
} from '../../../adapters/monday-com/FT-MON1/src/monday-adapter';
import type {
  MondayBoardItem,
  SharedTaskElement,
  SharedTaskStyle,
} from '../../../adapters/monday-com/FT-MON1/src/types';

function makeMondayItem(overrides: Partial<MondayBoardItem> = {}): MondayBoardItem {
  return {
    id: 'item-001',
    name: 'Build RAG pipeline',
    groupId: 'grp-001',
    groupName: 'Sprint 1',
    status: { text: 'Working on it', color: '#fdab3d' },
    priority: 'high',
    assignee: { name: 'Alex' },
    ...overrides,
  };
}

const CANONICAL_ELEMENT: SharedTaskElement = {
  type: 'TASK',
  name: 'Build RAG pipeline',
  status: 'IN_PROGRESS',
  assignee: 'Alex',
  groupName: 'Sprint 1',
};
const CANONICAL_STYLE: SharedTaskStyle = { priority: 'HIGH', taskType: 'TASK', isOverdue: false };
const GENERATED_DESC = 'AI-powered pipeline for RAG-based retrieval and ranking';

// ── READ: mapMondayToTaskElement (MON1-R-1..5) ────────────────────────────────

describe('FLOW-34 MON1 — READ path: mapMondayToTaskElement', () => {
  it('MON1-R-1: type always TASK', () => {
    expect(mapMondayToTaskElement(makeMondayItem()).type).toBe('TASK');
  });
  it('MON1-R-2: Done→DONE, Stuck→BLOCKED, unknown→TODO', () => {
    expect(
      mapMondayToTaskElement(makeMondayItem({ status: { text: 'Done', color: '#00c875' } })).status,
    ).toBe('DONE');
    expect(
      mapMondayToTaskElement(makeMondayItem({ status: { text: 'Stuck', color: '#e2445c' } }))
        .status,
    ).toBe('BLOCKED');
    expect(
      mapMondayToTaskElement(makeMondayItem({ status: { text: 'Not Started', color: '#c4c4c4' } }))
        .status,
    ).toBe('TODO');
  });
  it('MON1-R-3: name preserved', () => {
    expect(mapMondayToTaskElement(makeMondayItem({ name: 'Build RAG pipeline' })).name).toBe(
      'Build RAG pipeline',
    );
  });
  it('MON1-R-4: assignee.name preserved', () => {
    expect(mapMondayToTaskElement(makeMondayItem({ assignee: { name: 'Alex' } })).assignee).toBe(
      'Alex',
    );
  });
  it('MON1-R-5: groupName preserved', () => {
    expect(mapMondayToTaskElement(makeMondayItem({ groupName: 'Sprint 1' })).groupName).toBe(
      'Sprint 1',
    );
  });
});

// ── READ: mapMondayToTaskStyle (MON1-R-6..10) ─────────────────────────────────

describe('FLOW-34 MON1 — READ path: mapMondayToTaskStyle', () => {
  it('MON1-R-6: priority high → HIGH', () => {
    expect(mapMondayToTaskStyle(makeMondayItem({ priority: 'high' })).priority).toBe('HIGH');
  });
  it('MON1-R-7: critical→CRITICAL, medium→MEDIUM, low→LOW', () => {
    expect(mapMondayToTaskStyle(makeMondayItem({ priority: 'critical' })).priority).toBe(
      'CRITICAL',
    );
    expect(mapMondayToTaskStyle(makeMondayItem({ priority: 'medium' })).priority).toBe('MEDIUM');
    expect(mapMondayToTaskStyle(makeMondayItem({ priority: 'low' })).priority).toBe('LOW');
  });
  it('MON1-R-8: undefined priority → LOW', () => {
    expect(mapMondayToTaskStyle(makeMondayItem({ priority: undefined })).priority).toBe('LOW');
  });
  it('MON1-R-9: taskType always TASK', () => {
    expect(mapMondayToTaskStyle(makeMondayItem()).taskType).toBe('TASK');
  });
  it('MON1-R-10: isOverdue false when no dueDate', () => {
    expect(mapMondayToTaskStyle(makeMondayItem({ dueDate: undefined })).isOverdue).toBe(false);
  });
});

// ── WRITE: mapTaskStyleToMonday (MON1-W-1..4) ─────────────────────────────────

describe('FLOW-34 MON1 — WRITE path: mapTaskStyleToMonday', () => {
  it('MON1-W-1: HIGH → high priority in write payload', () => {
    expect(
      mapTaskStyleToMonday({ priority: 'HIGH', taskType: 'TASK', isOverdue: false }).priority,
    ).toBe('high');
  });
  it('MON1-W-2: CRITICAL→critical, MEDIUM→medium, LOW→low', () => {
    expect(
      mapTaskStyleToMonday({ priority: 'CRITICAL', taskType: 'TASK', isOverdue: false }).priority,
    ).toBe('critical');
    expect(
      mapTaskStyleToMonday({ priority: 'MEDIUM', taskType: 'TASK', isOverdue: false }).priority,
    ).toBe('medium');
    expect(
      mapTaskStyleToMonday({ priority: 'LOW', taskType: 'TASK', isOverdue: false }).priority,
    ).toBe('low');
  });
  it('MON1-W-3: writer called once, written=1, failed=0', async () => {
    const writer = jest.fn().mockResolvedValue(undefined);
    const result = await writeEnhancedTasks(
      [
        {
          element: CANONICAL_ELEMENT,
          style: CANONICAL_STYLE,
          generatedDescription: GENERATED_DESC,
        },
      ],
      writer,
    );
    expect(writer).toHaveBeenCalledTimes(1);
    expect(result.written).toBe(1);
    expect(result.failed).toBe(0);
  });
  it('MON1-W-4: payload has type=TASK_UPDATE, name, status, assignee, description', async () => {
    const writer = jest.fn().mockResolvedValue(undefined);
    await writeEnhancedTasks(
      [
        {
          element: CANONICAL_ELEMENT,
          style: CANONICAL_STYLE,
          generatedDescription: GENERATED_DESC,
        },
      ],
      writer,
    );
    const payload = writer.mock.calls[0][0] as Record<string, unknown>;
    expect(payload['type']).toBe('TASK_UPDATE');
    expect(payload['name']).toBe('Build RAG pipeline');
    expect(payload['status']).toBe('IN_PROGRESS');
    expect(payload['assignee']).toBe('Alex');
    expect(payload['description']).toBe(GENERATED_DESC);
  });
});

// ── WRITE: writeEnhancedTasks (MON1-W-5..8) ───────────────────────────────────

describe('FLOW-34 MON1 — WRITE path: writeEnhancedTasks (injected writer)', () => {
  it('MON1-W-5: writer failure → failed=1, no throw', async () => {
    const writer = jest.fn().mockRejectedValue(new Error('monday.com API error'));
    const result = await writeEnhancedTasks(
      [
        {
          element: CANONICAL_ELEMENT,
          style: CANONICAL_STYLE,
          generatedDescription: GENERATED_DESC,
        },
      ],
      writer,
    );
    expect(result.written).toBe(0);
    expect(result.failed).toBe(1);
  });
  it('MON1-W-6: writes multiple items in order', async () => {
    const names: string[] = [];
    const writer = jest.fn().mockImplementation(async (p: Record<string, unknown>) => {
      names.push(p['name'] as string);
    });
    await writeEnhancedTasks(
      [
        {
          element: { ...CANONICAL_ELEMENT, name: 'Task A' },
          style: CANONICAL_STYLE,
          generatedDescription: GENERATED_DESC,
        },
        {
          element: { ...CANONICAL_ELEMENT, name: 'Task B' },
          style: CANONICAL_STYLE,
          generatedDescription: GENERATED_DESC,
        },
      ],
      writer,
    );
    expect(names).toEqual(['Task A', 'Task B']);
  });
  it('MON1-W-7: status Working on it → IN_PROGRESS verified', () => {
    const el = mapMondayToTaskElement(
      makeMondayItem({ status: { text: 'Working on it', color: '#fdab3d' } }),
    );
    expect(el.status).toBe('IN_PROGRESS');
  });
  it('MON1-W-8: status text not in STATUS_MAP → TODO', () => {
    const el = mapMondayToTaskElement(
      makeMondayItem({ status: { text: 'Custom Status', color: '#aaa' } }),
    );
    expect(el.status).toBe('TODO');
  });
});

// ── Equivalence (MON1-E-1..4) ─────────────────────────────────────────────────

describe('FLOW-34 MON1 — Equivalence: adapter output = shared canonical', () => {
  const item = makeMondayItem();
  it('MON1-E-1: mapMondayToTaskElement output identical to CANONICAL_ELEMENT', () => {
    expect(mapMondayToTaskElement(item)).toEqual(CANONICAL_ELEMENT);
  });
  it('MON1-E-2: mapMondayToTaskStyle output identical to CANONICAL_STYLE', () => {
    expect(mapMondayToTaskStyle(item)).toEqual(CANONICAL_STYLE);
  });
  it('MON1-E-3: readBoardItems elements[0]=CANONICAL_ELEMENT, styles[0]=CANONICAL_STYLE', () => {
    const { elements, styles } = readBoardItems([item]);
    expect(elements[0]).toEqual(CANONICAL_ELEMENT);
    expect(styles[0]).toEqual(CANONICAL_STYLE);
  });
  it('MON1-E-4: READ→WRITE round-trip: HIGH → high priority', () => {
    const style = mapMondayToTaskStyle(item);
    const back = mapTaskStyleToMonday(style);
    expect(back.priority).toBe('high');
  });
});

// ── Packaging (MON1-P-1..4) ───────────────────────────────────────────────────

describe('FLOW-34 MON1 — Packaging + manifest checks', () => {
  it('MON1-P-1: all 5 adapter functions exported', () => {
    expect(typeof mapMondayToTaskElement).toBe('function');
    expect(typeof mapMondayToTaskStyle).toBe('function');
    expect(typeof mapTaskStyleToMonday).toBe('function');
    expect(typeof readBoardItems).toBe('function');
    expect(typeof writeEnhancedTasks).toBe('function');
  });
  it('MON1-P-2: adapter importable without monday-apps SDK', () => {
    expect(mapMondayToTaskElement).toBeDefined();
  });
  it('MON1-P-3: package.json name matches /^@xiigen\\/monday-/', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pkg = require('../../../adapters/monday-com/FT-MON1/package.json') as { name: string };
    expect(pkg.name).toMatch(/^@xiigen\/monday-/);
  });
  it('MON1-P-4: FT-MON1 in manifest, monday-com platform, MODE_B, path contains FT-MON1', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const manifest =
      require('../../../contracts/features/feature-manifest-marketplace-plugins-v1.json') as {
        features: Array<{
          ftId: string;
          portingCandidate: boolean;
          platforms: Array<{ platformId: string; adapterMode: string; adapterPath: string }>;
        }>;
      };
    const ft = manifest.features.find((f) => f.ftId === 'FT-MON1');
    expect(ft).toBeDefined();
    expect(ft!.portingCandidate).toBe(true);
    const platform = ft!.platforms.find((p) => p.platformId === 'monday-com');
    expect(platform).toBeDefined();
    expect(platform!.adapterMode).toBe('MODE_B');
    expect(platform!.adapterPath).toContain('FT-MON1');
  });
});

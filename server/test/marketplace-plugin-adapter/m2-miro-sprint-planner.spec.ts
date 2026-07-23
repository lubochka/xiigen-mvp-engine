/**
 * FLOW-34 — M2 Miro Sprint Planner Adapter Tests
 * 26 tests: M2-R-1..10, M2-W-1..8, M2-E-1..4, M2-P-1..4
 */

import {
  mapMiroSprintToElement,
  mapMiroSprintToStyle,
  mapSprintStyleToMiro,
  readSprintBoard,
  writeSprintToBoard,
} from '../.././../adapters/miro/FT-M2/src/miro-adapter';
import type {
  MiroSprintItem,
  SharedSprintStyle,
  SharedSprintElement,
} from '../../../adapters/miro/FT-M2/src/types';

function makeMiroSprintItem(overrides: Partial<MiroSprintItem> = {}): MiroSprintItem {
  return {
    id: 'sprint-001',
    type: 'card',
    title: 'Implement auth',
    status: 'todo',
    storyPoints: 3,
    style: { fillColor: '#e8f4fd', borderColor: '#2196f3', textColor: '#0d47a1' },
    position: { x: 0, y: 0 },
    geometry: { width: 200, height: 100 },
    ...overrides,
  };
}

const CANONICAL_ELEMENT: SharedSprintElement = {
  type: 'TASK',
  title: 'Implement auth',
  status: 'TODO',
  storyPoints: 3,
};
const CANONICAL_STYLE: SharedSprintStyle = {
  fillColor: '#e8f4fd',
  borderColor: '#2196f3',
  textColor: '#0d47a1',
  taskType: 'TASK',
};

// ── READ: mapMiroSprintToElement (M2-R-1..5) ──────────────────────────────────

describe('FLOW-34 M2 — READ path: mapMiroSprintToElement', () => {
  it('M2-R-1: card → TASK', () => {
    expect(mapMiroSprintToElement(makeMiroSprintItem({ type: 'card' })).type).toBe('TASK');
  });
  it('M2-R-2: sticky_note → NOTE, frame → EPIC', () => {
    expect(mapMiroSprintToElement(makeMiroSprintItem({ type: 'sticky_note' })).type).toBe('NOTE');
    expect(mapMiroSprintToElement(makeMiroSprintItem({ type: 'frame' })).type).toBe('EPIC');
  });
  it('M2-R-3: status todo→TODO, in_progress→IN_PROGRESS, done→DONE', () => {
    expect(mapMiroSprintToElement(makeMiroSprintItem({ status: 'todo' })).status).toBe('TODO');
    expect(mapMiroSprintToElement(makeMiroSprintItem({ status: 'in_progress' })).status).toBe(
      'IN_PROGRESS',
    );
    expect(mapMiroSprintToElement(makeMiroSprintItem({ status: 'done' })).status).toBe('DONE');
  });
  it('M2-R-4: title preserved', () => {
    expect(mapMiroSprintToElement(makeMiroSprintItem({ title: 'Design review' })).title).toBe(
      'Design review',
    );
  });
  it('M2-R-5: storyPoints preserved', () => {
    expect(mapMiroSprintToElement(makeMiroSprintItem({ storyPoints: 8 })).storyPoints).toBe(8);
  });
});

// ── READ: mapMiroSprintToStyle (M2-R-6..10) ───────────────────────────────────

describe('FLOW-34 M2 — READ path: mapMiroSprintToStyle', () => {
  it('M2-R-6: fillColor preserved', () => {
    expect(
      mapMiroSprintToStyle(
        makeMiroSprintItem({
          style: { fillColor: '#fff9e6', borderColor: '#ff9800', textColor: '#e65100' },
        }),
      ).fillColor,
    ).toBe('#fff9e6');
  });
  it('M2-R-7: borderColor preserved', () => {
    expect(mapMiroSprintToStyle(makeMiroSprintItem()).borderColor).toBe('#2196f3');
  });
  it('M2-R-8: textColor preserved', () => {
    expect(mapMiroSprintToStyle(makeMiroSprintItem()).textColor).toBe('#0d47a1');
  });
  it('M2-R-9: taskType derived from Miro type', () => {
    expect(mapMiroSprintToStyle(makeMiroSprintItem({ type: 'sticky_note' })).taskType).toBe('NOTE');
    expect(mapMiroSprintToStyle(makeMiroSprintItem({ type: 'frame' })).taskType).toBe('EPIC');
  });
  it('M2-R-10: missing status defaults to TODO', () => {
    const item = makeMiroSprintItem({ status: undefined });
    expect(mapMiroSprintToElement(item).status).toBe('TODO');
  });
});

// ── WRITE: mapSprintStyleToMiro (M2-W-1..4) ───────────────────────────────────

describe('FLOW-34 M2 — WRITE path: mapSprintStyleToMiro', () => {
  it('M2-W-1: TASK → card type', () => {
    expect(mapSprintStyleToMiro({ ...CANONICAL_STYLE, taskType: 'TASK' }).type).toBe('card');
  });
  it('M2-W-2: NOTE → sticky_note, EPIC → frame', () => {
    expect(mapSprintStyleToMiro({ ...CANONICAL_STYLE, taskType: 'NOTE' }).type).toBe('sticky_note');
    expect(mapSprintStyleToMiro({ ...CANONICAL_STYLE, taskType: 'EPIC' }).type).toBe('frame');
  });
  it('M2-W-3: fillColor passes through to style', () => {
    const result = mapSprintStyleToMiro({ ...CANONICAL_STYLE, fillColor: '#e8f5e9' });
    expect(result.style!.fillColor).toBe('#e8f5e9');
  });
  it('M2-W-4: borderColor and textColor pass through', () => {
    const result = mapSprintStyleToMiro(CANONICAL_STYLE);
    expect(result.style!.borderColor).toBe('#2196f3');
    expect(result.style!.textColor).toBe('#0d47a1');
  });
});

// ── WRITE: writeSprintToBoard (M2-W-5..8) ─────────────────────────────────────

describe('FLOW-34 M2 — WRITE path: writeSprintToBoard', () => {
  it('M2-W-5: writer called once, result.written = 1', async () => {
    const writer = jest.fn().mockResolvedValue(undefined);
    const result = await writeSprintToBoard(
      [{ element: CANONICAL_ELEMENT, style: CANONICAL_STYLE }],
      writer,
    );
    expect(writer).toHaveBeenCalledTimes(1);
    expect(result.written).toBe(1);
    expect(result.failed).toBe(0);
  });
  it('M2-W-6: payload has type=card, title=Implement auth, status=todo, storyPoints=3', async () => {
    const writer = jest.fn().mockResolvedValue(undefined);
    await writeSprintToBoard([{ element: CANONICAL_ELEMENT, style: CANONICAL_STYLE }], writer);
    const payload = writer.mock.calls[0][0] as Record<string, unknown>;
    expect(payload['type']).toBe('card');
    expect(payload['title']).toBe('Implement auth');
    expect(payload['status']).toBe('todo');
    expect(payload['storyPoints']).toBe(3);
  });
  it('M2-W-7: writer failure → failed incremented, does not throw', async () => {
    const writer = jest.fn().mockRejectedValue(new Error('Miro API error'));
    const result = await writeSprintToBoard(
      [{ element: CANONICAL_ELEMENT, style: CANONICAL_STYLE }],
      writer,
    );
    expect(result.written).toBe(0);
    expect(result.failed).toBe(1);
  });
  it('M2-W-8: writes multiple sprint items in order', async () => {
    const titles: string[] = [];
    const writer = jest.fn().mockImplementation(async (p: Record<string, unknown>) => {
      titles.push(p['title'] as string);
    });
    await writeSprintToBoard(
      [
        { element: { ...CANONICAL_ELEMENT, title: 'Task A' }, style: CANONICAL_STYLE },
        { element: { ...CANONICAL_ELEMENT, title: 'Task B' }, style: CANONICAL_STYLE },
      ],
      writer,
    );
    expect(titles).toEqual(['Task A', 'Task B']);
  });
});

// ── Equivalence (M2-E-1..4) ───────────────────────────────────────────────────

describe('FLOW-34 M2 — Equivalence: adapter output = shared canonical', () => {
  const item = makeMiroSprintItem();
  it('M2-E-1: mapMiroSprintToElement output identical to canonical element', () => {
    expect(mapMiroSprintToElement(item)).toEqual(CANONICAL_ELEMENT);
  });
  it('M2-E-2: mapMiroSprintToStyle output identical to canonical style', () => {
    expect(mapMiroSprintToStyle(item)).toEqual(CANONICAL_STYLE);
  });
  it('M2-E-3: readSprintBoard arrays match canonical shapes', () => {
    const { elements, styles } = readSprintBoard([item]);
    expect(elements[0]).toEqual(CANONICAL_ELEMENT);
    expect(styles[0]).toEqual(CANONICAL_STYLE);
  });
  it('M2-E-4: READ→WRITE round-trip preserves type and colors', () => {
    const shared = mapMiroSprintToStyle(item);
    const back = mapSprintStyleToMiro(shared);
    expect(back.type).toBe(item.type);
    expect(back.style!.fillColor).toBe(item.style.fillColor);
  });
});

// ── Packaging (M2-P-1..4) ─────────────────────────────────────────────────────

describe('FLOW-34 M2 — Packaging + manifest checks', () => {
  it('M2-P-1: all 5 adapter functions exported', () => {
    expect(typeof mapMiroSprintToElement).toBe('function');
    expect(typeof mapMiroSprintToStyle).toBe('function');
    expect(typeof mapSprintStyleToMiro).toBe('function');
    expect(typeof readSprintBoard).toBe('function');
    expect(typeof writeSprintToBoard).toBe('function');
  });
  it('M2-P-2: adapter importable without @mirohq/miro-api', () => {
    expect(mapMiroSprintToElement).toBeDefined();
  });
  it('M2-P-3: package.json name follows @xiigen/miro-* convention', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pkg = require('../.././../adapters/miro/FT-M2/package.json') as { name: string };
    expect(pkg.name).toMatch(/^@xiigen\/miro-/);
  });
  it('M2-P-4: FT-M2 record in marketplace manifest', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const manifest =
      require('../../../contracts/features/feature-manifest-marketplace-plugins-v1.json') as {
        features: Array<{
          ftId: string;
          portingCandidate: boolean;
          productScope: string;
          platforms: Array<{ platformId: string; adapterMode: string; adapterPath: string }>;
        }>;
      };
    const ftM2 = manifest.features.find((f) => f.ftId === 'FT-M2');
    expect(ftM2).toBeDefined();
    expect(ftM2!.portingCandidate).toBe(true);
    const miro = ftM2!.platforms.find((p) => p.platformId === 'miro');
    expect(miro).toBeDefined();
    expect(miro!.adapterMode).toBe('MODE_B');
    expect(miro!.adapterPath).toContain('FT-M2');
  });
});

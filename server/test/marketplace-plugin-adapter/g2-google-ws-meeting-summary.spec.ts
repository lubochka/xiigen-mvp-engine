/**
 * FLOW-34 — G2 Google Workspace Meeting Summary Generator Adapter Tests
 * (Master plan: G = Google WS prefix. G2 = Meeting Summary Generator.)
 * 26 tests: G2-R-1..10, G2-W-1..8, G2-E-1..4, G2-P-1..4
 */

import {
  mapGoogleToMeetingElement,
  mapGoogleToMeetingStyle,
  mapMeetingStyleToGoogle,
  readMeetingItems,
  writeMeetingSummary,
} from '../../../adapters/google-ws/FT-G2/src/google-ws-adapter';
import type {
  GoogleMeetingItem,
  SharedMeetingStyle,
  SharedMeetingElement,
} from '../../../adapters/google-ws/FT-G2/src/types';

function makeMeetingItem(overrides: Partial<GoogleMeetingItem> = {}): GoogleMeetingItem {
  return {
    id: 'item-001',
    type: 'action_item',
    title: 'Set up RAG pipeline',
    content: 'Configure ES indices for vector search',
    owner: 'eng-team',
    status: 'open',
    ...overrides,
  };
}

const CANONICAL_ELEMENT: SharedMeetingElement = {
  type: 'ACTION',
  title: 'Set up RAG pipeline',
  content: 'Configure ES indices for vector search',
  owner: 'eng-team',
};
const CANONICAL_STYLE: SharedMeetingStyle = {
  priority: 'HIGH',
  itemType: 'ACTION',
  requiresFollowUp: true,
};
const GENERATED_SUMMARY = 'Action: Set up RAG pipeline — Owner: eng-team — Status: open';

// ── READ: mapGoogleToMeetingElement (G2-R-1..5) ───────────────────────────────

describe('FLOW-34 G2 — READ path: mapGoogleToMeetingElement', () => {
  it('G2-R-1: action_item → ACTION type', () => {
    expect(mapGoogleToMeetingElement(makeMeetingItem({ type: 'action_item' })).type).toBe('ACTION');
  });
  it('G2-R-2: agenda_item/decision/note/attendee map correctly', () => {
    expect(mapGoogleToMeetingElement(makeMeetingItem({ type: 'agenda_item' })).type).toBe('AGENDA');
    expect(mapGoogleToMeetingElement(makeMeetingItem({ type: 'decision' })).type).toBe('DECISION');
    expect(mapGoogleToMeetingElement(makeMeetingItem({ type: 'note' })).type).toBe('NOTE');
    expect(mapGoogleToMeetingElement(makeMeetingItem({ type: 'attendee' })).type).toBe('ATTENDEE');
  });
  it('G2-R-3: title preserved', () => {
    expect(mapGoogleToMeetingElement(makeMeetingItem({ title: 'Review Q1 metrics' })).title).toBe(
      'Review Q1 metrics',
    );
  });
  it('G2-R-4: content preserved', () => {
    expect(
      mapGoogleToMeetingElement(makeMeetingItem({ content: 'Look at revenue data' })).content,
    ).toBe('Look at revenue data');
  });
  it('G2-R-5: owner preserved', () => {
    expect(mapGoogleToMeetingElement(makeMeetingItem({ owner: 'product-lead' })).owner).toBe(
      'product-lead',
    );
  });
});

// ── READ: mapGoogleToMeetingStyle (G2-R-6..10) ────────────────────────────────

describe('FLOW-34 G2 — READ path: mapGoogleToMeetingStyle', () => {
  it('G2-R-6: action_item/decision → HIGH priority', () => {
    expect(mapGoogleToMeetingStyle(makeMeetingItem({ type: 'action_item' })).priority).toBe('HIGH');
    expect(mapGoogleToMeetingStyle(makeMeetingItem({ type: 'decision' })).priority).toBe('HIGH');
  });
  it('G2-R-7: agenda_item → MEDIUM priority', () => {
    expect(mapGoogleToMeetingStyle(makeMeetingItem({ type: 'agenda_item' })).priority).toBe(
      'MEDIUM',
    );
  });
  it('G2-R-8: note/attendee → LOW priority', () => {
    expect(mapGoogleToMeetingStyle(makeMeetingItem({ type: 'note' })).priority).toBe('LOW');
    expect(mapGoogleToMeetingStyle(makeMeetingItem({ type: 'attendee' })).priority).toBe('LOW');
  });
  it('G2-R-9: open action_item → requiresFollowUp true', () => {
    expect(
      mapGoogleToMeetingStyle(makeMeetingItem({ type: 'action_item', status: 'open' }))
        .requiresFollowUp,
    ).toBe(true);
  });
  it('G2-R-10: completed action_item → requiresFollowUp false', () => {
    expect(
      mapGoogleToMeetingStyle(makeMeetingItem({ type: 'action_item', status: 'completed' }))
        .requiresFollowUp,
    ).toBe(false);
  });
});

// ── WRITE: mapMeetingStyleToGoogle (G2-W-1..4) ────────────────────────────────

describe('FLOW-34 G2 — WRITE path: mapMeetingStyleToGoogle', () => {
  it('G2-W-1: ACTION → action_item type', () => {
    expect(mapMeetingStyleToGoogle({ ...CANONICAL_STYLE, itemType: 'ACTION' }).type).toBe(
      'action_item',
    );
  });
  it('G2-W-2: AGENDA/DECISION/NOTE/ATTENDEE map correctly', () => {
    expect(mapMeetingStyleToGoogle({ ...CANONICAL_STYLE, itemType: 'AGENDA' }).type).toBe(
      'agenda_item',
    );
    expect(mapMeetingStyleToGoogle({ ...CANONICAL_STYLE, itemType: 'DECISION' }).type).toBe(
      'decision',
    );
    expect(mapMeetingStyleToGoogle({ ...CANONICAL_STYLE, itemType: 'NOTE' }).type).toBe('note');
    expect(mapMeetingStyleToGoogle({ ...CANONICAL_STYLE, itemType: 'ATTENDEE' }).type).toBe(
      'attendee',
    );
  });
  it('G2-W-3: requiresFollowUp true → status open', () => {
    expect(mapMeetingStyleToGoogle({ ...CANONICAL_STYLE, requiresFollowUp: true }).status).toBe(
      'open',
    );
  });
  it('G2-W-4: requiresFollowUp false → status completed', () => {
    expect(mapMeetingStyleToGoogle({ ...CANONICAL_STYLE, requiresFollowUp: false }).status).toBe(
      'completed',
    );
  });
});

// ── WRITE: writeMeetingSummary (G2-W-5..8) ────────────────────────────────────

describe('FLOW-34 G2 — WRITE path: writeMeetingSummary', () => {
  it('G2-W-5: writer called once, result.written = 1', async () => {
    const writer = jest.fn().mockResolvedValue(undefined);
    const result = await writeMeetingSummary(
      [{ element: CANONICAL_ELEMENT, style: CANONICAL_STYLE, generatedSummary: GENERATED_SUMMARY }],
      writer,
    );
    expect(writer).toHaveBeenCalledTimes(1);
    expect(result.written).toBe(1);
    expect(result.failed).toBe(0);
  });
  it('G2-W-6: payload type=MEETING_SUMMARY, title, owner, priority, summary, requiresFollowUp', async () => {
    const writer = jest.fn().mockResolvedValue(undefined);
    await writeMeetingSummary(
      [{ element: CANONICAL_ELEMENT, style: CANONICAL_STYLE, generatedSummary: GENERATED_SUMMARY }],
      writer,
    );
    const payload = writer.mock.calls[0][0] as Record<string, unknown>;
    expect(payload['type']).toBe('MEETING_SUMMARY');
    expect(payload['title']).toBe('Set up RAG pipeline');
    expect(payload['owner']).toBe('eng-team');
    expect(payload['priority']).toBe('HIGH');
    expect(payload['summary']).toBe(GENERATED_SUMMARY);
    expect(payload['requiresFollowUp']).toBe(true);
  });
  it('G2-W-7: writer failure → failed incremented, does not throw', async () => {
    const writer = jest.fn().mockRejectedValue(new Error('Google Docs API error'));
    const result = await writeMeetingSummary(
      [{ element: CANONICAL_ELEMENT, style: CANONICAL_STYLE, generatedSummary: GENERATED_SUMMARY }],
      writer,
    );
    expect(result.written).toBe(0);
    expect(result.failed).toBe(1);
  });
  it('G2-W-8: writes multiple items in order', async () => {
    const titles: string[] = [];
    const writer = jest.fn().mockImplementation(async (p: Record<string, unknown>) => {
      titles.push(p['title'] as string);
    });
    await writeMeetingSummary(
      [
        {
          element: { ...CANONICAL_ELEMENT, title: 'Setup CI pipeline' },
          style: CANONICAL_STYLE,
          generatedSummary: 'S1',
        },
        {
          element: { ...CANONICAL_ELEMENT, title: 'Deploy to staging' },
          style: CANONICAL_STYLE,
          generatedSummary: 'S2',
        },
      ],
      writer,
    );
    expect(titles).toEqual(['Setup CI pipeline', 'Deploy to staging']);
  });
});

// ── Equivalence (G2-E-1..4) ───────────────────────────────────────────────────

describe('FLOW-34 G2 — Equivalence: adapter output = shared canonical', () => {
  const item = makeMeetingItem();
  it('G2-E-1: mapGoogleToMeetingElement output identical to canonical element', () => {
    expect(mapGoogleToMeetingElement(item)).toEqual(CANONICAL_ELEMENT);
  });
  it('G2-E-2: mapGoogleToMeetingStyle output identical to canonical style', () => {
    expect(mapGoogleToMeetingStyle(item)).toEqual(CANONICAL_STYLE);
  });
  it('G2-E-3: readMeetingItems arrays match canonical shapes', () => {
    const { elements, styles } = readMeetingItems([item]);
    expect(elements[0]).toEqual(CANONICAL_ELEMENT);
    expect(styles[0]).toEqual(CANONICAL_STYLE);
  });
  it('G2-E-4: READ→WRITE round-trip preserves type and requiresFollowUp', () => {
    const shared = mapGoogleToMeetingStyle(item);
    const back = mapMeetingStyleToGoogle(shared);
    expect(back.type).toBe('action_item');
    expect(back.status).toBe('open');
  });
});

// ── Packaging (G2-P-1..4) ─────────────────────────────────────────────────────

describe('FLOW-34 G2 — Packaging + manifest checks', () => {
  it('G2-P-1: all 5 adapter functions exported', () => {
    expect(typeof mapGoogleToMeetingElement).toBe('function');
    expect(typeof mapGoogleToMeetingStyle).toBe('function');
    expect(typeof mapMeetingStyleToGoogle).toBe('function');
    expect(typeof readMeetingItems).toBe('function');
    expect(typeof writeMeetingSummary).toBe('function');
  });
  it('G2-P-2: adapter importable without @googleapis/*', () => {
    expect(mapGoogleToMeetingElement).toBeDefined();
  });
  it('G2-P-3: package.json name follows @xiigen/google-ws-* convention', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pkg = require('../../../adapters/google-ws/FT-G2/package.json') as { name: string };
    expect(pkg.name).toMatch(/^@xiigen\/google-ws-/);
  });
  it('G2-P-4: FT-G2 record in marketplace manifest', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const manifest =
      require('../../../contracts/features/feature-manifest-marketplace-plugins-v1.json') as {
        features: Array<{
          ftId: string;
          portingCandidate: boolean;
          platforms: Array<{ platformId: string; adapterMode: string; adapterPath: string }>;
        }>;
      };
    const ftG2 = manifest.features.find((f) => f.ftId === 'FT-G2');
    expect(ftG2).toBeDefined();
    expect(ftG2!.portingCandidate).toBe(true);
    const google = ftG2!.platforms.find((p) => p.platformId === 'google-ws');
    expect(google).toBeDefined();
    expect(google!.adapterMode).toBe('MODE_B');
    expect(google!.adapterPath).toContain('FT-G2');
  });
});

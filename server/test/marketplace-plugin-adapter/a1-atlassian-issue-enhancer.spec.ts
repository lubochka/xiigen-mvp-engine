/**
 * FLOW-34 — A1 Atlassian Jira AI Issue Enhancer Adapter Tests
 * 26 tests: A1-R-1..10, A1-W-1..8, A1-E-1..4, A1-P-1..4
 */

import {
  mapJiraToIssueElement,
  mapJiraToIssueStyle,
  mapIssueStyleToJira,
  readJiraIssues,
  writeEnhancedIssues,
} from '../../../adapters/atlassian/FT-A1/src/atlassian-adapter';
import type {
  JiraIssue,
  SharedIssueElement,
  SharedIssueStyle,
} from '../../../adapters/atlassian/FT-A1/src/types';

function makeJiraIssue(overrides: Partial<JiraIssue> = {}): JiraIssue {
  return {
    id: 'DEV-42',
    key: 'DEV-42',
    issueType: 'Story',
    summary: 'Implement RAG search',
    description: 'Build vector search using ES',
    status: 'In Progress',
    priority: 'High',
    assignee: { displayName: 'Alex Chen' },
    storyPoints: 8,
    ...overrides,
  };
}

const CANONICAL_ELEMENT: SharedIssueElement = {
  type: 'STORY',
  key: 'DEV-42',
  summary: 'Implement RAG search',
  description: 'Build vector search using ES',
  assignee: 'Alex Chen',
};
const CANONICAL_STYLE: SharedIssueStyle = {
  priority: 'HIGH',
  status: 'IN_PROGRESS',
  issueType: 'STORY',
};
const GENERATED_DESC = 'Implement vector search using Elasticsearch kNN API for RAG retrieval';

// ── READ: mapJiraToIssueElement (A1-R-1..5) ───────────────────────────────────

describe('FLOW-34 A1 — READ path: mapJiraToIssueElement', () => {
  it('A1-R-1: Story → STORY type', () => {
    expect(mapJiraToIssueElement(makeJiraIssue({ issueType: 'Story' })).type).toBe('STORY');
  });
  it('A1-R-2: Bug→BUG, Task→TASK, Epic→EPIC, Sub-task→SUBTASK', () => {
    expect(mapJiraToIssueElement(makeJiraIssue({ issueType: 'Bug' })).type).toBe('BUG');
    expect(mapJiraToIssueElement(makeJiraIssue({ issueType: 'Task' })).type).toBe('TASK');
    expect(mapJiraToIssueElement(makeJiraIssue({ issueType: 'Epic' })).type).toBe('EPIC');
    expect(mapJiraToIssueElement(makeJiraIssue({ issueType: 'Sub-task' })).type).toBe('SUBTASK');
  });
  it('A1-R-3: key preserved', () => {
    expect(mapJiraToIssueElement(makeJiraIssue({ key: 'DEV-42' })).key).toBe('DEV-42');
  });
  it('A1-R-4: summary preserved', () => {
    expect(mapJiraToIssueElement(makeJiraIssue({ summary: 'Implement RAG search' })).summary).toBe(
      'Implement RAG search',
    );
  });
  it('A1-R-5: assignee.displayName preserved', () => {
    expect(
      mapJiraToIssueElement(makeJiraIssue({ assignee: { displayName: 'Alex Chen' } })).assignee,
    ).toBe('Alex Chen');
  });
});

// ── READ: mapJiraToIssueStyle (A1-R-6..10) ────────────────────────────────────

describe('FLOW-34 A1 — READ path: mapJiraToIssueStyle', () => {
  it('A1-R-6: High → HIGH priority', () => {
    expect(mapJiraToIssueStyle(makeJiraIssue({ priority: 'High' })).priority).toBe('HIGH');
  });
  it('A1-R-7: Highest→CRITICAL, Low/Lowest→LOW', () => {
    expect(mapJiraToIssueStyle(makeJiraIssue({ priority: 'Highest' })).priority).toBe('CRITICAL');
    expect(mapJiraToIssueStyle(makeJiraIssue({ priority: 'Low' })).priority).toBe('LOW');
    expect(mapJiraToIssueStyle(makeJiraIssue({ priority: 'Lowest' })).priority).toBe('LOW');
  });
  it('A1-R-8: In Progress → IN_PROGRESS status', () => {
    expect(mapJiraToIssueStyle(makeJiraIssue({ status: 'In Progress' })).status).toBe(
      'IN_PROGRESS',
    );
  });
  it('A1-R-9: To Do→TODO, In Review→IN_REVIEW, Done→DONE', () => {
    expect(mapJiraToIssueStyle(makeJiraIssue({ status: 'To Do' })).status).toBe('TODO');
    expect(mapJiraToIssueStyle(makeJiraIssue({ status: 'In Review' })).status).toBe('IN_REVIEW');
    expect(mapJiraToIssueStyle(makeJiraIssue({ status: 'Done' })).status).toBe('DONE');
  });
  it('A1-R-10: issueType matches type mapping', () => {
    expect(mapJiraToIssueStyle(makeJiraIssue({ issueType: 'Story' })).issueType).toBe('STORY');
    expect(mapJiraToIssueStyle(makeJiraIssue({ issueType: 'Bug' })).issueType).toBe('BUG');
  });
});

// ── WRITE: mapIssueStyleToJira (A1-W-1..4) ────────────────────────────────────

describe('FLOW-34 A1 — WRITE path: mapIssueStyleToJira', () => {
  it('A1-W-1: HIGH → High priority in payload', () => {
    expect(
      mapIssueStyleToJira({ priority: 'HIGH', status: 'IN_PROGRESS', issueType: 'STORY' }).priority,
    ).toBe('High');
  });
  it('A1-W-2: CRITICAL→Highest, LOW→Low, MEDIUM→Medium', () => {
    expect(
      mapIssueStyleToJira({ priority: 'CRITICAL', status: 'IN_PROGRESS', issueType: 'STORY' })
        .priority,
    ).toBe('Highest');
    expect(
      mapIssueStyleToJira({ priority: 'LOW', status: 'TODO', issueType: 'TASK' }).priority,
    ).toBe('Low');
    expect(
      mapIssueStyleToJira({ priority: 'MEDIUM', status: 'TODO', issueType: 'TASK' }).priority,
    ).toBe('Medium');
  });
  it('A1-W-3: writer called once, written=1, failed=0', async () => {
    const writer = jest.fn().mockResolvedValue(undefined);
    const result = await writeEnhancedIssues(
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
  it('A1-W-4: payload has type=ISSUE_UPDATE, key, summary, description, issueType', async () => {
    const writer = jest.fn().mockResolvedValue(undefined);
    await writeEnhancedIssues(
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
    expect(payload['type']).toBe('ISSUE_UPDATE');
    expect(payload['key']).toBe('DEV-42');
    expect(payload['summary']).toBe('Implement RAG search');
    expect(payload['description']).toBe(GENERATED_DESC);
    expect(payload['issueType']).toBe('STORY');
  });
});

// ── WRITE: writeEnhancedIssues (A1-W-5..8) ────────────────────────────────────

describe('FLOW-34 A1 — WRITE path: writeEnhancedIssues (injected writer)', () => {
  it('A1-W-5: writer failure → failed=1, no throw', async () => {
    const writer = jest.fn().mockRejectedValue(new Error('Jira API error'));
    const result = await writeEnhancedIssues(
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
  it('A1-W-6: writes multiple items in order', async () => {
    const keys: string[] = [];
    const writer = jest.fn().mockImplementation(async (p: Record<string, unknown>) => {
      keys.push(p['key'] as string);
    });
    await writeEnhancedIssues(
      [
        {
          element: { ...CANONICAL_ELEMENT, key: 'DEV-10' },
          style: CANONICAL_STYLE,
          generatedDescription: GENERATED_DESC,
        },
        {
          element: { ...CANONICAL_ELEMENT, key: 'DEV-11' },
          style: CANONICAL_STYLE,
          generatedDescription: GENERATED_DESC,
        },
      ],
      writer,
    );
    expect(keys).toEqual(['DEV-10', 'DEV-11']);
  });
  it('A1-W-7: IN_PROGRESS → In Progress status', () => {
    const back = mapIssueStyleToJira({
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      issueType: 'STORY',
    });
    expect(back.status).toBe('In Progress');
  });
  it('A1-W-8: DONE→Done, TODO→To Do', () => {
    expect(mapIssueStyleToJira({ priority: 'LOW', status: 'DONE', issueType: 'TASK' }).status).toBe(
      'Done',
    );
    expect(mapIssueStyleToJira({ priority: 'LOW', status: 'TODO', issueType: 'TASK' }).status).toBe(
      'To Do',
    );
  });
});

// ── Equivalence (A1-E-1..4) ───────────────────────────────────────────────────

describe('FLOW-34 A1 — Equivalence: adapter output = shared canonical', () => {
  const issue = makeJiraIssue();
  it('A1-E-1: mapJiraToIssueElement output identical to CANONICAL_ELEMENT', () => {
    expect(mapJiraToIssueElement(issue)).toEqual(CANONICAL_ELEMENT);
  });
  it('A1-E-2: mapJiraToIssueStyle output identical to CANONICAL_STYLE', () => {
    expect(mapJiraToIssueStyle(issue)).toEqual(CANONICAL_STYLE);
  });
  it('A1-E-3: readJiraIssues elements[0]=CANONICAL_ELEMENT, styles[0]=CANONICAL_STYLE', () => {
    const { elements, styles } = readJiraIssues([issue]);
    expect(elements[0]).toEqual(CANONICAL_ELEMENT);
    expect(styles[0]).toEqual(CANONICAL_STYLE);
  });
  it('A1-E-4: READ→WRITE round-trip: HIGH priority → High', () => {
    const style = mapJiraToIssueStyle(issue);
    const back = mapIssueStyleToJira(style);
    expect(back.priority).toBe('High');
  });
});

// ── Packaging (A1-P-1..4) ─────────────────────────────────────────────────────

describe('FLOW-34 A1 — Packaging + manifest checks', () => {
  it('A1-P-1: all 5 adapter functions exported', () => {
    expect(typeof mapJiraToIssueElement).toBe('function');
    expect(typeof mapJiraToIssueStyle).toBe('function');
    expect(typeof mapIssueStyleToJira).toBe('function');
    expect(typeof readJiraIssues).toBe('function');
    expect(typeof writeEnhancedIssues).toBe('function');
  });
  it('A1-P-2: adapter importable without @forge/api', () => {
    expect(mapJiraToIssueElement).toBeDefined();
  });
  it('A1-P-3: package.json name matches /^@xiigen\\/atlassian-/', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pkg = require('../../../adapters/atlassian/FT-A1/package.json') as { name: string };
    expect(pkg.name).toMatch(/^@xiigen\/atlassian-/);
  });
  it('A1-P-4: FT-A1 in manifest, atlassian platform, MODE_B, path contains FT-A1', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const manifest =
      require('../../../contracts/features/feature-manifest-marketplace-plugins-v1.json') as {
        features: Array<{
          ftId: string;
          portingCandidate: boolean;
          platforms: Array<{ platformId: string; adapterMode: string; adapterPath: string }>;
        }>;
      };
    const ft = manifest.features.find((f) => f.ftId === 'FT-A1');
    expect(ft).toBeDefined();
    expect(ft!.portingCandidate).toBe(true);
    const platform = ft!.platforms.find((p) => p.platformId === 'atlassian');
    expect(platform).toBeDefined();
    expect(platform!.adapterMode).toBe('MODE_B');
    expect(platform!.adapterPath).toContain('FT-A1');
  });
});

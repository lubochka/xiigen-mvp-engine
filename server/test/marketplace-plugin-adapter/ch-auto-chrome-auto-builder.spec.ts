/**
 * FLOW-34 — CH-AUTO Chrome Auto-Builder Adapter Tests
 * 26 tests: CH-AUTO-R-1..10, CH-AUTO-W-1..8, CH-AUTO-E-1..4, CH-AUTO-P-1..4
 */

import {
  mapChromeToWorkflowStep,
  mapChromeToWorkflowStyle,
  mapWorkflowStyleToChrome,
  readAutomationActions,
  writeAutomationScript,
} from '../../../adapters/chrome/FT-CH-AUTO/src/chrome-auto-adapter';
import type {
  ChromeAutomationAction,
  SharedWorkflowStep,
  SharedWorkflowStyle,
} from '../../../adapters/chrome/FT-CH-AUTO/src/types';

function makeChromeAction(overrides: Partial<ChromeAutomationAction> = {}): ChromeAutomationAction {
  return {
    id: 'action-001',
    type: 'click',
    selector: '#submit-btn',
    description: 'Submit the form',
    order: 1,
    ...overrides,
  };
}

const CANONICAL_STEP: SharedWorkflowStep = {
  type: 'ACTION',
  name: 'Submit the form',
  description: '#submit-btn',
};
const CANONICAL_STYLE: SharedWorkflowStyle = {
  stepRole: 'ACTION',
  isEntryPoint: false,
  requiresConfig: false,
};
const GENERATED_SCRIPT = 'document.querySelector("#submit-btn").click();';

// ── READ: mapChromeToWorkflowStep (CH-AUTO-R-1..5) ────────────────────────────

describe('FLOW-34 CH-AUTO — READ path: mapChromeToWorkflowStep', () => {
  it('CH-AUTO-R-1: click → ACTION', () => {
    expect(mapChromeToWorkflowStep(makeChromeAction({ type: 'click' })).type).toBe('ACTION');
  });
  it('CH-AUTO-R-2: navigate→TRIGGER, extract→TRANSFORM, screenshot→OUTPUT', () => {
    expect(
      mapChromeToWorkflowStep(makeChromeAction({ type: 'navigate', url: 'https://example.com' }))
        .type,
    ).toBe('TRIGGER');
    expect(
      mapChromeToWorkflowStep(makeChromeAction({ type: 'extract', selector: '.data' })).type,
    ).toBe('TRANSFORM');
    expect(mapChromeToWorkflowStep(makeChromeAction({ type: 'screenshot' })).type).toBe('OUTPUT');
  });
  it('CH-AUTO-R-3: description → name', () => {
    expect(mapChromeToWorkflowStep(makeChromeAction({ description: 'Submit the form' })).name).toBe(
      'Submit the form',
    );
  });
  it('CH-AUTO-R-4: selector → description field in SharedWorkflowStep', () => {
    expect(mapChromeToWorkflowStep(makeChromeAction({ selector: '#submit-btn' })).description).toBe(
      '#submit-btn',
    );
  });
  it('CH-AUTO-R-5: url → description when no selector (navigate type)', () => {
    expect(
      mapChromeToWorkflowStep(
        makeChromeAction({ type: 'navigate', selector: undefined, url: 'https://example.com' }),
      ).description,
    ).toBe('https://example.com');
  });
});

// ── READ: mapChromeToWorkflowStyle (CH-AUTO-R-6..10) ──────────────────────────

describe('FLOW-34 CH-AUTO — READ path: mapChromeToWorkflowStyle', () => {
  it('CH-AUTO-R-6: ACTION → isEntryPoint false', () => {
    expect(mapChromeToWorkflowStyle(makeChromeAction({ type: 'click' })).isEntryPoint).toBe(false);
  });
  it('CH-AUTO-R-7: navigate → isEntryPoint true (TRIGGER)', () => {
    expect(
      mapChromeToWorkflowStyle(makeChromeAction({ type: 'navigate', url: 'https://example.com' }))
        .isEntryPoint,
    ).toBe(true);
  });
  it('CH-AUTO-R-8: fill/navigate → requiresConfig true', () => {
    expect(
      mapChromeToWorkflowStyle(
        makeChromeAction({ type: 'fill', selector: '#email', value: 'test@test.com' }),
      ).requiresConfig,
    ).toBe(true);
    expect(
      mapChromeToWorkflowStyle(makeChromeAction({ type: 'navigate', url: 'https://example.com' }))
        .requiresConfig,
    ).toBe(true);
  });
  it('CH-AUTO-R-9: click/scroll/wait/screenshot → requiresConfig false', () => {
    expect(mapChromeToWorkflowStyle(makeChromeAction({ type: 'click' })).requiresConfig).toBe(
      false,
    );
    expect(mapChromeToWorkflowStyle(makeChromeAction({ type: 'scroll' })).requiresConfig).toBe(
      false,
    );
    expect(mapChromeToWorkflowStyle(makeChromeAction({ type: 'wait' })).requiresConfig).toBe(false);
    expect(mapChromeToWorkflowStyle(makeChromeAction({ type: 'screenshot' })).requiresConfig).toBe(
      false,
    );
  });
  it('CH-AUTO-R-10: stepRole matches inferred type', () => {
    expect(mapChromeToWorkflowStyle(makeChromeAction({ type: 'click' })).stepRole).toBe('ACTION');
    expect(
      mapChromeToWorkflowStyle(makeChromeAction({ type: 'navigate', url: 'https://example.com' }))
        .stepRole,
    ).toBe('TRIGGER');
    expect(
      mapChromeToWorkflowStyle(makeChromeAction({ type: 'extract', selector: '.data' })).stepRole,
    ).toBe('TRANSFORM');
    expect(mapChromeToWorkflowStyle(makeChromeAction({ type: 'screenshot' })).stepRole).toBe(
      'OUTPUT',
    );
  });
});

// ── WRITE: mapWorkflowStyleToChrome (CH-AUTO-W-1..4) ──────────────────────────

describe('FLOW-34 CH-AUTO — WRITE path: mapWorkflowStyleToChrome', () => {
  it('CH-AUTO-W-1: ACTION → click type', () => {
    expect(
      mapWorkflowStyleToChrome({ stepRole: 'ACTION', isEntryPoint: false, requiresConfig: false })
        .type,
    ).toBe('click');
  });
  it('CH-AUTO-W-2: TRIGGER→navigate, TRANSFORM→extract, OUTPUT→screenshot, CONDITION→wait', () => {
    expect(
      mapWorkflowStyleToChrome({ stepRole: 'TRIGGER', isEntryPoint: true, requiresConfig: true })
        .type,
    ).toBe('navigate');
    expect(
      mapWorkflowStyleToChrome({
        stepRole: 'TRANSFORM',
        isEntryPoint: false,
        requiresConfig: false,
      }).type,
    ).toBe('extract');
    expect(
      mapWorkflowStyleToChrome({ stepRole: 'OUTPUT', isEntryPoint: false, requiresConfig: false })
        .type,
    ).toBe('screenshot');
    expect(
      mapWorkflowStyleToChrome({
        stepRole: 'CONDITION',
        isEntryPoint: false,
        requiresConfig: false,
      }).type,
    ).toBe('wait');
  });
  it('CH-AUTO-W-3: writer called once, written=1, failed=0', async () => {
    const writer = jest.fn().mockResolvedValue(undefined);
    const result = await writeAutomationScript(
      [{ step: CANONICAL_STEP, style: CANONICAL_STYLE, generatedScript: GENERATED_SCRIPT }],
      writer,
    );
    expect(writer).toHaveBeenCalledTimes(1);
    expect(result.written).toBe(1);
    expect(result.failed).toBe(0);
  });
  it('CH-AUTO-W-4: payload has type=AUTOMATION_STEP, name, stepRole, script', async () => {
    const writer = jest.fn().mockResolvedValue(undefined);
    await writeAutomationScript(
      [{ step: CANONICAL_STEP, style: CANONICAL_STYLE, generatedScript: GENERATED_SCRIPT }],
      writer,
    );
    const payload = writer.mock.calls[0][0] as Record<string, unknown>;
    expect(payload['type']).toBe('AUTOMATION_STEP');
    expect(payload['name']).toBe('Submit the form');
    expect(payload['stepRole']).toBe('ACTION');
    expect(payload['script']).toBe(GENERATED_SCRIPT);
  });
});

// ── WRITE: writeAutomationScript (CH-AUTO-W-5..8) ─────────────────────────────

describe('FLOW-34 CH-AUTO — WRITE path: writeAutomationScript (injected writer)', () => {
  it('CH-AUTO-W-5: writer failure → failed=1, no throw', async () => {
    const writer = jest.fn().mockRejectedValue(new Error('Chrome extension API error'));
    const result = await writeAutomationScript(
      [{ step: CANONICAL_STEP, style: CANONICAL_STYLE, generatedScript: GENERATED_SCRIPT }],
      writer,
    );
    expect(result.written).toBe(0);
    expect(result.failed).toBe(1);
  });
  it('CH-AUTO-W-6: writes multiple items in order (readAutomationActions sorts by order)', async () => {
    const names: string[] = [];
    const writer = jest.fn().mockImplementation(async (p: Record<string, unknown>) => {
      names.push(p['name'] as string);
    });
    await writeAutomationScript(
      [
        {
          step: { ...CANONICAL_STEP, name: 'Action A' },
          style: CANONICAL_STYLE,
          generatedScript: GENERATED_SCRIPT,
        },
        {
          step: { ...CANONICAL_STEP, name: 'Action B' },
          style: CANONICAL_STYLE,
          generatedScript: GENERATED_SCRIPT,
        },
      ],
      writer,
    );
    expect(names).toEqual(['Action A', 'Action B']);
  });
  it('CH-AUTO-W-7: readAutomationActions sorts by order field', () => {
    const actions = [
      makeChromeAction({ id: 'a2', order: 2, description: 'Second' }),
      makeChromeAction({ id: 'a1', order: 1, description: 'First' }),
    ];
    const { steps } = readAutomationActions(actions);
    expect(steps[0].name).toBe('First');
    expect(steps[1].name).toBe('Second');
  });
  it('CH-AUTO-W-8: mapWorkflowStyleToChrome TRIGGER → navigate', () => {
    expect(
      mapWorkflowStyleToChrome({ stepRole: 'TRIGGER', isEntryPoint: true, requiresConfig: true })
        .type,
    ).toBe('navigate');
  });
});

// ── Equivalence (CH-AUTO-E-1..4) ──────────────────────────────────────────────

describe('FLOW-34 CH-AUTO — Equivalence: adapter output = shared canonical', () => {
  const action = makeChromeAction();
  it('CH-AUTO-E-1: mapChromeToWorkflowStep output identical to CANONICAL_STEP', () => {
    expect(mapChromeToWorkflowStep(action)).toEqual(CANONICAL_STEP);
  });
  it('CH-AUTO-E-2: mapChromeToWorkflowStyle output identical to CANONICAL_STYLE', () => {
    expect(mapChromeToWorkflowStyle(action)).toEqual(CANONICAL_STYLE);
  });
  it('CH-AUTO-E-3: readAutomationActions steps[0]=CANONICAL_STEP, styles[0]=CANONICAL_STYLE', () => {
    const { steps, styles } = readAutomationActions([action]);
    expect(steps[0]).toEqual(CANONICAL_STEP);
    expect(styles[0]).toEqual(CANONICAL_STYLE);
  });
  it('CH-AUTO-E-4: READ→WRITE round-trip: ACTION → click type', () => {
    const style = mapChromeToWorkflowStyle(action);
    const back = mapWorkflowStyleToChrome(style);
    expect(back.type).toBe('click');
  });
});

// ── Packaging (CH-AUTO-P-1..4) ────────────────────────────────────────────────

describe('FLOW-34 CH-AUTO — Packaging + manifest checks', () => {
  it('CH-AUTO-P-1: all 5 adapter functions exported', () => {
    expect(typeof mapChromeToWorkflowStep).toBe('function');
    expect(typeof mapChromeToWorkflowStyle).toBe('function');
    expect(typeof mapWorkflowStyleToChrome).toBe('function');
    expect(typeof readAutomationActions).toBe('function');
    expect(typeof writeAutomationScript).toBe('function');
  });
  it('CH-AUTO-P-2: adapter importable without Chrome extension API', () => {
    expect(mapChromeToWorkflowStep).toBeDefined();
  });
  it('CH-AUTO-P-3: package.json name matches /^@xiigen\\/chrome-/', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pkg = require('../../../adapters/chrome/FT-CH-AUTO/package.json') as { name: string };
    expect(pkg.name).toMatch(/^@xiigen\/chrome-/);
  });
  it('CH-AUTO-P-4: FT-CH-AUTO in manifest, chrome platform, MODE_B, path contains FT-CH-AUTO', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const manifest =
      require('../../../contracts/features/feature-manifest-marketplace-plugins-v1.json') as {
        features: Array<{
          ftId: string;
          portingCandidate: boolean;
          platforms: Array<{ platformId: string; adapterMode: string; adapterPath: string }>;
        }>;
      };
    const ft = manifest.features.find((f) => f.ftId === 'FT-CH-AUTO');
    expect(ft).toBeDefined();
    expect(ft!.portingCandidate).toBe(true);
    const platform = ft!.platforms.find((p) => p.platformId === 'chrome');
    expect(platform).toBeDefined();
    expect(platform!.adapterMode).toBe('MODE_B');
    expect(platform!.adapterPath).toContain('FT-CH-AUTO');
  });
});

/**
 * BootstrapAssumptionRegistryLinter — unit tests (Phase 2)
 * 8 tests covering SK-456 structural checks on session file content.
 */

import { BootstrapAssumptionRegistryLinter } from './bootstrap-assumption-registry-linter';

function makeContent(
  overrides: {
    classLabel?: string;
    verification?: string;
    fallback?: boolean;
    isNonBlocking?: boolean;
  } = {},
): string {
  const label = overrides.classLabel ?? 'BLOCKING';
  const verification = overrides.verification ?? 'Verification: `ls server/src/fabrics/`';
  const fallback = overrides.fallback !== false ? 'Fallback: run Phase 1 first' : '';
  const isNonBlocking = overrides.isNonBlocking ?? false;
  const effectiveLabel = isNonBlocking ? 'NON_BLOCKING' : label;

  return `
| A-1 | INFRA | Phase 1 complete | Verification | Fallback |
Class: ${effectiveLabel}
${verification}
${fallback}
`.trim();
}

describe('BootstrapAssumptionRegistryLinter', () => {
  let linter: BootstrapAssumptionRegistryLinter;

  beforeEach(() => {
    linter = new BootstrapAssumptionRegistryLinter();
  });

  it('should pass for well-formed content with BLOCKING label and bash verification', async () => {
    const result = await linter.lint(makeContent());
    expect(result.passed).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('should fail when class label is missing', async () => {
    const content = '| A-1 | INFRA | desc | Verification: `ls .` | Fallback: none |';
    const result = await linter.lint(content);
    expect(result.passed).toBe(false);
    expect(result.violations.some((v) => v.includes('class label missing'))).toBe(true);
  });

  it('should fail when verification command is not a bash command', async () => {
    const result = await linter.lint(
      makeContent({ verification: 'Verification: check the output manually' }),
    );
    expect(result.passed).toBe(false);
    expect(result.violations.some((v) => v.includes('not a literal bash command'))).toBe(true);
  });

  it('should pass for NON_BLOCKING with fallback specified', async () => {
    const result = await linter.lint(makeContent({ isNonBlocking: true, fallback: true }));
    expect(result.passed).toBe(true);
  });

  it('should fail for NON_BLOCKING assumption without fallback', async () => {
    const result = await linter.lint(makeContent({ isNonBlocking: true, fallback: false }));
    expect(result.passed).toBe(false);
    expect(
      result.violations.some((v) => v.includes('NON_BLOCKING assumption has no fallback')),
    ).toBe(true);
  });

  it('should accept curl as valid verification command', async () => {
    const result = await linter.lint(
      makeContent({ verification: 'Verification: `curl -sf localhost:9200/_count`' }),
    );
    expect(result.passed).toBe(true);
  });

  it('should accept npx jest as valid verification command', async () => {
    const result = await linter.lint(
      makeContent({ verification: 'Verification: `npx jest --testPathPattern=fabrics`' }),
    );
    expect(result.passed).toBe(true);
  });

  it('should return violations array (not throw) when content has multiple issues', async () => {
    const content = `
| A-1 | INFRA | desc |
no label here
Verification: manual check
| A-2 | BEHAVIORAL | desc |
Class: NON_BLOCKING
Verification: \`grep -r test .\`
`;
    const result = await linter.lint(content);
    expect(Array.isArray(result.violations)).toBe(true);
    expect(result.violations.length).toBeGreaterThan(0);
  });
});

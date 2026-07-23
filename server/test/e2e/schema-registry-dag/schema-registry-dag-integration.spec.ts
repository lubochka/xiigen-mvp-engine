/**
 * schema-registry-dag — integration contracts (INT-1 through INT-5)
 * Verifies cross-service contract integrity from fixture files.
 */
import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';

function loadContract(filename: string): Record<string, unknown> {
  return JSON.parse(
    fs.readFileSync(path.join(__dirname, '../../../../fixtures/contracts', filename), 'utf-8'),
  );
}

describe('schema-registry-dag — integration contracts', () => {
  test('INT-1: SchemaPublished fires from T194 only — not from T189', () => {
    const t189 = loadContract('t189.contract.json');
    const t194 = loadContract('t194.contract.json');
    const t189Queue = (t189['stackCoupling'] as Record<string, string[]>)['queue'];
    const t194Queue = (t194['stackCoupling'] as Record<string, string[]>)['queue'];
    expect(t189Queue).not.toContain('SchemaPublished');
    expect(t194Queue).toContain('SchemaPublished');
  });

  test('INT-2: DagRebuildCompleted is async — T192 triggered by SchemaPublished not inline', () => {
    const t189 = loadContract('t189.contract.json');
    const t194 = loadContract('t194.contract.json');
    const t189Queue = (t189['stackCoupling'] as Record<string, string[]>)['queue'];
    expect(t189Queue).not.toContain('DagRebuildCompleted');
    expect(t189Queue).not.toContain('DagTopologyRebuilt');
    const t194Queue = (t194['stackCoupling'] as Record<string, string[]>)['queue'];
    expect(t194Queue).toContain('SchemaPublished');
  });

  test('INT-3: BREAKING change full cycle — T189→T202→T194 approval chain', () => {
    const t189 = loadContract('t189.contract.json');
    const t202 = loadContract('t202.contract.json');
    const t194 = loadContract('t194.contract.json');
    const t189Queue = (t189['stackCoupling'] as Record<string, string[]>)['queue'];
    expect(t189Queue).toContain('SchemaApprovalRequired');
    const t202Queue = (t202['stackCoupling'] as Record<string, string[]>)['queue'];
    expect(t202Queue).toContain('SchemaApprovalRequired');
    expect(t202Queue).toContain('SchemaApprovalGranted');
    const t194Queue = (t194['stackCoupling'] as Record<string, string[]>)['queue'];
    expect(t194Queue).toContain('SchemaPublished');
    const ironRules = t194['ironRules'] as Array<{ rule: string }>;
    expect(
      ironRules.some((r) => r.rule.includes('BREAKING') && r.rule.includes('approvalToken')),
    ).toBe(true);
  });

  test('INT-4: Cycle detection gate — T194 not reached when T191 returns CYCLE_DETECTED', () => {
    const t189 = loadContract('t189.contract.json');
    const ironRules = t189['ironRules'] as Array<{ rule: string }>;
    expect(ironRules.some((r) => r.rule.includes('T191') && r.rule.includes('PASS'))).toBe(true);
    const queue = (t189['stackCoupling'] as Record<string, string[]>)['queue'];
    expect(queue).toContain('SchemaRejected');
    expect(queue).toContain('SchemaQueued');
  });

  test('INT-5: SchemaPublished downstream payload contains all required consumer fields', () => {
    const t194 = loadContract('t194.contract.json');
    const machineComponents = t194['machineComponents'] as string[];
    const ironRules = t194['ironRules'] as Array<{ rule: string }>;
    const hasVersionPin = machineComponents.some(
      (c) => c.includes('VERSION') || c.includes('SCHEMA_VERSION_PIN'),
    );
    const irMentionsVersion = ironRules.some(
      (r) => r.rule.includes('schemaVersion') || r.rule.includes('version'),
    );
    expect(hasVersionPin || irMentionsVersion).toBe(true);
    const t194Queue = (t194['stackCoupling'] as Record<string, string[]>)['queue'];
    expect(t194Queue).toContain('SchemaPublished');
  });
});

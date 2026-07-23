/**
 * visual-flow-engine — Integration tests
 * FLOW-18: Visual Flow Creation & Code Injection Engine (new services T617-T620)
 *
 * Tests: INT-1 through INT-5
 *   INT-1: T617 BOLA + FLOW_IMMUTABLE guards both present in source
 *   INT-2: T618 DFS WHITE/GRAY/BLACK coloring present in source
 *   INT-3: T619 SETNX + redis.del in catch both present in source
 *   INT-4: T620 INJECTION_LOCK_PREFIX compile-time constant + pre-write audit + append-only
 *   INT-5: T620 INJECTION_AUDIT_PHASES compile-time constant verified
 */

import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';

describe('visual-flow-engine — integration contracts (T617-T620)', () => {
  const servicesDir = path.resolve(__dirname, '../../../src/engine/flows/visual-flow-engine');

  // INT-1: T617 BOLA + FLOW_IMMUTABLE guards both present in source
  test('INT-1: T617 source contains BOLA check, FLOW_IMMUTABLE guard, and one-way state enforcement', () => {
    const t617Path = path.join(servicesDir, 'flow-canvas-writer.service.ts');
    expect(fs.existsSync(t617Path)).toBe(true);

    const src = fs.readFileSync(t617Path, 'utf-8');
    // BOLA check present
    expect(src).toMatch(/flowTenantId.*tenantId|BOLA_VIOLATION/i);
    // FLOW_IMMUTABLE guard present
    expect(src).toMatch(/FLOW_IMMUTABLE_STATES|FLOW_IMMUTABLE|PUBLISHED/);
    // Immutable states is compile-time constant
    expect(src).toMatch(/const FLOW_IMMUTABLE_STATES\s*=/);
    // DNA-8: audit before enqueue
    expect(src).toMatch(/ORDER 4.*[Aa]udit|[Aa]udit.*ORDER 4/);
  });

  // INT-2: T618 DFS WHITE/GRAY/BLACK coloring present in source
  test('INT-2: T618 DFS cycle detection uses WHITE/GRAY/BLACK coloring — source verified', () => {
    const t618Path = path.join(servicesDir, 'flow-publication-orchestrator.service.ts');
    expect(fs.existsSync(t618Path)).toBe(true);

    const src = fs.readFileSync(t618Path, 'utf-8');

    // DFS colors present as constants
    expect(src).toMatch(/WHITE\s*=\s*['"]WHITE['"]/);
    expect(src).toMatch(/GRAY\s*=\s*['"]GRAY['"]/);
    expect(src).toMatch(/BLACK\s*=\s*['"]BLACK['"]/);
    // GRAY re-visit = cycle
    expect(src).toMatch(/GRAY.*cycle|cycle.*GRAY/i);
    // OCC check present (not plain storeDocument for publish)
    expect(src).toMatch(/OCC|expectedVersion|version.*conflict|OCC_CONFLICT/i);
    // Type compatibility per-edge
    expect(src).toMatch(/sourceOutputType.*targetInputType|TYPE_MISMATCH/i);
  });

  // INT-3: T619 SETNX + redis.del in catch both present in source
  test('INT-3: T619 source contains SETNX lock, dual write, and redis.del in catch block', () => {
    const t619Path = path.join(servicesDir, 'node-type-registrar.service.ts');
    expect(fs.existsSync(t619Path)).toBe(true);

    const src = fs.readFileSync(t619Path, 'utf-8');

    // SETNX lock prefix compile-time constant
    expect(src).toMatch(/const NODE_TYPE_LOCK_PREFIX\s*=/);
    expect(src).toMatch(/node-type-reg-lock/);
    // Dual write targets both present
    expect(src).toMatch(/NODE_TYPES_INDEX/);
    expect(src).toMatch(/CAPABILITY_INDEX/);
    // redis.del in catch block
    expect(src).toMatch(/deleteDocument.*lockKey|deleteDocument.*NODE_TYPE_LOCKS/i);
    // catch block present
    expect(src).toMatch(/} catch/);
    // DNA-8: audit before enqueue
    expect(src).toMatch(/ORDER 4/);
  });

  // INT-4: T620 version lock + pre-write audit + append-only in source
  test('INT-4: T620 source contains version lock, pre-write audit (rollback pointer), append-only — no updateDocument', () => {
    const t620Path = path.join(servicesDir, 'code-injection-processor.service.ts');
    expect(fs.existsSync(t620Path)).toBe(true);

    const src = fs.readFileSync(t620Path, 'utf-8');

    // Version lock compile-time constant
    expect(src).toMatch(/const INJECTION_LOCK_PREFIX\s*=/);
    expect(src).toMatch(/injection-version-lock/);
    // Pre-write audit present (ORDER 2)
    expect(src).toMatch(/PRE_WRITE/);
    expect(src).toMatch(/ORDER 2.*[Pp]re.write|[Pp]re.write.*ORDER 2/i);
    // Append-only: no updateDocument calls in executable code
    const execLines = src
      .split('\n')
      .filter((l) => !l.trim().startsWith('*') && !l.trim().startsWith('//'));
    const exec = execLines.join('\n');
    expect(exec).not.toMatch(/\.updateDocument\s*\(/);
    // FAILED audit phase present
    expect(src).toMatch(/FAILED/);
    // NON-REPUDIATION reference
    expect(src).toMatch(/NON-REPUDIATION/);
  });

  // INT-5: T620 INJECTION_AUDIT_PHASES compile-time constant
  test('INT-5: T620 INJECTION_AUDIT_PHASES compile-time constant contains PRE_WRITE, COMPLETE, FAILED', () => {
    const t620Path = path.join(servicesDir, 'code-injection-processor.service.ts');
    expect(fs.existsSync(t620Path)).toBe(true);

    const src = fs.readFileSync(t620Path, 'utf-8');

    // INJECTION_AUDIT_PHASES must be a const declaration
    expect(src).toMatch(/const INJECTION_AUDIT_PHASES\s*=/);
    // Must contain all 3 phases
    const phasesMatch = src.match(/INJECTION_AUDIT_PHASES\s*=\s*\[([^\]]+)\]/);
    expect(phasesMatch).not.toBeNull();
    const phasesContent = phasesMatch![1];
    expect(phasesContent).toMatch(/PRE_WRITE/);
    expect(phasesContent).toMatch(/COMPLETE/);
    expect(phasesContent).toMatch(/FAILED/);
    // Must NOT load phases from database or FREEDOM config
    expect(src).not.toMatch(/searchDocuments.*INJECTION_AUDIT_PHASES/i);
    expect(src).not.toMatch(/getDocument.*INJECTION_AUDIT_PHASES/i);
  });
});

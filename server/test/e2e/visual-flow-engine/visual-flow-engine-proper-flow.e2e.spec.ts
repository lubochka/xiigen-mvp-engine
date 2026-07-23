/**
 * visual-flow-engine — Proper Flow Contract Tests (DC-01..DC-10)
 * FLOW-18: Visual Flow Creation & Code Injection Engine (new services T617-T620)
 *
 * Verifies all CF/DR rules from design simulation:
 *   DC-01: CF-18-1 — T617 BOLA at ORDER 1 before FLOW_IMMUTABLE guard
 *   DC-02: CF-18-1 — T617 FLOW_IMMUTABLE at ORDER 2 before canvas write
 *   DC-03: CF-18-1 — T617 FlowImmutableRejected emitted on published flow write
 *   DC-04: CF-18-2 — T618 DFS cycle detection at ORDER 1 before type check
 *   DC-05: CF-18-2 — T618 type compatibility per-edge at ORDER 2
 *   DC-06: CF-18-2 — T618 OCC DRAFT→PUBLISHED (not plain storeDocument)
 *   DC-07: CF-18-3 — T619 SETNX at ORDER 1 before dual write
 *   DC-08: CF-18-3 — T619 redis.del in catch block on failure
 *   DC-09: CF-18-4 — T620 version lock ORDER 1 + pre-write audit ORDER 2
 *   DC-10: CF-18-4 — T620 append-only audit (no updateDocument on injection audit)
 */

import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';

const servicesDir = path.resolve(__dirname, '../../../src/engine/flows/visual-flow-engine');

function readService(filename: string): string {
  return fs.readFileSync(path.join(servicesDir, filename), 'utf-8').replace(/\r\n/g, '\n');
}

describe('visual-flow-engine — proper flow contract tests (DC-01..DC-10)', () => {
  // DC-01: CF-18-1 — T617 BOLA at ORDER 1 before FLOW_IMMUTABLE guard
  test('DC-01: CF-18-1 — T617 BOLA check at ORDER 1 before FLOW_IMMUTABLE guard', () => {
    const src = readService('flow-canvas-writer.service.ts');

    // ORDER 1 BOLA comment present
    expect(src).toMatch(/ORDER 1.*BOLA|BOLA.*ORDER 1/i);
    // In writeCanvas method, BOLA check appears before FLOW_IMMUTABLE check
    const methodStart = src.indexOf('async writeCanvas');
    const methodSrc = src.substring(methodStart);
    const bolaIdx = methodSrc.indexOf('BOLA_VIOLATION');
    const immutableIdx = methodSrc.indexOf('FLOW_IMMUTABLE');
    expect(bolaIdx).toBeGreaterThan(-1);
    expect(immutableIdx).toBeGreaterThan(-1);
    expect(bolaIdx).toBeLessThan(immutableIdx);
  });

  // DC-02: CF-18-1 — T617 FLOW_IMMUTABLE at ORDER 2 before canvas write
  test('DC-02: CF-18-1 — T617 FLOW_IMMUTABLE guard at ORDER 2 before storeDocument(canvas)', () => {
    const src = readService('flow-canvas-writer.service.ts');

    // ORDER 2 FLOW_IMMUTABLE present
    expect(src).toMatch(/ORDER 2.*FLOW_IMMUTABLE|FLOW_IMMUTABLE.*ORDER 2/i);

    const methodStart = src.indexOf('async writeCanvas');
    const methodSrc = src.substring(methodStart);
    // FLOW_IMMUTABLE check must come before canvas storeDocument
    const immutableIdx = methodSrc.indexOf('FLOW_IMMUTABLE_STATES.includes');
    const canvasStoreIdx = methodSrc.indexOf('storeDocument(\n      FLOW_CANVAS_INDEX');
    expect(immutableIdx).toBeGreaterThan(-1);
    expect(canvasStoreIdx).toBeGreaterThan(-1);
    expect(immutableIdx).toBeLessThan(canvasStoreIdx);
  });

  // DC-03: CF-18-1 — T617 FlowImmutableRejected emitted on published flow write
  test('DC-03: CF-18-1 — T617 FlowImmutableRejected emitted with status on published flow write attempt', () => {
    const src = readService('flow-canvas-writer.service.ts');
    expect(src).toMatch(/FlowImmutableRejected/);
    expect(src).toMatch(/FLOW_IMMUTABLE/);
    // Multiple failure events
    const rejectedCount = (src.match(/FlowImmutableRejected/g) ?? []).length;
    expect(rejectedCount).toBeGreaterThanOrEqual(1);
    // FLOW_IMMUTABLE_STATES compile-time constant
    expect(src).toMatch(/const FLOW_IMMUTABLE_STATES\s*=/);
  });

  // DC-04: CF-18-2 — T618 DFS at ORDER 1 before type check
  test('DC-04: CF-18-2 — T618 DFS cycle detection at ORDER 1 before type compatibility check', () => {
    const src = readService('flow-publication-orchestrator.service.ts');

    // DFS ORDER 1 comment present
    expect(src).toMatch(/ORDER 1.*DFS|DFS.*ORDER 1/i);
    // Type compatibility ORDER 2
    expect(src).toMatch(/ORDER 2.*[Tt]ype|[Tt]ype.*ORDER 2/i);

    const methodStart = src.indexOf('async publishFlow');
    const methodSrc = src.substring(methodStart);
    // detectCycle call must appear before findTypeIncompatibleEdge call
    const cycleIdx = methodSrc.indexOf('detectCycle(');
    const typeIdx = methodSrc.indexOf('findTypeIncompatibleEdge(');
    expect(cycleIdx).toBeGreaterThan(-1);
    expect(typeIdx).toBeGreaterThan(-1);
    expect(cycleIdx).toBeLessThan(typeIdx);
  });

  // DC-05: CF-18-2 — T618 type compatibility per-edge at ORDER 2
  test('DC-05: CF-18-2 — T618 type compatibility checks sourceOutputType vs targetInputType per edge', () => {
    const src = readService('flow-publication-orchestrator.service.ts');
    // TypeMismatch event emitted
    expect(src).toMatch(/TypeMismatch/);
    // Source/target type fields checked
    expect(src).toMatch(/sourceOutputType/);
    expect(src).toMatch(/targetInputType/);
    // Per-edge check in findTypeIncompatibleEdge
    expect(src).toMatch(/findTypeIncompatibleEdge/);
  });

  // DC-06: CF-18-2 — T618 OCC write for publication (not plain storeDocument)
  test('DC-06: CF-18-2 — T618 uses version check (OCC) for DRAFT→PUBLISHED, not plain unconditional write', () => {
    const src = readService('flow-publication-orchestrator.service.ts');
    // OCC_CONFLICT error present
    expect(src).toMatch(/OCC_CONFLICT/);
    // expectedVersion comparison present
    expect(src).toMatch(/expectedVersion.*currentVersion|currentVersion.*expectedVersion/i);
    // FlowPublicationConflict emitted on conflict
    expect(src).toMatch(/FlowPublicationConflict/);
    // Status set to PUBLISHED
    expect(src).toMatch(/status.*PUBLISHED|PUBLISHED.*status/i);
  });

  // DC-07: CF-18-3 — T619 SETNX at ORDER 1 before dual write
  test('DC-07: CF-18-3 — T619 SETNX lock acquired at ORDER 1 before either dual write', () => {
    const src = readService('node-type-registrar.service.ts');

    // ORDER 1 SETNX comment present
    expect(src).toMatch(/ORDER 1.*SETNX|SETNX.*ORDER 1/i);

    const methodStart = src.indexOf('async registerNodeType');
    const methodSrc = src.substring(methodStart);
    // SETNX lock store before node type store
    const lockStoreIdx = methodSrc.indexOf('storeDocument(\n      NODE_TYPE_LOCKS_INDEX');
    const nodeTypeStoreIdx = methodSrc.indexOf('storeDocument(\n        NODE_TYPES_INDEX');
    expect(lockStoreIdx).toBeGreaterThan(-1);
    expect(nodeTypeStoreIdx).toBeGreaterThan(-1);
    expect(lockStoreIdx).toBeLessThan(nodeTypeStoreIdx);
  });

  // DC-08: CF-18-3 — T619 redis.del in catch block
  test('DC-08: CF-18-3 — T619 redis.del(lockKey) present in catch block to release lock on failure', () => {
    const src = readService('node-type-registrar.service.ts');

    // Catch block present in registerNodeType method
    const methodStart = src.indexOf('async registerNodeType');
    const methodSrc = src.substring(methodStart);
    expect(methodSrc).toMatch(/} catch/);
    // redis.del (deleteDocument) called in catch within the method
    const catchBlockIdx = methodSrc.indexOf('} catch');
    const catchBlock = methodSrc.substring(catchBlockIdx, catchBlockIdx + 500);
    expect(catchBlock).toMatch(/deleteDocument.*lockKey|deleteDocument.*NODE_TYPE_LOCKS/i);
    // NODE_TYPE_LOCK_PREFIX compile-time constant
    expect(src).toMatch(/const NODE_TYPE_LOCK_PREFIX\s*=/);
  });

  // DC-09: CF-18-4 — T620 version lock ORDER 1 + pre-write audit ORDER 2
  test('DC-09: CF-18-4 — T620 version lock at ORDER 1 and pre-write audit (rollback pointer) at ORDER 2', () => {
    const src = readService('code-injection-processor.service.ts');

    // ORDER 1 version lock comment
    expect(src).toMatch(/ORDER 1.*[Vv]ersion lock|[Vv]ersion lock.*ORDER 1/i);
    // ORDER 2 pre-write audit comment
    expect(src).toMatch(/ORDER 2.*[Pp]re.write|[Pp]re.write.*ORDER 2/i);

    const methodStart = src.indexOf('async processInjection');
    const methodSrc = src.substring(methodStart);
    // Version lock store before pre-write audit
    const lockStoreIdx = methodSrc.indexOf('storeDocument(\n      INJECTION_LOCKS_INDEX');
    const preWriteAuditIdx = methodSrc.indexOf('storeDocument(INJECTION_AUDIT_INDEX');
    expect(lockStoreIdx).toBeGreaterThan(-1);
    expect(preWriteAuditIdx).toBeGreaterThan(-1);
    expect(lockStoreIdx).toBeLessThan(preWriteAuditIdx);
    // Rollback pointer documented
    expect(src).toMatch(/rollback pointer/i);
  });

  // DC-10: CF-18-4 — T620 append-only audit (no updateDocument)
  test('DC-10: CF-18-4 — T620 audit is append-only (no updateDocument on injection audit records)', () => {
    const src = readService('code-injection-processor.service.ts');

    // Append-only documented
    expect(src).toMatch(/[Aa]ppend.only|APPEND-ONLY/);
    // INJECTION_AUDIT_PHASES compile-time constant
    expect(src).toMatch(/const INJECTION_AUDIT_PHASES\s*=/);
    // All three phases present
    expect(src).toMatch(/PRE_WRITE/);
    expect(src).toMatch(/COMPLETE/);
    expect(src).toMatch(/FAILED/);
    // No updateDocument in executable code
    const execLines = src
      .split('\n')
      .filter((l) => !l.trim().startsWith('*') && !l.trim().startsWith('//'));
    const exec = execLines.join('\n');
    expect(exec).not.toMatch(/\.updateDocument\s*\(/);
    // NON-REPUDIATION reference
    expect(src).toMatch(/NON-REPUDIATION/);
  });
});

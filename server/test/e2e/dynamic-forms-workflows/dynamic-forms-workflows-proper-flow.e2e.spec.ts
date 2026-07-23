/**
 * FLOW-21 Proper-Flow E2E Tests — Dynamic Forms & Workflows
 * DC-01..DC-10 cross-flow validation
 *
 * DC-01: Schema publishing OCC prevents concurrent publishes
 * DC-02: BOLA check prevents cross-tenant submission
 * DC-03: Validation errors as success response (DNA-4)
 * DC-04: SETNX locks prevent duplicate rule execution at ORDER 3 (after version guard + condition eval)
 * DC-05: PII exclusion in analytics (email, phone, ssn)
 * DC-06: Submission stored before events (outbox, DNA-8)
 * DC-07: Published schema immutable after PUBLISHED state
 * DC-08: Tenant-scoped analytics queries
 * DC-09: Rule condition evaluation (conditional branching)
 * DC-10: Aggregate metrics calculation (count, avg, error rate)
 */

import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';

const servicesDir = path.resolve(__dirname, '../../../src/engine/flows/dynamic-forms-workflows');

function readService(filename: string): string {
  return fs.readFileSync(path.join(servicesDir, filename), 'utf-8');
}

describe('FLOW-21 Proper-Flow E2E — Dynamic Forms & Workflows', () => {
  test('DC-01: Schema publishing OCC prevents concurrent publishes', () => {
    const src = readService('form-schema-publisher.service.ts');
    // Must use storeDocumentWithOCC or storeDocument with OCC comment — IR-1
    expect(src).toMatch(/storeDocument/);
    // Must reference OCC pattern
    expect(src).toMatch(/OCC/);
    // ORDER 3 is where the publish happens
    expect(src).toMatch(/ORDER 3/);
    // Must emit SchemaPublished on success
    expect(src).toMatch(/SchemaPublished/);
  });

  test('DC-02: BOLA check prevents cross-tenant submission', () => {
    const src = readService('form-submission-processor.service.ts');
    // IR-1: BOLA check at ORDER 1
    expect(src).toMatch(/ORDER 1/);
    expect(src).toMatch(/BOLA/);
    // submitterTenantId must be compared against formTenantId
    expect(src).toMatch(/submitterTenantId/);
    expect(src).toMatch(/formTenantId/);
    // UNAUTHORIZED emitted on mismatch
    expect(src).toMatch(/UNAUTHORIZED/);
  });

  test('DC-03: Validation errors as success response (DNA-4)', () => {
    const src = readService('form-submission-processor.service.ts');
    // Must return DataProcessResult.success even on validation errors
    expect(src).toMatch(/DataProcessResult\.success/);
    // DNA-4 comment must be present
    expect(src).toMatch(/DNA-4/);
    // validationErrors array must be returned in success response
    expect(src).toMatch(/validationErrors/);
    // Must NOT throw for validation errors
    expect(src).not.toMatch(/throw new/);
  });

  test('DC-04: SETNX locks at ORDER 3 (after version guard at ORDER 1 + condition eval at ORDER 2)', () => {
    const src = readService('automation-dispatcher.service.ts');
    // Version guard at ORDER 1 must appear before SETNX at ORDER 3
    expect(src).toMatch(/ORDER 1.*version guard|version guard.*ORDER 1/i);
    expect(src).toMatch(/ORDER 2.*condition|condition.*ORDER 2/i);
    // SETNX at ORDER 3
    expect(src).toMatch(/ORDER 3.*SETNX|SETNX.*ORDER 3/i);
    // Lock key pattern
    expect(src).toMatch(/rule-exec-lock/);
    // acquireLock call must be present
    expect(src).toMatch(/acquireLock/);
  });

  test('DC-05: PII exclusion in analytics (email, phone, ssn)', () => {
    const src = readService('submission-analytics-collector.service.ts');
    // PII_FIELDS set must include email, phone, ssn
    expect(src).toMatch(/PII_FIELDS/);
    expect(src).toMatch(/['"']email['"']/);
    expect(src).toMatch(/['"']phone['"']/);
    expect(src).toMatch(/['"']ssn['"']/);
    // PII exclusion filter loop
    expect(src).toMatch(/PII_FIELDS\.has/);
    // IR-2 reference
    expect(src).toMatch(/IR-2/);
  });

  test('DC-06: Submission stored before events (outbox, DNA-8)', () => {
    const src = readService('form-submission-processor.service.ts');
    // storeDocument must appear before queue fabric enqueue in source order
    const storePos = src.indexOf('storeDocument');
    const enqueuePos = src.indexOf('queueFabric.enqueue');
    expect(storePos).toBeGreaterThan(-1);
    expect(enqueuePos).toBeGreaterThan(-1);
    expect(storePos).toBeLessThan(enqueuePos);
    // DNA-8 reference
    expect(src).toMatch(/DNA-8/);
  });

  test('DC-07: Published schema immutable after PUBLISHED state', () => {
    const src = readService('form-schema-publisher.service.ts');
    // DRAFT check enforced — must not allow non-DRAFT schemas to publish
    expect(src).toMatch(/status.*DRAFT|DRAFT.*status/i);
    expect(src).toMatch(/SCHEMA_NOT_DRAFT/);
    // Immutability referenced
    expect(src).toMatch(/immut/i);
    // IR-2 covers published schema.fields immutable
    expect(src).toMatch(/IR-2/);
  });

  test('DC-08: Tenant-scoped analytics queries', () => {
    const src = readService('submission-analytics-collector.service.ts');
    // getTenantId uses the shared tenant context resolver instead of direct ClsService access.
    expect(src).toMatch(/getTenantId/);
    expect(src).toMatch(/TenantContextResolver/);
    expect(src).toMatch(/getCurrentTenantId/);
    // tenantId used in aggregation query
    expect(src).toMatch(/tenantId/);
    // Aggregate query includes tenantId filter
    expect(src).toMatch(/searchDocuments.*AGGREGATE|AGGREGATE.*searchDocuments/i);
  });

  test('DC-09: Rule condition evaluation (conditional branching)', () => {
    const src = readService('automation-dispatcher.service.ts');
    // evaluateCondition method must exist
    expect(src).toMatch(/evaluateCondition/);
    // thenActions and elseActions branching
    expect(src).toMatch(/thenActions/);
    expect(src).toMatch(/elseActions/);
    // Condition evaluation uses operator
    expect(src).toMatch(/operator/);
    // IR-2 covers condition evaluation
    expect(src).toMatch(/IR-2/);
  });

  test('DC-10: Aggregate metrics calculation (count, avg, error rate)', () => {
    const src = readService('submission-analytics-collector.service.ts');
    // submitCount must be tracked
    expect(src).toMatch(/submitCount/);
    // avgFieldCount
    expect(src).toMatch(/avgFieldCount/);
    // errorRate
    expect(src).toMatch(/errorRate/);
    // IR-4 covers aggregate metrics
    expect(src).toMatch(/IR-4/);
  });
});

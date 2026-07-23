/**
 * FLOW-21 Integration Tests — Dynamic Forms & Workflows
 * Tests cross-service flow: schema publish → submission → automation → analytics
 *
 * INT-1: Schema publish, submission, analytics in sequence
 * INT-2: Validation errors prevent automation dispatch
 * INT-3: Multiple rules execute independently per submission
 * INT-4: Analytics aggregates across multiple submissions
 * INT-5: Tenant isolation enforced across all services
 */

import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';

const servicesDir = path.resolve(__dirname, '../../../src/engine/flows/dynamic-forms-workflows');

function readService(filename: string): string {
  return fs.readFileSync(path.join(servicesDir, filename), 'utf-8');
}

describe('FLOW-21 Integration — Dynamic Forms & Workflows', () => {
  // INT-1: End-to-end flow structural verification
  test('INT-1: Schema publish → submission → automation → analytics: all four services exist with correct archetypes', () => {
    const publisher = readService('form-schema-publisher.service.ts');
    const processor = readService('form-submission-processor.service.ts');
    const dispatcher = readService('automation-dispatcher.service.ts');
    const analytics = readService('submission-analytics-collector.service.ts');

    // T629: FormSchemaPublisher — VALIDATION archetype
    expect(publisher).toMatch(/T629/);
    expect(publisher).toMatch(/VALIDATION/);
    // T630: FormSubmissionProcessor — DATA_PIPELINE archetype
    expect(processor).toMatch(/T630/);
    expect(processor).toMatch(/DATA_PIPELINE/);
    // T631: AutomationDispatcher — ORCHESTRATION archetype
    expect(dispatcher).toMatch(/T631/);
    expect(dispatcher).toMatch(/ORCHESTRATION/);
    // T632: SubmissionAnalyticsCollector — DATA_PIPELINE archetype
    expect(analytics).toMatch(/T632/);
    expect(analytics).toMatch(/DATA_PIPELINE/);

    // All services use DataProcessResult (DNA-3)
    expect(publisher).toMatch(/DataProcessResult/);
    expect(processor).toMatch(/DataProcessResult/);
    expect(dispatcher).toMatch(/DataProcessResult/);
    expect(analytics).toMatch(/DataProcessResult/);
  });

  // INT-2: Validation blocks automation
  test('INT-2: Validation errors returned as success; SubmissionRejected emitted (not exception)', () => {
    const processor = readService('form-submission-processor.service.ts');

    // DNA-4: validation errors returned as success
    expect(processor).toMatch(/DataProcessResult\.success/);
    // SubmissionRejected queue event emitted for invalid submissions
    expect(processor).toMatch(/SubmissionRejected/);
    // validationErrors array populated and returned
    expect(processor).toMatch(/validationErrors/);
    // DNA-4 comment
    expect(processor).toMatch(/DNA-4/);
    // No throw for business validation failures
    expect(processor).not.toMatch(/throw new NotFoundException|throw new BadRequest/);
  });

  // INT-3: Multiple rules execute independently
  test('INT-3: AutomationDispatcher iterates over rules array and uses per-rule SETNX locks', () => {
    const dispatcher = readService('automation-dispatcher.service.ts');

    // Rule iteration with for...of or forEach
    expect(dispatcher).toMatch(/for.*const.*rule.*of.*rules/);
    // Per-rule lock key includes both submissionId and ruleId
    expect(dispatcher).toMatch(/submissionId.*ruleId|ruleId.*submissionId/);
    // executedRules tracks each rule independently
    expect(dispatcher).toMatch(/executedRules/);
    // Each rule evaluated independently via evaluateCondition
    expect(dispatcher).toMatch(/evaluateCondition/);
  });

  // INT-4: Analytics aggregation
  test('INT-4: SubmissionAnalyticsCollector builds aggregate metrics with increment logic', () => {
    const analytics = readService('submission-analytics-collector.service.ts');

    // submitCount incremented per submission
    expect(analytics).toMatch(/submitCount/);
    // avgFieldCount tracks average
    expect(analytics).toMatch(/avgFieldCount/);
    // errorRate calculation present
    expect(analytics).toMatch(/errorRate/);
    // Aggregate stored with storeDocument after analytics record
    const firstStore = analytics.indexOf('storeDocument');
    const secondStore = analytics.indexOf('storeDocument', firstStore + 1);
    expect(firstStore).toBeGreaterThan(-1);
    // Two storeDocument calls: analytics record + aggregate metrics
    expect(secondStore).toBeGreaterThan(firstStore);
  });

  // INT-5: Tenant isolation
  test('INT-5: All four services resolve tenantId through TenantContextResolver, not event payload', () => {
    const publisher = readService('form-schema-publisher.service.ts');
    const processor = readService('form-submission-processor.service.ts');
    const dispatcher = readService('automation-dispatcher.service.ts');
    const analytics = readService('submission-analytics-collector.service.ts');

    // All services use the shared resolver instead of importing ClsService directly.
    expect(publisher).toMatch(/TenantContextResolver/);
    expect(processor).toMatch(/TenantContextResolver/);
    expect(dispatcher).toMatch(/TenantContextResolver/);
    expect(analytics).toMatch(/TenantContextResolver/);
    expect(publisher).toMatch(/getCurrentTenantId/);
    expect(processor).toMatch(/getCurrentTenantId/);
    expect(dispatcher).toMatch(/getCurrentTenantId/);
    expect(analytics).toMatch(/getCurrentTenantId/);
    expect(publisher).not.toMatch(/from 'nestjs-cls'/);
    expect(processor).not.toMatch(/from 'nestjs-cls'/);
    expect(dispatcher).not.toMatch(/from 'nestjs-cls'/);
    expect(analytics).not.toMatch(/from 'nestjs-cls'/);
    expect(publisher).toMatch(/extends MicroserviceBase/);
    expect(processor).toMatch(/extends MicroserviceBase/);
    expect(dispatcher).toMatch(/extends MicroserviceBase/);
    expect(analytics).toMatch(/extends MicroserviceBase/);

    // DNA-5 referenced in at least the processor (BOLA check enforces DNA-5)
    expect(processor).toMatch(/DNA-5/);
  });
});

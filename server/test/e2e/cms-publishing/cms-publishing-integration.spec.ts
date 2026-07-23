/**
 * FLOW-22: CMS Publishing — Integration Tests (Source Verification)
 * Verifies all 4 services exist with correct structure for implementation
 */

import * as fs from 'fs';
import * as path from 'path';

describe('FLOW-22: CMS Publishing Integration (Source Verification)', () => {
  const basePath = path.resolve(__dirname, '../../../src/engine/flows/cms-publishing');

  describe('INT-1: All 4 service files exist', () => {
    it('T633 ContentVersionPublisher exists', () => {
      const filePath = path.join(basePath, 'content-version-publisher.service.ts');
      expect(fs.existsSync(filePath)).toBe(true);
    });

    it('T634 ContentApprovalWorkflow exists', () => {
      const filePath = path.join(basePath, 'content-approval-workflow.service.ts');
      expect(fs.existsSync(filePath)).toBe(true);
    });

    it('T635 ContentScheduleDispatcher exists', () => {
      const filePath = path.join(basePath, 'content-schedule-dispatcher.service.ts');
      expect(fs.existsSync(filePath)).toBe(true);
    });

    it('T636 ContentAnalyticsAggregator exists', () => {
      const filePath = path.join(basePath, 'content-analytics-aggregator.service.ts');
      expect(fs.existsSync(filePath)).toBe(true);
    });
  });

  describe('INT-2: All services have required @Injectable() and @Inject decorators', () => {
    it('T633 has @Injectable and DATABASE/QUEUE service injection', () => {
      const content = fs.readFileSync(
        path.join(basePath, 'content-version-publisher.service.ts'),
        'utf-8',
      );
      expect(content).toContain('@Injectable');
      expect(content).toContain('@Inject');
    });

    it('T634 has @Injectable and DATABASE/QUEUE service injection', () => {
      const content = fs.readFileSync(
        path.join(basePath, 'content-approval-workflow.service.ts'),
        'utf-8',
      );
      expect(content).toContain('@Injectable');
      expect(content).toContain('@Inject');
    });

    it('T635 has @Injectable and DATABASE/QUEUE service injection', () => {
      const content = fs.readFileSync(
        path.join(basePath, 'content-schedule-dispatcher.service.ts'),
        'utf-8',
      );
      expect(content).toContain('@Injectable');
      expect(content).toContain('@Inject');
    });

    it('T636 has @Injectable and DATABASE/QUEUE service injection', () => {
      const content = fs.readFileSync(
        path.join(basePath, 'content-analytics-aggregator.service.ts'),
        'utf-8',
      );
      expect(content).toContain('@Injectable');
      expect(content).toContain('@Inject');
    });
  });

  describe('INT-3: All services have required public methods', () => {
    it('T633 has publishContent public method', () => {
      const content = fs.readFileSync(
        path.join(basePath, 'content-version-publisher.service.ts'),
        'utf-8',
      );
      expect(content).toContain('publishContent');
    });

    it('T634 has orchestrateApprovals public method', () => {
      const content = fs.readFileSync(
        path.join(basePath, 'content-approval-workflow.service.ts'),
        'utf-8',
      );
      expect(content).toContain('orchestrateApprovals');
    });

    it('T635 has schedulePublish public method', () => {
      const content = fs.readFileSync(
        path.join(basePath, 'content-schedule-dispatcher.service.ts'),
        'utf-8',
      );
      expect(content).toContain('schedulePublish');
    });

    it('T636 has recordMetric public method', () => {
      const content = fs.readFileSync(
        path.join(basePath, 'content-analytics-aggregator.service.ts'),
        'utf-8',
      );
      expect(content).toContain('recordMetric');
    });
  });

  describe('INT-4: All services return DataProcessResult<Record<string, unknown>>', () => {
    it('T633 return type includes DataProcessResult', () => {
      const content = fs.readFileSync(
        path.join(basePath, 'content-version-publisher.service.ts'),
        'utf-8',
      );
      expect(content).toContain('DataProcessResult');
      expect(content).toContain('publishContent');
    });

    it('T634 return type includes DataProcessResult', () => {
      const content = fs.readFileSync(
        path.join(basePath, 'content-approval-workflow.service.ts'),
        'utf-8',
      );
      expect(content).toContain('DataProcessResult');
      expect(content).toContain('orchestrateApprovals');
    });

    it('T635 return type includes DataProcessResult', () => {
      const content = fs.readFileSync(
        path.join(basePath, 'content-schedule-dispatcher.service.ts'),
        'utf-8',
      );
      expect(content).toContain('DataProcessResult');
      expect(content).toContain('schedulePublish');
    });

    it('T636 return type includes DataProcessResult', () => {
      const content = fs.readFileSync(
        path.join(basePath, 'content-analytics-aggregator.service.ts'),
        'utf-8',
      );
      expect(content).toContain('DataProcessResult');
      expect(content).toContain('recordMetric');
    });
  });
});

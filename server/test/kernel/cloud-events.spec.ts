/**
 * Tests for DNA-9: CloudEvents
 * Ported from Python: tests/unit/test_cloud_events_and_controller.py (cloud events portion)
 */

import {
  createCloudEvent,
  validateCloudEvent,
  serializeCloudEvent,
  deserializeCloudEvent,
  extractEventData,
} from '../../src/kernel';

describe('CloudEvents (DNA-9)', () => {
  describe('createCloudEvent', () => {
    it('should create a valid CloudEvents v1.0 event', () => {
      const event = createCloudEvent({
        eventType: 'xiigen.flow.started',
        source: '/xiigen/flow-engine',
        data: { flow_id: 'F-001' },
        tenantId: 'T-001',
      });

      expect(event['specversion']).toBe('1.0');
      expect(event['type']).toBe('xiigen.flow.started');
      expect(event['tenantid']).toBe('T-001');
      expect((event['data'] as any).flow_id).toBe('F-001');
      expect(event['id']).toBeDefined();
      expect(event['time']).toBeDefined();
      expect(event['datacontenttype']).toBe('application/json');
    });

    it('should include source with tenant_id', () => {
      const event = createCloudEvent({
        eventType: 'test',
        source: '/xiigen/engine',
        data: {},
        tenantId: 'T-001',
      });
      expect(event['source']).toBe('/xiigen/engine/T-001');
    });

    it('should use provided correlation_id', () => {
      const event = createCloudEvent({
        eventType: 'test',
        source: '/test',
        data: {},
        tenantId: 'T-001',
        correlationId: 'COR-123',
      });
      expect(event['correlationid']).toBe('COR-123');
    });

    it('should auto-generate correlation_id from event id', () => {
      const event = createCloudEvent({
        eventType: 'test',
        source: '/test',
        data: {},
        tenantId: 'T-001',
      });
      expect(event['correlationid']).toBe(event['id']);
    });

    it('should include subject when provided', () => {
      const event = createCloudEvent({
        eventType: 'test',
        source: '/test',
        data: {},
        tenantId: 'T-001',
        subject: 'flow-123',
      });
      expect(event['subject']).toBe('flow-123');
    });

    it('should omit subject when not provided', () => {
      const event = createCloudEvent({
        eventType: 'test',
        source: '/test',
        data: {},
        tenantId: 'T-001',
      });
      expect(event['subject']).toBeUndefined();
    });

    it('should generate unique IDs', () => {
      const e1 = createCloudEvent({ eventType: 'a', source: '/a', data: {}, tenantId: 'T' });
      const e2 = createCloudEvent({ eventType: 'b', source: '/b', data: {}, tenantId: 'T' });
      expect(e1['id']).not.toBe(e2['id']);
    });
  });

  describe('validateCloudEvent', () => {
    it('should validate a correct event', () => {
      const event = createCloudEvent({
        eventType: 'test',
        source: '/test',
        data: {},
        tenantId: 'T-001',
      });
      const [isValid, errors] = validateCloudEvent(event);
      expect(isValid).toBe(true);
      expect(errors.length).toBe(0);
    });

    it('should detect missing required fields', () => {
      const [isValid, errors] = validateCloudEvent({ specversion: '1.0' });
      expect(isValid).toBe(false);
      expect(errors.some((e) => e.includes('id'))).toBe(true);
      expect(errors.some((e) => e.includes('type'))).toBe(true);
      expect(errors.some((e) => e.includes('source'))).toBe(true);
    });

    it('should detect missing tenantid (DNA-5 extension)', () => {
      const event = { specversion: '1.0', id: '1', type: 't', source: 's' };
      const [isValid, errors] = validateCloudEvent(event);
      expect(isValid).toBe(false);
      expect(errors.some((e) => e.includes('tenantid'))).toBe(true);
    });

    it('should detect wrong specversion', () => {
      const event = { specversion: '2.0', id: '1', type: 't', source: 's', tenantid: 'T' };
      const [isValid, errors] = validateCloudEvent(event);
      expect(isValid).toBe(false);
      expect(errors.some((e) => e.includes('specversion'))).toBe(true);
    });

    it('should validate empty object', () => {
      const [isValid, errors] = validateCloudEvent({});
      expect(isValid).toBe(false);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('serialize / deserialize roundtrip', () => {
    it('should roundtrip through JSON', () => {
      const event = createCloudEvent({
        eventType: 'test',
        source: '/test',
        data: { key: 'val', nested: { a: 1 } },
        tenantId: 'T-001',
      });
      const serialized = serializeCloudEvent(event);
      const deserialized = deserializeCloudEvent(serialized);

      expect(deserialized['type']).toBe('test');
      expect((deserialized['data'] as any).key).toBe('val');
      expect((deserialized['data'] as any).nested.a).toBe(1);
      expect(deserialized['tenantid']).toBe('T-001');
    });

    it('should handle Buffer input', () => {
      const event = createCloudEvent({
        eventType: 'test',
        source: '/test',
        data: { x: 42 },
        tenantId: 'T',
      });
      const buf = Buffer.from(serializeCloudEvent(event), 'utf-8');
      const deserialized = deserializeCloudEvent(buf);
      expect((deserialized['data'] as any).x).toBe(42);
    });
  });

  describe('extractEventData', () => {
    it('should extract dict data', () => {
      expect(extractEventData({ data: { foo: 'bar' } })).toEqual({ foo: 'bar' });
    });

    it('should return empty object when data is missing', () => {
      expect(extractEventData({})).toEqual({});
    });

    it('should return empty object when data is null', () => {
      expect(extractEventData({ data: null })).toEqual({});
    });

    it('should parse JSON string data', () => {
      expect(extractEventData({ data: '{"a": 1}' })).toEqual({ a: 1 });
    });

    it('should wrap non-parseable string data', () => {
      expect(extractEventData({ data: 'plain text' })).toEqual({ raw: 'plain text' });
    });

    it('should wrap non-object data', () => {
      expect(extractEventData({ data: 42 })).toEqual({ value: 42 });
    });

    it('should wrap array data', () => {
      expect(extractEventData({ data: [1, 2, 3] })).toEqual({ value: [1, 2, 3] });
    });
  });
});

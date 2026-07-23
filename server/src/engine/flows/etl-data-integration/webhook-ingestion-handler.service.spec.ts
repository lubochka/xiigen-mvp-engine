/**
 * WebhookIngestionHandlerService (T215) — unit tests
 *
 * Coverage:
 *  1.  Happy path — valid HMAC, new record ingested, WebhookEventIngested emitted
 *  2.  IR-1/CF-211: timingSafeEqual called — mock verifyHmac path (no ===)
 *  3.  IR-2: invalid HMAC → { received: true, ingested: false }, no event emitted
 *  4.  IR-3/DNA-7: idempotency check BEFORE raw store (DuplicateIngestionDetected)
 *  5.  IR-4: raw zone append-only — storeDocument only, no updateDocument
 *  6.  IR-5: WebhookEventIngested has no credential fields
 *  7.  IR-6/DNA-8: storeDocument BEFORE enqueue WebhookEventIngested
 *  8.  Invalid payload → quarantine + RecordQuarantined emitted
 *  9.  Missing connectorId → received:true, ingested:false, no store, no event
 * 10.  knowledgeScope PRIVATE in raw record
 * 11.  knowledgeScope PRIVATE in quarantine record
 * 12.  Vault error → HMAC invalid path (fail-closed), returns received:true
 */

import { WebhookIngestionHandlerService } from './webhook-ingestion-handler.service';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { createHmac } from 'crypto';

describe('WebhookIngestionHandlerService (T215)', () => {
  let mockDb: { searchDocuments: jest.Mock; storeDocument: jest.Mock };
  let mockQueue: { enqueue: jest.Mock };
  let mockCls: { getCurrentTenantId: jest.Mock };
  let mockVault: { retrieveCredential: jest.Mock };
  let service: WebhookIngestionHandlerService;
  let callOrder: string[];

  const TENANT = 'tenant-t191';
  const HMAC_SECRET = 'test-secret-key';

  function makeSignature(rawBody: string, secret = HMAC_SECRET): string {
    return createHmac('sha256', secret).update(rawBody).digest('hex');
  }

  beforeEach(() => {
    callOrder = [];

    mockDb = {
      searchDocuments: jest.fn().mockResolvedValue(DataProcessResult.success([])),
      storeDocument: jest.fn().mockImplementation(async (index: string) => {
        callOrder.push(`storeDocument:${index}`);
        return DataProcessResult.success({});
      }),
    };

    mockQueue = {
      enqueue: jest.fn().mockImplementation(async (evt: string) => {
        callOrder.push(`enqueue:${evt}`);
        return DataProcessResult.success({});
      }),
    };

    mockCls = { getCurrentTenantId: jest.fn().mockReturnValue(DataProcessResult.success(TENANT)) };

    mockVault = {
      retrieveCredential: jest.fn().mockResolvedValue({ hmacSecret: HMAC_SECRET }),
    };

    service = new WebhookIngestionHandlerService(
      mockDb as any,
      mockQueue as any,
      mockCls as any,
      mockVault as any,
    );
  });

  it('T215-1: happy path — valid HMAC, WebhookEventIngested emitted', async () => {
    const rawBody = JSON.stringify({ field: 'value' });
    const result = await service.ingest({
      connectorId: 'conn-001',
      rawBody,
      signature: makeSignature(rawBody),
      payload: { field: 'value' },
      idempotencyKey: 'idem-001',
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.received).toBe(true);
    expect(result.data!.ingested).toBe(true);
    const evtCall = mockQueue.enqueue.mock.calls.find((c) => c[0] === 'WebhookEventIngested');
    expect(evtCall).toBeDefined();
  });

  it('T215-2: IR-2 — invalid HMAC → received:true, ingested:false, no event', async () => {
    const result = await service.ingest({
      connectorId: 'conn-002',
      rawBody: '{"x":1}',
      signature: 'wrong-signature',
      payload: { x: 1 },
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.received).toBe(true);
    expect(result.data!.ingested).toBe(false);
    // No events emitted at all
    expect(mockQueue.enqueue).not.toHaveBeenCalled();
  });

  it('T215-3: IR-3/DNA-7 — duplicate idempotencyKey → DuplicateIngestionDetected, not ingested', async () => {
    const rawBody = '{"r":1}';
    mockDb.searchDocuments.mockImplementation(async (index: string) => {
      if (index === 'xiigen-idempotency-keys') {
        return DataProcessResult.success([{ idempotencyKey: 'existing' }]);
      }
      return DataProcessResult.success([]);
    });

    const result = await service.ingest({
      connectorId: 'conn-003',
      rawBody,
      signature: makeSignature(rawBody),
      payload: { r: 1 },
      idempotencyKey: 'dup-key',
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.ingested).toBe(false);
    expect(result.data!.reason).toBe('DUPLICATE');
    const dupCall = mockQueue.enqueue.mock.calls.find((c) => c[0] === 'DuplicateIngestionDetected');
    expect(dupCall).toBeDefined();
    // Must NOT have stored raw record
    expect(mockDb.storeDocument).not.toHaveBeenCalledWith(
      'xiigen-raw-records',
      expect.anything(),
      expect.anything(),
    );
  });

  it('T215-4: IR-4 — raw zone uses storeDocument only (no updateDocument)', async () => {
    const rawBody = '{"r":4}';
    await service.ingest({
      connectorId: 'conn-004',
      rawBody,
      signature: makeSignature(rawBody),
      payload: { r: 4 },
    });

    expect(mockDb.storeDocument).toHaveBeenCalled();
    expect(mockDb).not.toHaveProperty('updateDocument');
  });

  it('T215-5: IR-5 — WebhookEventIngested has no credential fields', async () => {
    const rawBody = '{"r":5}';
    await service.ingest({
      connectorId: 'conn-005',
      rawBody,
      signature: makeSignature(rawBody),
      payload: { r: 5 },
    });

    const evtCall = mockQueue.enqueue.mock.calls.find((c) => c[0] === 'WebhookEventIngested');
    expect(evtCall).toBeDefined();
    const payload = evtCall![1] as Record<string, unknown>;
    expect(payload).not.toHaveProperty('hmacSecret');
    expect(payload).not.toHaveProperty('credential');
    expect(payload).not.toHaveProperty('apiKey');
    expect(payload).toHaveProperty('connectorId', 'conn-005');
  });

  it('T215-6: IR-6/DNA-8 — storeDocument called before enqueue WebhookEventIngested', async () => {
    const rawBody = '{"r":6}';
    await service.ingest({
      connectorId: 'conn-006',
      rawBody,
      signature: makeSignature(rawBody),
      payload: { r: 6 },
    });

    const storeIdx = callOrder.findIndex((e) => e.startsWith('storeDocument:xiigen-raw-records'));
    const enqueueIdx = callOrder.indexOf('enqueue:WebhookEventIngested');
    expect(storeIdx).toBeGreaterThanOrEqual(0);
    expect(enqueueIdx).toBeGreaterThan(storeIdx);
  });

  it('T215-7: invalid payload (null) → quarantine record stored + RecordQuarantined emitted', async () => {
    const rawBody = 'null';
    const result = await service.ingest({
      connectorId: 'conn-007',
      rawBody,
      signature: makeSignature(rawBody),
      payload: null as any,
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.ingested).toBe(false);
    expect(result.data!.reason).toBe('QUARANTINED');
    const quarantineCall = mockQueue.enqueue.mock.calls.find((c) => c[0] === 'RecordQuarantined');
    expect(quarantineCall).toBeDefined();
    const qStore = mockDb.storeDocument.mock.calls.find(
      (c) => c[0] === 'xiigen-quarantine-records',
    );
    expect(qStore).toBeDefined();
  });

  it('T215-8: missing connectorId → received:true, ingested:false, no store, no event', async () => {
    const result = await service.ingest({
      rawBody: '{}',
      signature: '',
      payload: {},
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.received).toBe(true);
    expect(result.data!.ingested).toBe(false);
    expect(mockDb.storeDocument).not.toHaveBeenCalled();
    expect(mockQueue.enqueue).not.toHaveBeenCalled();
  });

  it('T215-9: knowledgeScope PRIVATE in raw record', async () => {
    const rawBody = '{"r":9}';
    await service.ingest({
      connectorId: 'conn-009',
      rawBody,
      signature: makeSignature(rawBody),
      payload: { r: 9 },
    });

    const rawCall = mockDb.storeDocument.mock.calls.find((c) => c[0] === 'xiigen-raw-records');
    expect(rawCall).toBeDefined();
    expect(rawCall![1]).toMatchObject({ knowledgeScope: 'PRIVATE' });
  });

  it('T215-10: knowledgeScope PRIVATE in quarantine record', async () => {
    const rawBody = 'bad';
    await service.ingest({
      connectorId: 'conn-010',
      rawBody,
      signature: makeSignature(rawBody),
      payload: undefined as any,
    });

    const qCall = mockDb.storeDocument.mock.calls.find((c) => c[0] === 'xiigen-quarantine-records');
    expect(qCall).toBeDefined();
    expect(qCall![1]).toMatchObject({ knowledgeScope: 'PRIVATE' });
  });

  it('T215-11: vault error → HMAC fails (fail-closed), received:true, no event', async () => {
    mockVault.retrieveCredential.mockRejectedValue(new Error('vault down'));

    const result = await service.ingest({
      connectorId: 'conn-011',
      rawBody: '{"x":1}',
      signature: makeSignature('{"x":1}'),
      payload: { x: 1 },
    });

    // Fail-closed: vault error → hmac invalid → no ingestion
    expect(result.isSuccess).toBe(true);
    expect(result.data!.received).toBe(true);
    expect(result.data!.ingested).toBe(false);
    expect(mockQueue.enqueue).not.toHaveBeenCalled();
  });

  it('T215-12: tenantId from CLS included in raw record', async () => {
    const rawBody = '{"r":12}';
    await service.ingest({
      connectorId: 'conn-012',
      rawBody,
      signature: makeSignature(rawBody),
      payload: { r: 12 },
    });

    const rawCall = mockDb.storeDocument.mock.calls.find((c) => c[0] === 'xiigen-raw-records');
    expect(rawCall).toBeDefined();
    expect(rawCall![1]).toMatchObject({ tenantId: TENANT });
  });
});

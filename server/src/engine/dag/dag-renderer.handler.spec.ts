// dag-renderer.handler.spec.ts
// Validates: tenantId injected into FLOW_RUNS query (GAP-5 scope isolation)

import { DagRendererHandler } from './dag-renderer.handler';
import { DataProcessResult } from '../../kernel/data-process-result';

function makeMockDb() {
  return {
    searchDocuments: jest.fn().mockResolvedValue(DataProcessResult.success([])),
  };
}

function makeCls(tenantId: string | null = null) {
  return {
    get: jest.fn().mockReturnValue(tenantId ? { tenantId } : null),
  };
}

describe('DagRendererHandler — scope isolation (GAP-5)', () => {
  it('SCOPE-1: when CLS has tenantId, searchDocuments includes tenantId filter on FLOW_RUNS', async () => {
    const db = makeMockDb();
    const cls = makeCls('acme-tenant');
    const handler = new DagRendererHandler(db as any, cls as any);

    await handler.renderDag('FLOW-08');

    expect(db.searchDocuments).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ flowId: 'FLOW-08', tenantId: 'acme-tenant' }),
    );
  });

  it('SCOPE-2: when CLS returns null, no tenantId filter applied (fail-open)', async () => {
    const db = makeMockDb();
    const cls = makeCls(null);
    const handler = new DagRendererHandler(db as any, cls as any);

    await handler.renderDag('FLOW-08');

    const callArgs = (db.searchDocuments as jest.Mock).mock.calls[0];
    expect(callArgs[1]).not.toHaveProperty('tenantId');
  });

  it('SCOPE-3: when CLS throws, renderDag still resolves (fail-open)', async () => {
    const db = makeMockDb();
    const throwingCls = {
      get: jest.fn().mockImplementation(() => {
        throw new Error('CLS down');
      }),
    };
    const handler = new DagRendererHandler(db as any, throwingCls as any);

    const result = await handler.renderDag('FLOW-08');
    expect(result).toBeDefined();
  });
});

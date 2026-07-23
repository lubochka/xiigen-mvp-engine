/**
 * FLOW-31 Phase B — Ingestion Pipeline Tests (T489–T493).
 *
 * T489 DesignSpecIngester
 * T490 ComponentMapParser
 * T491 DesignTokenExtractor
 * T492 DesignContextBuilder
 * T493 DesignPatternParser
 */

import { DesignSpecIngester } from '../../src/engine/flows/design-system-governance/design-spec-ingester.service';
import { ComponentMapParser } from '../../src/engine/flows/design-system-governance/component-map-parser.service';
import { DesignTokenExtractor } from '../../src/engine/flows/design-system-governance/design-token-extractor.service';
import { DesignContextBuilder } from '../../src/engine/flows/design-system-governance/design-context-builder.service';
import { DesignPatternParser } from '../../src/engine/flows/design-system-governance/design-pattern-parser.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

const TENANT = 'tenant-flow31-b';
const SPEC_ID = 'spec-1';

const VALID_COMPONENTS = [{ name: 'Button', children: [], props: { variant: 'primary' } }];
const VALID_TOKENS = [{ name: 'color-primary', category: 'color', value: '#0066cc' }];
const VALID_PATTERNS = [
  { patternId: 'p1', name: 'CardGrid', category: 'layout', components: ['Card'] },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeDb(existingDocs: Record<string, unknown>[] = []) {
  const stored: Record<string, unknown>[] = [];
  return {
    storeDocument: jest.fn(async (_i: string, doc: Record<string, unknown>, id?: string) => {
      stored.push(doc);
      return DataProcessResult.success({ ...doc, _id: id ?? 'x' });
    }),
    searchDocuments: jest.fn(async () => DataProcessResult.success(existingDocs)),
    _stored: stored,
  } as any;
}

function makeFailingDb() {
  return {
    storeDocument: jest.fn(async () => DataProcessResult.failure('STORAGE_FAILED', 'write error')),
    searchDocuments: jest.fn(async () => DataProcessResult.success([])),
  } as any;
}

function makeQueue() {
  const events: any[] = [];
  return {
    enqueue: jest.fn(async (evt: string, data: any) => {
      events.push({ evt, data });
      return DataProcessResult.success('m');
    }),
    _events: events,
  } as any;
}

// ── T489 DesignSpecIngester ───────────────────────────────────────────────────

describe('DesignSpecIngester (T489)', () => {
  it('F31B-1: missing tenantId → UNSCOPED_QUERY', async () => {
    const r = await new DesignSpecIngester(makeDb(), makeQueue()).ingest('', { format: 'json' });
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('F31B-2: valid args → success', async () => {
    const r = await new DesignSpecIngester(makeDb(), makeQueue()).ingest(TENANT, {
      format: 'json',
      title: 'My Design',
    });
    expect(r.isSuccess).toBe(true);
  });

  it('F31B-3: unsupported format → UNSUPPORTED_FORMAT', async () => {
    const r = await new DesignSpecIngester(makeDb(), makeQueue()).ingest(TENANT, { format: 'pdf' });
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSUPPORTED_FORMAT');
  });

  it('F31B-4: idempotent — same specId returns existing without re-storing', async () => {
    const existing = [
      { specId: 'spec-existing', format: 'figma', ingestedAt: '2024-01-01T00:00:00.000Z' },
    ];
    const db = makeDb(existing);
    const r = await new DesignSpecIngester(db, makeQueue()).ingest(TENANT, {
      format: 'figma',
      specId: 'spec-existing',
    });
    expect(r.data!.specId).toBe('spec-existing');
    expect(db.storeDocument).not.toHaveBeenCalled();
  });

  it('F31B-5: format echoed in result', async () => {
    const r = await new DesignSpecIngester(makeDb(), makeQueue()).ingest(TENANT, {
      format: 'figma',
    });
    expect(r.data!.format).toBe('figma');
  });

  it('F31B-6: storeDocument() BEFORE enqueue() — DNA-8', async () => {
    const callOrder: string[] = [];
    const db = {
      storeDocument: jest.fn(async () => {
        callOrder.push('store');
        return DataProcessResult.success({});
      }),
      searchDocuments: jest.fn(async () => DataProcessResult.success([])),
    } as any;
    const queue = {
      enqueue: jest.fn(async () => {
        callOrder.push('enqueue');
        return DataProcessResult.success('m');
      }),
    } as any;
    await new DesignSpecIngester(db, queue).ingest(TENANT, { format: 'json' });
    expect(callOrder[0]).toBe('store');
    expect(callOrder[1]).toBe('enqueue');
  });

  it('F31B-7: emits design.spec.ingested', async () => {
    const queue = makeQueue();
    await new DesignSpecIngester(makeDb(), queue).ingest(TENANT, { format: 'json' });
    expect(queue.enqueue).toHaveBeenCalledWith('design.spec.ingested', expect.any(Object));
  });

  it('F31B-8: DB store failure → error propagated', async () => {
    const r = await new DesignSpecIngester(makeFailingDb(), makeQueue()).ingest(TENANT, {
      format: 'json',
    });
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('STORAGE_FAILED');
  });
});

// ── T490 ComponentMapParser ───────────────────────────────────────────────────

describe('ComponentMapParser (T490)', () => {
  it('F31B-9: missing tenantId → UNSCOPED_QUERY', async () => {
    const r = await new ComponentMapParser(makeDb(), makeQueue()).parse(
      '',
      SPEC_ID,
      VALID_COMPONENTS,
    );
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('F31B-10: valid args → success', async () => {
    const r = await new ComponentMapParser(makeDb(), makeQueue()).parse(
      TENANT,
      SPEC_ID,
      VALID_COMPONENTS,
    );
    expect(r.isSuccess).toBe(true);
  });

  it('F31B-11: componentCount equals components length', async () => {
    const comps = [
      { name: 'Button', children: [], props: {} },
      { name: 'Card', children: ['Button'], props: {} },
    ];
    const r = await new ComponentMapParser(makeDb(), makeQueue()).parse(TENANT, SPEC_ID, comps);
    expect(r.data!.componentCount).toBe(2);
  });

  it('F31B-12: specId echoed in result', async () => {
    const r = await new ComponentMapParser(makeDb(), makeQueue()).parse(
      TENANT,
      SPEC_ID,
      VALID_COMPONENTS,
    );
    expect(r.data!.specId).toBe(SPEC_ID);
  });

  it('F31B-13: storeDocument() BEFORE enqueue() — DNA-8', async () => {
    const callOrder: string[] = [];
    const db = {
      storeDocument: jest.fn(async () => {
        callOrder.push('store');
        return DataProcessResult.success({});
      }),
    } as any;
    const queue = {
      enqueue: jest.fn(async () => {
        callOrder.push('enqueue');
        return DataProcessResult.success('m');
      }),
    } as any;
    await new ComponentMapParser(db, queue).parse(TENANT, SPEC_ID, VALID_COMPONENTS);
    expect(callOrder[0]).toBe('store');
    expect(callOrder[1]).toBe('enqueue');
  });

  it('F31B-14: emits design.components.parsed', async () => {
    const queue = makeQueue();
    await new ComponentMapParser(makeDb(), queue).parse(TENANT, SPEC_ID, VALID_COMPONENTS);
    expect(queue.enqueue).toHaveBeenCalledWith('design.components.parsed', expect.any(Object));
  });
});

// ── T491 DesignTokenExtractor ─────────────────────────────────────────────────

describe('DesignTokenExtractor (T491)', () => {
  it('F31B-15: missing tenantId → UNSCOPED_QUERY', async () => {
    const r = await new DesignTokenExtractor(makeDb(), makeQueue()).extract(
      '',
      SPEC_ID,
      VALID_TOKENS,
    );
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('F31B-16: valid args → success', async () => {
    const r = await new DesignTokenExtractor(makeDb(), makeQueue()).extract(
      TENANT,
      SPEC_ID,
      VALID_TOKENS,
    );
    expect(r.isSuccess).toBe(true);
  });

  it('F31B-17: invalid token category → INVALID_TOKEN_CATEGORY', async () => {
    const bad = [{ name: 'x', category: 'unknown_cat', value: '#fff' }];
    const r = await new DesignTokenExtractor(makeDb(), makeQueue()).extract(TENANT, SPEC_ID, bad);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('INVALID_TOKEN_CATEGORY');
  });

  it('F31B-18: tokenCount equals tokens length', async () => {
    const tokens = [
      { name: 'color-primary', category: 'color', value: '#0066cc' },
      { name: 'spacing-sm', category: 'spacing', value: '8px' },
    ];
    const r = await new DesignTokenExtractor(makeDb(), makeQueue()).extract(
      TENANT,
      SPEC_ID,
      tokens,
    );
    expect(r.data!.tokenCount).toBe(2);
  });

  it('F31B-19: storeDocument() BEFORE enqueue() — DNA-8', async () => {
    const callOrder: string[] = [];
    const db = {
      storeDocument: jest.fn(async () => {
        callOrder.push('store');
        return DataProcessResult.success({});
      }),
    } as any;
    const queue = {
      enqueue: jest.fn(async () => {
        callOrder.push('enqueue');
        return DataProcessResult.success('m');
      }),
    } as any;
    await new DesignTokenExtractor(db, queue).extract(TENANT, SPEC_ID, VALID_TOKENS);
    expect(callOrder[0]).toBe('store');
    expect(callOrder[1]).toBe('enqueue');
  });

  it('F31B-20: emits design.tokens.extracted', async () => {
    const queue = makeQueue();
    await new DesignTokenExtractor(makeDb(), queue).extract(TENANT, SPEC_ID, VALID_TOKENS);
    expect(queue.enqueue).toHaveBeenCalledWith('design.tokens.extracted', expect.any(Object));
  });
});

// ── T492 DesignContextBuilder ─────────────────────────────────────────────────

describe('DesignContextBuilder (T492)', () => {
  it('F31B-21: missing tenantId → UNSCOPED_QUERY', async () => {
    const r = await new DesignContextBuilder(makeDb(), makeQueue()).build('', SPEC_ID, {});
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('F31B-22: valid args → success', async () => {
    const r = await new DesignContextBuilder(makeDb(), makeQueue()).build(TENANT, SPEC_ID, {
      team: 'design',
      version: '2.0',
    });
    expect(r.isSuccess).toBe(true);
  });

  it('F31B-23: specId echoed in result', async () => {
    const r = await new DesignContextBuilder(makeDb(), makeQueue()).build(TENANT, SPEC_ID, {});
    expect(r.data!.specId).toBe(SPEC_ID);
  });

  it('F31B-24: storeDocument() BEFORE enqueue() — DNA-8', async () => {
    const callOrder: string[] = [];
    const db = {
      storeDocument: jest.fn(async () => {
        callOrder.push('store');
        return DataProcessResult.success({});
      }),
    } as any;
    const queue = {
      enqueue: jest.fn(async () => {
        callOrder.push('enqueue');
        return DataProcessResult.success('m');
      }),
    } as any;
    await new DesignContextBuilder(db, queue).build(TENANT, SPEC_ID, {});
    expect(callOrder[0]).toBe('store');
    expect(callOrder[1]).toBe('enqueue');
  });

  it('F31B-25: emits design.context.built', async () => {
    const queue = makeQueue();
    await new DesignContextBuilder(makeDb(), queue).build(TENANT, SPEC_ID, {});
    expect(queue.enqueue).toHaveBeenCalledWith('design.context.built', expect.any(Object));
  });
});

// ── T493 DesignPatternParser ──────────────────────────────────────────────────

describe('DesignPatternParser (T493)', () => {
  it('F31B-26: missing tenantId → UNSCOPED_QUERY', async () => {
    const r = await new DesignPatternParser(makeDb(), makeQueue()).parse(
      '',
      SPEC_ID,
      VALID_PATTERNS,
    );
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('F31B-27: valid args → success', async () => {
    const r = await new DesignPatternParser(makeDb(), makeQueue()).parse(
      TENANT,
      SPEC_ID,
      VALID_PATTERNS,
    );
    expect(r.isSuccess).toBe(true);
  });

  it('F31B-28: patternCount equals patterns length', async () => {
    const patterns = [
      { patternId: 'p1', name: 'CardGrid', category: 'layout', components: ['Card'] },
      { patternId: 'p2', name: 'NavBar', category: 'navigation', components: ['NavItem'] },
    ];
    const r = await new DesignPatternParser(makeDb(), makeQueue()).parse(TENANT, SPEC_ID, patterns);
    expect(r.data!.patternCount).toBe(2);
  });

  it('F31B-29: specId echoed in result', async () => {
    const r = await new DesignPatternParser(makeDb(), makeQueue()).parse(
      TENANT,
      SPEC_ID,
      VALID_PATTERNS,
    );
    expect(r.data!.specId).toBe(SPEC_ID);
  });

  it('F31B-30: storeDocument() BEFORE enqueue() — DNA-8', async () => {
    const callOrder: string[] = [];
    const db = {
      storeDocument: jest.fn(async () => {
        callOrder.push('store');
        return DataProcessResult.success({});
      }),
    } as any;
    const queue = {
      enqueue: jest.fn(async () => {
        callOrder.push('enqueue');
        return DataProcessResult.success('m');
      }),
    } as any;
    await new DesignPatternParser(db, queue).parse(TENANT, SPEC_ID, VALID_PATTERNS);
    expect(callOrder[0]).toBe('store');
    expect(callOrder[1]).toBe('enqueue');
  });

  it('F31B-31: emits design.patterns.parsed', async () => {
    const queue = makeQueue();
    await new DesignPatternParser(makeDb(), queue).parse(TENANT, SPEC_ID, VALID_PATTERNS);
    expect(queue.enqueue).toHaveBeenCalledWith('design.patterns.parsed', expect.any(Object));
  });

  it('F31B-32: DB store failure → error propagated', async () => {
    const r = await new DesignPatternParser(makeFailingDb(), makeQueue()).parse(
      TENANT,
      SPEC_ID,
      VALID_PATTERNS,
    );
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('STORAGE_FAILED');
  });
});

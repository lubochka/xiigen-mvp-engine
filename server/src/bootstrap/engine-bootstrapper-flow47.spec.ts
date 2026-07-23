/**
 * Tests for EngineBootstrapper FLOW-47 additions:
 *   Turn 0: pre-flight topology check (skip empty templates in autoPublishGlobalTemplates)
 *   Turn 1: seedAllDesignCorpora + AF-4 rehydration (CF-832)
 *   Turn 2: autoPublishGlobalTemplates (auto-publish under MASTER_TENANT_ID)
 *   Turn 7: seedCanonicalTopologyBackfill (CF-836)
 *   Turn 8: FIXTURE_ROUTING extension + NDJSON handler + array expansion (CF-837/CF-838)
 *
 * The methods are private — accessed via index signature for unit testing.
 */

import { DataProcessResult } from '../kernel/data-process-result';
import { EngineBootstrapper } from './engine-bootstrapper';
import { TenantTopology, TenantTopologyStore } from '../engine/tenant-topology-store';
import { TENANT_CONTEXT_KEY } from '../kernel/multi-tenant/tenant-context';
import { BootstrapFromDocumentsService } from './bootstrap-from-documents.service';
import { RagContextStation } from '../af-stations/af4-rag-context';
import { MarketplacePackageService } from '../engine/marketplace-package.service';

interface MockCls {
  get: jest.Mock;
  set: jest.Mock;
  run: jest.Mock;
}

function makeMockCls(): MockCls {
  const store = new Map<string, unknown>();
  return {
    get: jest.fn((key: string) => store.get(key) ?? null),
    set: jest.fn((key: string, val: unknown) => {
      store.set(key, val);
    }),
    run: jest.fn(async (fn: () => Promise<unknown>) => fn()),
  };
}

interface MakeOpts {
  searchResults?: Record<string, Array<Record<string, unknown>>>;
  storeGlobalTemplate?: jest.Mock;
  publish?: jest.Mock;
  withFromDocuments?: boolean;
  withAf4?: boolean;
  withMarketplace?: boolean;
  withTopologyStore?: boolean;
}

function makeBootstrapper(opts: MakeOpts = {}) {
  const db = {
    storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    searchDocuments: jest.fn().mockImplementation((index: string) => {
      const data = opts.searchResults?.[index] ?? [];
      return Promise.resolve(DataProcessResult.success(data));
    }),
    ensureIndex: jest.fn().mockResolvedValue(undefined),
    getDocument: jest.fn(),
  };
  const cls = makeMockCls();

  const tenantStore = opts.withTopologyStore
    ? ({
        storeGlobalTemplate:
          opts.storeGlobalTemplate ??
          jest
            .fn()
            .mockImplementation((t: TenantTopology) =>
              Promise.resolve(DataProcessResult.success(t)),
            ),
        getById: jest.fn().mockResolvedValue(DataProcessResult.success(null)),
      } as unknown as jest.Mocked<TenantTopologyStore>)
    : undefined;

  const fromDocuments = opts.withFromDocuments
    ? ({
        seedFlowCorpus: jest.fn().mockResolvedValue(
          DataProcessResult.success({
            flowId: 'X',
            archPatternCount: 2,
            designReasoningCount: 3,
            failedCount: 0,
          }),
        ),
        seedArchPhilosophy: jest.fn(),
      } as unknown as jest.Mocked<BootstrapFromDocumentsService>)
    : undefined;

  const af4Station = opts.withAf4
    ? ({
        indexPattern: jest.fn(),
        patternCount: 0,
        search: jest.fn(),
      } as unknown as jest.Mocked<RagContextStation>)
    : undefined;

  const marketplace = opts.withMarketplace
    ? ({
        publish:
          opts.publish ??
          jest.fn().mockResolvedValue({
            packageId: 'PKG-AUTO-1',
            sourceFlowId: 'flow-x',
          }),
        browse: jest.fn(),
        getById: jest.fn(),
        install: jest.fn(),
      } as unknown as jest.Mocked<MarketplacePackageService>)
    : undefined;

  const bootstrapper = new EngineBootstrapper(
    db as never,
    cls as never,
    undefined,
    undefined,
    tenantStore,
    fromDocuments,
    af4Station,
    marketplace,
  );
  return { bootstrapper, db, cls, tenantStore, fromDocuments, af4Station, marketplace };
}

// Helpers to invoke private methods
function callPrivate<T>(bootstrapper: EngineBootstrapper, name: string, ...args: unknown[]): T {
  return (bootstrapper as unknown as Record<string, (...a: unknown[]) => T>)[name](...args);
}

describe('FLOW-47 Turn 0 — autoPublishGlobalTemplates pre-flight guard', () => {
  it('skips templates with empty nodes array (F-1 from R1)', async () => {
    const publish = jest.fn().mockResolvedValue({ packageId: 'PKG-1' });
    const { bootstrapper, marketplace } = makeBootstrapper({
      withTopologyStore: true,
      withMarketplace: true,
      publish,
      searchResults: {
        'xiigen-flow-templates': [
          { flowId: 'flow-empty', knowledgeScope: 'GLOBAL', nodes: [], name: 'Empty' },
          {
            flowId: 'flow-populated',
            knowledgeScope: 'GLOBAL',
            nodes: [{ nodeId: 'n1' }],
            name: 'Pop',
          },
        ],
        'xiigen-marketplace-packages': [],
      },
    });
    await callPrivate<Promise<void>>(bootstrapper, 'autoPublishGlobalTemplates');
    expect(marketplace!.publish).toHaveBeenCalledTimes(1);
    expect(marketplace!.publish).toHaveBeenCalledWith(
      expect.objectContaining({ flowId: 'flow-populated' }),
    );
  });

  it('skips templates that already have a package in xiigen-marketplace-packages (idempotent)', async () => {
    const publish = jest.fn().mockResolvedValue({ packageId: 'PKG-1' });
    const { bootstrapper, marketplace } = makeBootstrapper({
      withTopologyStore: true,
      withMarketplace: true,
      publish,
      searchResults: {
        'xiigen-flow-templates': [
          {
            flowId: 'flow-existing',
            knowledgeScope: 'GLOBAL',
            nodes: [{ nodeId: 'n1' }],
            name: 'X',
          },
        ],
        'xiigen-marketplace-packages': [
          { packageId: 'PKG-EXISTING', sourceFlowId: 'flow-existing' },
        ],
      },
    });
    await callPrivate<Promise<void>>(bootstrapper, 'autoPublishGlobalTemplates');
    expect(marketplace!.publish).not.toHaveBeenCalled();
  });

  it('runs publish under MASTER_TENANT_ID CLS context', async () => {
    const publish = jest.fn().mockResolvedValue({ packageId: 'PKG-1' });
    const { bootstrapper, cls, marketplace } = makeBootstrapper({
      withTopologyStore: true,
      withMarketplace: true,
      publish,
      searchResults: {
        'xiigen-flow-templates': [
          {
            flowId: 'flow-pop',
            knowledgeScope: 'GLOBAL',
            nodes: [{ nodeId: 'n1' }],
            name: 'P',
          },
        ],
        'xiigen-marketplace-packages': [],
      },
    });
    await callPrivate<Promise<void>>(bootstrapper, 'autoPublishGlobalTemplates');
    expect(cls.run).toHaveBeenCalled();
    expect(marketplace!.publish).toHaveBeenCalled();
  });

  it('skips entirely when marketplace service not available', async () => {
    const { bootstrapper } = makeBootstrapper({ withTopologyStore: true });
    await expect(
      callPrivate<Promise<void>>(bootstrapper, 'autoPublishGlobalTemplates'),
    ).resolves.toBeUndefined();
  });
});

describe('FLOW-47 Turn 1 — seedAllDesignCorpora (CF-832)', () => {
  it('skips when fromDocuments not injected', async () => {
    const { bootstrapper } = makeBootstrapper();
    await expect(
      callPrivate<Promise<void>>(bootstrapper, 'seedAllDesignCorpora'),
    ).resolves.toBeUndefined();
  });

  it('calls seedFlowCorpus per file and rehydrates AF-4', async () => {
    const { bootstrapper, fromDocuments, af4Station } = makeBootstrapper({
      withFromDocuments: true,
      withAf4: true,
      searchResults: {
        'xiigen-rag-patterns': [
          { patternId: 'P1', flowId: 'user-registration' },
          { patternId: 'P2', flowId: 'user-registration' },
        ],
      },
    });
    await callPrivate<Promise<void>>(bootstrapper, 'seedAllDesignCorpora');
    expect(fromDocuments!.seedFlowCorpus).toHaveBeenCalled();
    // AF-4 rehydration triggered for each seeded slug
    expect(af4Station!.indexPattern).toHaveBeenCalled();
  });

  it('continues looping when one slug fails (per-file try/catch)', async () => {
    const { bootstrapper, fromDocuments } = makeBootstrapper({ withFromDocuments: true });
    let callCount = 0;
    (fromDocuments!.seedFlowCorpus as jest.Mock).mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve(DataProcessResult.failure('SEED_FILE_NOT_FOUND', 'missing'));
      }
      return Promise.resolve(
        DataProcessResult.success({
          flowId: 'X',
          archPatternCount: 1,
          designReasoningCount: 0,
          failedCount: 0,
        }),
      );
    });
    await callPrivate<Promise<void>>(bootstrapper, 'seedAllDesignCorpora');
    expect((fromDocuments!.seedFlowCorpus as jest.Mock).mock.calls.length).toBeGreaterThan(1);
  });
});

describe('FLOW-47 Turn 1b — rehydrateAf4FromSlug', () => {
  it('queries by both flowId and domainId, then de-dupes by patternId', async () => {
    const { bootstrapper, af4Station, db } = makeBootstrapper({
      withAf4: true,
      searchResults: {
        'xiigen-rag-patterns': [{ patternId: 'P1' }, { patternId: 'P2' }],
      },
    });
    await callPrivate<Promise<void>>(bootstrapper, 'rehydrateAf4FromSlug', 'user-registration');
    // Two queries (flowId + domainId)
    expect(db.searchDocuments).toHaveBeenCalledTimes(2);
    // Each unique patternId pushed once
    expect(af4Station!.indexPattern).toHaveBeenCalledTimes(2);
  });

  it('is a no-op when AF-4 not injected', async () => {
    const { bootstrapper, db } = makeBootstrapper();
    await callPrivate<Promise<void>>(bootstrapper, 'rehydrateAf4FromSlug', 'X');
    expect(db.searchDocuments).not.toHaveBeenCalled();
  });
});

describe('FLOW-47 Turn 7 — seedCanonicalTopologyBackfill', () => {
  it('skips when tenantTopologyStore not injected', async () => {
    const { bootstrapper } = makeBootstrapper();
    await expect(
      callPrivate<Promise<void>>(bootstrapper, 'seedCanonicalTopologyBackfill'),
    ).resolves.toBeUndefined();
  });

  it('extractTNumber returns numeric portion of node id', () => {
    const { bootstrapper } = makeBootstrapper({ withTopologyStore: true });
    expect(callPrivate<number>(bootstrapper, 'extractTNumber', 'T123')).toBe(123);
    expect(callPrivate<number>(bootstrapper, 'extractTNumber', 'T5')).toBe(5);
    expect(callPrivate<number>(bootstrapper, 'extractTNumber', 'no-num')).toBe(0);
  });

  it('slugToHumanName converts slug to title case', () => {
    const { bootstrapper } = makeBootstrapper({ withTopologyStore: true });
    expect(callPrivate<string>(bootstrapper, 'slugToHumanName', 'event-management')).toBe(
      'Event Management',
    );
    expect(callPrivate<string>(bootstrapper, 'slugToHumanName', 'schema-registry-dag')).toBe(
      'Schema Registry Dag',
    );
  });
});

describe('FLOW-47 Turn 8 — resolveFixtureDir', () => {
  it('returns null when no fixture dir found in any candidate', () => {
    const { bootstrapper } = makeBootstrapper();
    const result = callPrivate<string | null>(
      bootstrapper,
      'resolveFixtureDir',
      'nonexistent-fixtures-dir-xyz123',
    );
    expect(result).toBeNull();
  });
});

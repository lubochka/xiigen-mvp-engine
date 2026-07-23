/**
 * Flow32MarketplaceRagSeed — RAG patterns for FLOW-32 Sharable Flows & RAG Template Marketplace.
 *
 * GAP-32-02: content-addressable-storage-dd326 (CF-717 / DD-326)
 * GAP-32-05: idempotent-settlement-integer-arithmetic (CF-734 / ST-451)
 *
 * DNA-3: All methods return DataProcessResult.
 * Rule 1: No SDK imports.
 */
import { Injectable } from '@nestjs/common';
import { FlowRagSeedBase } from './flow-rag-seed.base';
import { DataProcessResult } from '../kernel/data-process-result';

@Injectable()
export class Flow32MarketplaceRagSeed extends FlowRagSeedBase {
  readonly domainId = 'flow-32-sharable-flows-marketplace';

  async indexPatterns(): Promise<DataProcessResult<number>> {
    const patterns = [
      // ── content-addressable-storage-dd326 (GAP-32-02 / DD-326 / CF-717) ──

      {
        patternId: 'content-addressable-storage-dd326',
        name: 'CONTENT_ADDRESSABLE_STORAGE',
        namespace: 'marketplace-supply-chain',
        pattern: 'content-addressable-storage',
        title: 'Content-Addressable Storage (DD-326)',
        version: '1.0.0',
        description:
          'Artifacts must be stored by SHA-256 content hash, not UUID. ' +
          'The hash IS the storage key. Automatic deduplication: same content = same key = idempotent store. ' +
          'Tamper detection: retrieved content can be re-hashed and compared to the key. ' +
          'Use F1342 (IPackageContentStoreService) for hash-keyed blob storage. ' +
          'Use F1353 (IContentHashService) for SHA-256 computation. ' +
          'UUID-keyed artifact storage is a CF-717 violation.',
        useCase:
          'SHA-256 hash-keyed blob store with deduplication and tamper detection for marketplace artifact packages',
        dnaCompliance:
          'DNA-2 (BuildSearchFilter for hash-keyed queries) — hash is the filter term, not UUID',
        codeExample:
          'const hash = this.contentHashService.hash(content);\n' +
          'const existsResult = await this.contentStore.exists(hash);\n' +
          'if (existsResult.data.exists) return DataProcessResult.success({ ref: hash });\n' +
          'const storeResult = await this.contentStore.store(hash, content, metadata);\n' +
          'return DataProcessResult.success({ ref: storeResult.data.ref });',
        negativeExample:
          'const id = uuid();\n' +
          'await this.db.storeDocument("artifacts", { id, content: content.toString("base64") });\n' +
          'return id;',
        negativeReason:
          'UUID keys do not detect content identity — deduplication and tamper detection are impossible.',
        factories: [
          {
            factoryId: 'F1342',
            interfaceName: 'IPackageContentStoreService',
            role: 'Hash-keyed blob storage — store, retrieve, verify',
          },
          {
            factoryId: 'F1353',
            interfaceName: 'IContentHashService',
            role: 'SHA-256 hash computation for content buffers and streams',
          },
        ],
        taskTypesTargeted: ['T516', 'T517', 'T518'],
        antiPatterns: [
          'UUID as storage key for artifact blobs',
          'Storing the same content twice when hash matches',
          'Skipping hash verification on retrieve',
        ],
        tags: [
          'T516',
          'T517',
          'T518',
          'content-addressable',
          'SHA-256',
          'deduplication',
          'tamper-detection',
          'F1342',
          'F1353',
          'CF-717',
          'DD-326',
        ],
        flowId: 'FLOW-32',
        bfaRef: 'CF-717',
        ddRef: 'DD-326',
        violation: 'score-0',
        dataPlane: false,
        sharingEligible: true,
        planeType: 'LOGIC',
      },

      // ── idempotent-settlement-integer-arithmetic (GAP-32-05 / CF-734 / ST-451) ──

      {
        patternId: 'idempotent-settlement-integer-arithmetic',
        name: 'BIGINT_SETTLEMENT',
        namespace: 'marketplace-billing',
        pattern: 'integer-arithmetic-settlement',
        title: 'Idempotent Settlement with Integer Arithmetic (ST-451)',
        version: '1.0.0',
        description:
          'All monetary values stored and computed in integer cents (bigint). ' +
          'No floating-point arithmetic — parseFloat/toFixed cause rounding errors in multi-currency settlement. ' +
          'BigInt cents: 1 USD = 100n cents. Revenue splits use basis points (10000n bps = 100%). ' +
          'BigInt cannot be stored in Elasticsearch — serialize as string, parse with BigInt() on retrieval. ' +
          'DNA-7 idempotency: SETNX on settlement-{tenantId}-{periodId} key prevents double-settlement.',
        useCase:
          'BigInt integer cents arithmetic with DNA-7 SETNX idempotency for multi-currency revenue settlement',
        dnaCompliance: 'DNA-7 (Idempotency) — SETNX on settlement-{tenantId}-{periodId}',
        codeExample:
          '// Convert to cents at boundary only:\n' +
          'function toCents(dollars: number): bigint { return BigInt(Math.round(dollars * 100)); }\n' +
          '// Revenue split via basis points:\n' +
          'const platformCents = (totalCents * 3000n) / 10000n; // 30% platform fee\n' +
          'const publisherCents = totalCents - platformCents;\n' +
          '// Store as string (ES does not support BigInt):\n' +
          'await db.storeDocument("settlements", { totalCents: totalCents.toString() });\n' +
          '// Retrieve and parse:\n' +
          'const totalCents = BigInt(doc.totalCents);',
        negativeExample:
          'const platformFee = totalAmount * 0.30;\n' +
          'const publisherShare = totalAmount - platformFee;\n' +
          'const displayAmount = publisherShare.toFixed(2);',
        negativeReason:
          '0.1 + 0.2 = 0.30000000000000004 — float rounding errors accumulate in multi-currency settlement.',
        antiPatterns: [
          'parseFloat() for monetary values',
          'toFixed() for rounding',
          'Math.round() on float dollars',
          'Storing monetary values as JavaScript number type',
        ],
        taskTypesTargeted: ['T532'],
        tags: [
          'T532',
          'BigInt',
          'settlement',
          'integer-arithmetic',
          'float-prevention',
          'CF-734',
          'ST-451',
        ],
        flowId: 'FLOW-32',
        bfaRef: 'CF-734',
        stRef: 'ST-451',
        violation: 'score-0',
        dataPlane: false,
        sharingEligible: true,
        planeType: 'LOGIC',
      },
    ];

    let count = 0;
    for (const p of patterns) {
      const result = await this.upsertPattern(p);
      if (result.isSuccess) count++;
    }
    return DataProcessResult.success(count);
  }

  async indexBfaRules(): Promise<DataProcessResult<number>> {
    return DataProcessResult.success(0);
  }

  async indexDesignRecords(): Promise<DataProcessResult<number>> {
    return DataProcessResult.success(0);
  }
}

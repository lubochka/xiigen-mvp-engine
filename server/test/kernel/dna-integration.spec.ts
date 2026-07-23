/**
 * Integration test: DataProcessResult + ParseDocument chain
 * Verifies DNA-1 and DNA-3 work together correctly.
 */

import { DataProcessResult } from '../../src/kernel/data-process-result';
import { parseDocument, mergeDocuments, documentToJson } from '../../src/kernel/parse-document';

describe('DNA-1 + DNA-3 Integration', () => {
  it('should parse → validate → transform in a chain', () => {
    const raw = '{"name": "inventory-service", "version": "1.0.0", "type": "microservice"}';

    // Parse → map → add enrichment
    const result = parseDocument(raw, ['name', 'version', 'type']).map((doc) => {
      const enriched: Record<string, unknown> = {
        ...doc,
        _enriched: true,
        _factory_id: 'F166',
      };
      return enriched;
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data?.['name']).toBe('inventory-service');
    expect(result.data?.['_enriched']).toBe(true);
    expect(result.data?.['_factory_id']).toBe('F166');
  });

  it('should short-circuit on parse failure', () => {
    const raw = 'not json';

    const result = parseDocument(raw, ['name']).map((doc) => {
      // This should never execute
      throw new Error('Should not reach here');
      return doc;
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('PARSE_INVALID_JSON');
  });

  it('should short-circuit on validation failure', () => {
    const raw = '{"name": "test"}';

    // Missing required field 'version'
    const result = parseDocument(raw, ['name', 'version']).flatMap((doc) => {
      // This should never execute
      return DataProcessResult.success({ ...doc, extra: true });
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('PARSE_MISSING_FIELDS');
  });

  it('should merge and re-serialize documents', () => {
    const base = parseDocument({ name: 'svc', config: { port: 3000 } });
    const overlay = parseDocument({ config: { env: 'production' }, deployed: true });

    expect(base.isSuccess).toBe(true);
    expect(overlay.isSuccess).toBe(true);

    const merged = mergeDocuments(base.data!, overlay.data!);
    expect(merged['name']).toBe('svc');
    expect((merged['config'] as Record<string, unknown>)['port']).toBe(3000);
    expect((merged['config'] as Record<string, unknown>)['env']).toBe('production');
    expect(merged['deployed']).toBe(true);

    // Should serialize cleanly
    const json = documentToJson(merged);
    const reparsed = JSON.parse(json);
    expect(reparsed['name']).toBe('svc');
  });

  it('should handle flatMap chain of parse operations', () => {
    const result = parseDocument({ step: 'one' })
      .flatMap((doc1) => parseDocument({ step: 'two', prev: doc1['step'] }))
      .flatMap((doc2) =>
        parseDocument({
          step: 'three',
          prev: doc2['step'],
          chain_complete: true,
        }),
      );

    expect(result.isSuccess).toBe(true);
    expect(result.data?.['step']).toBe('three');
    expect(result.data?.['prev']).toBe('two');
    expect(result.data?.['chain_complete']).toBe(true);
  });

  it('should produce correct toDict output for API response', () => {
    const result = parseDocument('{"task_type": "T44", "archetype": "ORCHESTRATION"}', [
      'task_type',
      'archetype',
    ]);

    expect(result.isSuccess).toBe(true);

    const apiResponse = result.toDict();
    expect(apiResponse['is_success']).toBe(true);
    expect((apiResponse['data'] as Record<string, unknown>)['task_type']).toBe('T44');
    expect(apiResponse['correlation_id']).toBeDefined();
    expect(apiResponse['timestamp']).toBeDefined();
  });

  it('should produce correct error toDict for failed parse', () => {
    const result = parseDocument('broken json');
    const apiResponse = result.toDict();

    expect(apiResponse['is_success']).toBe(false);
    expect(apiResponse['error_code']).toBe('PARSE_INVALID_JSON');
    expect(apiResponse['data']).toBeUndefined();
  });
});

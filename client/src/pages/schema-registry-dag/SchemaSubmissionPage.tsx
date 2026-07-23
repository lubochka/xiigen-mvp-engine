/**
 * SchemaSubmissionPage — FLOW-11 T189
 * Submit a new schema version.
 */
import React, { useState } from 'react';

export function SchemaSubmissionPage() {
  const [schemaType, setSchemaType] = useState('');
  const [jsonSchema, setJsonSchema] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!schemaType.trim()) {
      setError('Schema type is required');
      return;
    }
    if (!jsonSchema.trim()) {
      setError('JSON schema is required');
      return;
    }

    try {
      JSON.parse(jsonSchema);
    } catch {
      setError('Invalid JSON schema');
      return;
    }

    setStatus('loading');
    setTimeout(() => {
      setResult({ status: 'QUEUED', version: '1.0.0', changeType: 'ADDITIVE' });
      setStatus('success');
    }, 400);
  }

  return (
    <div className="p-6 max-w-2xl" data-testid="page-schema-submission">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Submit Schema Version</h1>
      <p className="text-gray-600 mb-6">
        Register a new data schema or publish an incremented version of an existing one.
      </p>

      {status === 'success' && result ? (
        <div
          data-testid="submission-result"
          className="p-4 bg-green-50 border border-green-200 rounded"
        >
          <p className="text-green-700 font-medium">Schema submitted!</p>
          <p className="text-sm text-green-600">
            Status: {String(result.status)} · Version: {String(result.version)}
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} data-testid="schema-submission-form">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Schema Type</label>
            <input
              type="text"
              value={schemaType}
              onChange={(e) => setSchemaType(e.target.value)}
              className="border rounded px-3 py-2 w-full"
              data-testid="schema-type-input"
              placeholder="e.g. UserSchema"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">JSON Schema</label>
            <textarea
              value={jsonSchema}
              onChange={(e) => setJsonSchema(e.target.value)}
              className="border rounded px-3 py-2 w-full font-mono text-sm"
              rows={8}
              data-testid="json-schema-input"
              placeholder='{ "type": "object", "properties": { ... } }'
            />
          </div>
          {error && (
            <p className="text-red-600 text-sm mb-3" data-testid="submission-error">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={status === 'loading'}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            data-testid="submit-schema-button"
          >
            {status === 'loading' ? 'Submitting...' : 'Submit Schema'}
          </button>
        </form>
      )}
    </div>
  );
}

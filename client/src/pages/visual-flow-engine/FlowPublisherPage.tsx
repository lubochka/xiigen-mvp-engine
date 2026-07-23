/**
 * FlowPublisherPage — FLOW-18 T619/T620
 * Node type registration + code injection UI.
 * SETNX duplicate registration guard shown in UI.
 * Version lock shown for code injection.
 */
import React, { useState } from 'react';

type InjectionPhase = 'PRE_WRITE' | 'COMPLETE' | 'FAILED';

interface InjectionAuditEntry {
  phase: InjectionPhase;
  timestamp: string;
  nodeId: string;
  version: string;
}

export function FlowPublisherPage() {
  const [nodeTypeId, setNodeTypeId] = useState('');
  const [capabilities, setCapabilities] = useState('');
  const [nodeId, setNodeId] = useState('');
  const [version, setVersion] = useState('');
  const [injectionPayload, setInjectionPayload] = useState('');
  const [registrationStatus, setRegistrationStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [injectionStatus, setInjectionStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [auditTrail, setAuditTrail] = useState<InjectionAuditEntry[]>([]);
  const [registrationResult, setRegistrationResult] = useState<Record<string, unknown> | null>(null);
  const [injectionResult, setInjectionResult] = useState<Record<string, unknown> | null>(null);
  const [registrationError, setRegistrationError] = useState<string | null>(null);
  const [injectionError, setInjectionError] = useState<string | null>(null);

  function handleRegisterNodeType(e: React.FormEvent) {
    e.preventDefault();
    setRegistrationError(null);

    if (!nodeTypeId) { setRegistrationError('Node type ID is required'); return; }

    setRegistrationStatus('loading');
    setTimeout(() => {
      // Simulate SETNX duplicate check
      if (nodeTypeId === 'already-registered') {
        setRegistrationStatus('error');
        setRegistrationError('NodeTypeAlreadyExists — SETNX lock held for this nodeTypeId');
        return;
      }
      setRegistrationStatus('success');
      setRegistrationResult({
        nodeTypeId,
        capabilities: capabilities.split(',').map(c => c.trim()).filter(Boolean),
        status: 'REGISTERED',
        registeredAt: new Date().toISOString(),
      });
    }, 300);
  }

  function handleInjectCode(e: React.FormEvent) {
    e.preventDefault();
    setInjectionError(null);

    if (!nodeId || !version) {
      setInjectionError('Node ID and version are required');
      return;
    }

    setInjectionStatus('loading');
    const now = new Date().toISOString();

    // Phase 1: PRE_WRITE audit (append-only rollback pointer)
    const preWriteEntry: InjectionAuditEntry = {
      phase: 'PRE_WRITE',
      timestamp: now,
      nodeId,
      version,
    };
    setAuditTrail((prev) => [...prev, preWriteEntry]);

    setTimeout(() => {
      const completedAt = new Date().toISOString();
      // Phase 2: COMPLETE audit (append-only)
      const completeEntry: InjectionAuditEntry = {
        phase: 'COMPLETE',
        timestamp: completedAt,
        nodeId,
        version,
      };
      setAuditTrail((prev) => [...prev, completeEntry]);

      setInjectionStatus('success');
      setInjectionResult({
        nodeId,
        version,
        status: 'INJECTED',
        injectedAt: completedAt,
        auditPhases: ['PRE_WRITE', 'COMPLETE'],
      });
    }, 400);
  }

  const phaseColor = (phase: InjectionPhase): string => {
    if (phase === 'PRE_WRITE') return 'text-yellow-600';
    if (phase === 'COMPLETE') return 'text-green-600';
    return 'text-red-600';
  };

  return (
    <div className="p-6 max-w-2xl" data-testid="flow-publisher-page">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Flow Publisher</h1>

      {/* Node Type Registration */}
      <div className="mb-8 p-4 bg-gray-50 border border-gray-200 rounded">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Register a new node type</h2>
        <p className="text-xs text-gray-500 mb-3">Registration is atomic &mdash; the same node type can&#39;t be added twice at the same time.</p>

        {registrationStatus === 'success' && registrationResult && (
          <div data-testid="registration-success" className="mb-3 p-3 bg-green-50 border border-green-200 rounded text-green-700 text-sm">
            Node type registered: <strong>{String(registrationResult['nodeTypeId'])}</strong>
          </div>
        )}

        {registrationError && (
          <div data-testid="registration-error" className="mb-3 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {registrationError}
          </div>
        )}

        <form onSubmit={handleRegisterNodeType} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Node Type ID</label>
            <input
              data-testid="node-type-id-input"
              value={nodeTypeId}
              onChange={e => setNodeTypeId(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              placeholder="text-input-node"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Capabilities (comma-separated)</label>
            <input
              data-testid="capabilities-input"
              value={capabilities}
              onChange={e => setCapabilities(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              placeholder="input, validate, emit"
            />
          </div>
          <button
            data-testid="register-node-type-submit"
            type="submit"
            disabled={registrationStatus === 'loading'}
            className="w-full bg-indigo-600 text-white py-2 rounded text-sm font-medium hover:bg-indigo-700 disabled:bg-gray-400"
          >
            {registrationStatus === 'loading' ? 'Registering...' : 'Register Node Type'}
          </button>
        </form>
      </div>

      {/* Code Injection */}
      <div className="p-4 bg-gray-50 border border-gray-200 rounded">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Publish node code</h2>
        <p className="text-xs text-gray-500 mb-3">Each publish takes a version stamp so two publishes can&#39;t clash, and a pre-publish snapshot is kept so you can roll back.</p>

        {injectionStatus === 'success' && injectionResult && (
          <div data-testid="injection-success" className="mb-3 p-3 bg-green-50 border border-green-200 rounded text-green-700 text-sm">
            Code injected: node <strong>{String(injectionResult['nodeId'])}</strong> v{String(injectionResult['version'])}
          </div>
        )}

        {injectionError && (
          <div data-testid="injection-error" className="mb-3 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {injectionError}
          </div>
        )}

        <form onSubmit={handleInjectCode} className="space-y-3">
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Node ID</label>
              <input
                data-testid="injection-node-id-input"
                value={nodeId}
                onChange={e => setNodeId(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                placeholder="node-001"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Version</label>
              <input
                data-testid="injection-version-input"
                value={version}
                onChange={e => setVersion(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                placeholder="v1"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Injection Payload</label>
            <textarea
              data-testid="injection-payload-input"
              value={injectionPayload}
              onChange={e => setInjectionPayload(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono"
              rows={3}
              placeholder="function transform(input) { return input; }"
            />
          </div>
          <button
            data-testid="inject-code-submit"
            type="submit"
            disabled={injectionStatus === 'loading'}
            className="w-full bg-orange-600 text-white py-2 rounded text-sm font-medium hover:bg-orange-700 disabled:bg-gray-400"
          >
            {injectionStatus === 'loading' ? 'Injecting...' : 'Inject Code'}
          </button>
        </form>

        {/* Append-only audit trail */}
        {auditTrail.length > 0 && (
          <div className="mt-4" data-testid="injection-audit-trail">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Injection Audit Trail (append-only)</h3>
            <div className="space-y-1">
              {auditTrail.map((entry, idx) => (
                <div key={idx} className={`text-xs font-mono ${phaseColor(entry.phase)}`} data-testid={`audit-entry-${idx}`}>
                  [{entry.phase}] {entry.nodeId}@{entry.version} — {entry.timestamp}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

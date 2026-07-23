/**
 * FLOW-08 — BootstrapStatusPage
 * Shows event participation bootstrap progress.
 * Data operations via /api/dynamic/xiigen-participation-bootstrap
 */

import React, { useState, useEffect } from 'react';

interface BootstrapRecord {
  eventId: string;
  tenantId: string;
  audienceSize: number;
  batchCount: number;
  batchSize: number;
  status: 'QUEUED' | 'IN_PROGRESS' | 'COMPLETE';
  queuedAt: string;
  knowledgeScope: string;
}

interface GateStatus {
  completionKey: string;
  eventId: string;
  tenantId: string;
  totalBatches: number;
  completedAt: string;
}

export function BootstrapStatusPage() {
  const [bootstraps, setBootstraps] = useState<BootstrapRecord[]>([]);
  const [completions, setCompletions] = useState<GateStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [bootstrapResp, completionResp] = await Promise.all([
        fetch('/api/dynamic/xiigen-participation-bootstrap'),
        fetch('/api/dynamic/xiigen-bootstrap-gate-completions'),
      ]);
      if (bootstrapResp.ok) {
        const json = await bootstrapResp.json();
        setBootstraps((json?.data?.items ?? json?.hits ?? []) as BootstrapRecord[]);
      }
      if (completionResp.ok) {
        const json = await completionResp.json();
        setCompletions((json?.data?.items ?? json?.hits ?? []) as GateStatus[]);
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6" data-testid="bootstrap-status-page">
        <p data-testid="bootstrap-loading">Loading bootstrap status...</p>
      </div>
    );
  }

  return (
    <div className="p-6" data-testid="bootstrap-status-page">
      <h1 className="text-2xl font-bold mb-6">Bootstrap Status</h1>
      {error && (
        <p className="text-red-600 mb-4" data-testid="bootstrap-error">
          {error}
        </p>
      )}

      <section className="mb-6" data-testid="bootstrap-list-section">
        <h2 className="text-lg font-semibold mb-3">Event Bootstraps</h2>
        {bootstraps.length === 0 ? (
          <div
            data-testid="no-bootstraps"
            className="p-8 bg-gray-50 border border-gray-200 rounded text-center"
          >
            <div className="text-4xl mb-3" aria-hidden>
              📦
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              No bootstrap runs yet
            </h3>
            <p className="text-sm text-gray-600 max-w-md mx-auto">
              Event participation bootstraps will appear here once an event is published and
              its audience cohort is queued for fan-out.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {bootstraps.map((b) => {
              const isComplete = completions.some((c) => c.eventId === b.eventId);
              const isZero = b.audienceSize === 0;
              return (
                <li
                  key={b.eventId}
                  className="bg-white rounded shadow p-4"
                  data-testid="bootstrap-item"
                >
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">{b.eventId}</span>
                    <span
                      className={`text-sm px-2 py-0.5 rounded ${
                        isComplete ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                      }`}
                      data-testid="bootstrap-status"
                    >
                      {isComplete ? 'COMPLETE' : b.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Audience: <span data-testid="audience-size">{b.audienceSize}</span>
                    {' · '}
                    Batches: <span data-testid="batch-count">{b.batchCount}</span>
                  </p>
                  {isZero && (
                    <p className="text-xs text-green-600 mt-1" data-testid="zero-audience-complete">
                      Immediate completion (0 audience)
                    </p>
                  )}
                  {isComplete && (
                    <p
                      className="text-xs text-green-600 mt-1"
                      data-testid="bootstrap-complete-indicator"
                    >
                      All batches acknowledged
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

export default BootstrapStatusPage;

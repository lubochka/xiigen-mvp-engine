/**
 * FLOW-07 — ConnectionsPage
 * View all social connections and mutual connection counts.
 * Data operations via /api/dynamic/xiigen-connections
 */

import React, { useState, useEffect } from 'react';

interface Connection {
  connectionId: string;
  fromUserId: string;
  toUserId: string;
  tenantId: string;
  establishedAt: string;
  initialConnectionStrength: number;
}

interface MutualCount {
  userIdA: string;
  userIdB: string;
  mutualCount: number;
  computedAt: string;
}

export function ConnectionsPage() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [mutualCounts, setMutualCounts] = useState<MutualCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = async () => {
    setLoading(true);
    setError(null);
    try {
      const [connResp, mutualResp] = await Promise.all([
        fetch('/api/dynamic/xiigen-connections'),
        fetch('/api/dynamic/xiigen-mutual-connection-counts'),
      ]);
      if (connResp.ok) {
        const data = await connResp.json();
        setConnections(data?.hits ?? []);
      }
      if (mutualResp.ok) {
        const data = await mutualResp.json();
        setMutualCounts(data?.hits ?? []);
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6" data-testid="connections-page">
        <p data-testid="connections-loading">Loading connections...</p>
      </div>
    );
  }

  return (
    <div className="p-6" data-testid="connections-page">
      <h1 className="text-2xl font-bold mb-6">My Connections</h1>
      {error && (
        <p className="text-red-600 mb-4" data-testid="connections-error">
          {error}
        </p>
      )}

      <section className="mb-6" data-testid="connections-list-section">
        <h2 className="text-lg font-semibold mb-3">All Connections ({connections.length})</h2>
        {connections.length === 0 ? (
          <p className="text-gray-500" data-testid="no-connections">
            No connections yet
          </p>
        ) : (
          <ul className="space-y-2">
            {connections.map((conn) => (
              <li
                key={conn.connectionId}
                className="bg-white rounded shadow p-3"
                data-testid="connection-item"
              >
                <div className="flex justify-between">
                  <span>{conn.toUserId}</span>
                  <span className="text-sm text-gray-500" data-testid="connection-strength">
                    Strength: {conn.initialConnectionStrength}
                  </span>
                </div>
                <p className="text-xs text-gray-400">{conn.establishedAt}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section data-testid="mutual-counts-section">
        <h2 className="text-lg font-semibold mb-3">Mutual Connections</h2>
        {mutualCounts.length === 0 ? (
          <p className="text-gray-500" data-testid="no-mutual">
            No mutual connection data yet
          </p>
        ) : (
          <ul className="space-y-2">
            {mutualCounts.map((mc, i) => (
              <li key={i} className="bg-white rounded shadow p-3" data-testid="mutual-count-item">
                <span>
                  {mc.userIdA} &amp; {mc.userIdB}:{' '}
                </span>
                <span className="font-bold" data-testid="mutual-count">
                  {mc.mutualCount} mutual
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default ConnectionsPage;

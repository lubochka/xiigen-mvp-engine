/**
 * FLOW-07 — SocialGraphPage
 * Social graph analytics dashboard showing aggregate metrics.
 * Data operations via /api/dynamic/xiigen-social-graph-analytics
 */

import React, { useState, useEffect } from 'react';

interface AnalyticsRecord {
  tenantId: string;
  eventType: string;
  aggregatePeriod: string;
  totalCount: number;
  emittedAt: string;
  knowledgeScope: string;
}

export function SocialGraphPage() {
  const [analytics, setAnalytics] = useState<AnalyticsRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch('/api/dynamic/xiigen-social-graph-analytics');
      if (!resp.ok) {
        setError('Failed to load analytics');
        return;
      }
      const data = await resp.json();
      setAnalytics(data?.hits ?? []);
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6" data-testid="social-graph-page">
        <p data-testid="analytics-loading">Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="p-6" data-testid="social-graph-page">
      <h1 className="text-2xl font-bold mb-6">Social Graph Analytics</h1>
      {error && (
        <p className="text-red-600 mb-4" data-testid="analytics-error">
          {error}
        </p>
      )}

      {analytics.length === 0 ? (
        <p className="text-gray-500" data-testid="no-analytics">
          No analytics data available
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="analytics-grid">
          {analytics.map((record, i) => (
            <div key={i} className="bg-white rounded shadow p-4" data-testid="analytics-card">
              <h3 className="font-semibold capitalize" data-testid="analytics-type">
                {record.eventType.replace(/_/g, ' ')}
              </h3>
              <p className="text-3xl font-bold text-blue-600 mt-2" data-testid="analytics-count">
                {record.totalCount.toLocaleString()}
              </p>
              <p className="text-sm text-gray-500 mt-1">Period: {record.aggregatePeriod}</p>
              <p className="text-xs text-gray-400">{record.emittedAt}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default SocialGraphPage;

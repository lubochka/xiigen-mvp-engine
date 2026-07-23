/**
 * FLOW-08 — ParticipationStatusPage
 * View participation status and analytics for events.
 * Data operations via /api/dynamic/xiigen-registrations and /api/dynamic/xiigen-participation-analytics
 */

import React, { useState, useEffect } from 'react';

interface Registration {
  registrationId: string;
  userId: string;
  eventId: string;
  tenantId: string;
  status: 'CONFIRMED' | 'WAITLISTED' | 'BLOCKED';
  registeredAt: string;
}

interface AnalyticsRecord {
  tenantId: string;
  eventType: string;
  aggregatePeriod: string;
  trackedAt: string;
  knowledgeScope: string;
}

export function ParticipationStatusPage() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [regResp, analyticsResp] = await Promise.all([
        fetch('/api/dynamic/xiigen-registrations'),
        fetch('/api/dynamic/xiigen-participation-analytics'),
      ]);
      if (regResp.ok) {
        const data = await regResp.json();
        setRegistrations(data?.hits ?? []);
      }
      if (analyticsResp.ok) {
        const data = await analyticsResp.json();
        setAnalytics(data?.hits ?? []);
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6" data-testid="participation-status-page">
        <p data-testid="participation-loading">Loading participation status...</p>
      </div>
    );
  }

  return (
    <div className="p-6" data-testid="participation-status-page">
      <h1 className="text-2xl font-bold mb-6">Participation Status</h1>
      {error && (
        <p className="text-red-600 mb-4" data-testid="participation-error">
          {error}
        </p>
      )}

      <section className="mb-6" data-testid="registrations-section">
        <h2 className="text-lg font-semibold mb-3">My Registrations</h2>
        {registrations.length === 0 ? (
          <p className="text-gray-500" data-testid="no-registrations">
            No registrations yet
          </p>
        ) : (
          <ul className="space-y-2">
            {registrations.map((reg) => (
              <li
                key={reg.registrationId}
                className="bg-white rounded shadow p-3 flex justify-between"
                data-testid="registration-item"
              >
                <span>{reg.eventId}</span>
                <span
                  className={`text-sm px-2 py-0.5 rounded ${
                    reg.status === 'CONFIRMED'
                      ? 'bg-green-100 text-green-700'
                      : reg.status === 'WAITLISTED'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-100 text-gray-700'
                  }`}
                  data-testid="registration-status"
                >
                  {reg.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section data-testid="analytics-section">
        <h2 className="text-lg font-semibold mb-3">Participation Analytics</h2>
        {analytics.length === 0 ? (
          <p className="text-gray-500" data-testid="no-participation-analytics">
            No analytics data
          </p>
        ) : (
          <ul className="space-y-2">
            {analytics.map((record, i) => (
              <li key={i} className="bg-white rounded shadow p-3" data-testid="analytics-item">
                <span className="font-medium">{record.eventType}</span>
                <span className="text-sm text-gray-500 ml-2">{record.aggregatePeriod}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default ParticipationStatusPage;

/**
 * T625 ConsentGateEnforcer UI Page
 * FLOW-20: Ads Platform
 *
 * Displays user consent status and allows users to manage GDPR/CCPA consent preferences.
 * Consent status is fetched from API and displayed in a clear, actionable interface.
 */

import React, { useState, useEffect } from 'react';
import { createDoc, listDocs, MASTER_TENANT_ID, DynamicDoc } from '../../api/dynamic';

interface ConsentRecord extends DynamicDoc {
  userId: string;
  adsConsent: boolean;
  expiresAt?: string;
  lastUpdatedAt?: string;
}

const CONSENT_INDEX = 'xiigen-consent-records';

const ConsentGatePage: React.FC = () => {
  const [consentRecord, setConsentRecord] = useState<ConsentRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchConsentStatus();
  }, []);

  const fetchConsentStatus = async () => {
    try {
      setLoading(true);
      const records = await listDocs<ConsentRecord>(CONSENT_INDEX, {}, {
        tenantId: MASTER_TENANT_ID,
        size: 1,
      });
      setConsentRecord(records[0] ?? null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleConsentUpdate = async (newConsent: boolean) => {
    try {
      setUpdating(true);
      const updated = await createDoc<ConsentRecord>(
        CONSENT_INDEX,
        {
          userId: consentRecord?.userId ?? 'current-user',
          adsConsent: newConsent,
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          lastUpdatedAt: new Date().toISOString(),
        },
        { tenantId: MASTER_TENANT_ID },
      );
      setConsentRecord(updated);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div data-testid="page-consentgate" className="min-h-screen bg-white p-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Ad Consent Preferences</h1>
          <p className="text-gray-600">Loading your consent settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="page-consentgate" className="min-h-screen bg-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Ad Consent Preferences</h1>

        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-300 rounded-lg text-red-800">
            {error}
          </div>
        )}

        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Your Consent Status</h2>

          {consentRecord ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Ads Personalization</p>
                  <p className="text-sm text-gray-600 mt-1">
                    {consentRecord.adsConsent
                      ? 'You are allowing us to show you personalized ads'
                      : 'You have revoked consent for personalized ads'}
                  </p>
                </div>
                <div
                  className={`px-4 py-2 rounded font-semibold ${
                    consentRecord.adsConsent
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-200 text-gray-800'
                  }`}
                >
                  {consentRecord.adsConsent ? 'Granted' : 'Revoked'}
                </div>
              </div>

              {consentRecord.expiresAt && (
                <p className="text-sm text-gray-600">
                  Expires: {new Date(consentRecord.expiresAt).toLocaleDateString()}
                </p>
              )}

              {consentRecord.lastUpdatedAt && (
                <p className="text-sm text-gray-600">
                  Last updated: {new Date(consentRecord.lastUpdatedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          ) : (
            <p className="text-gray-600">No consent record found</p>
          )}
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => handleConsentUpdate(true)}
            disabled={updating || consentRecord?.adsConsent === true}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {updating ? 'Updating...' : 'Grant Consent'}
          </button>
          <button
            onClick={() => handleConsentUpdate(false)}
            disabled={updating || consentRecord?.adsConsent === false}
            className="px-6 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {updating ? 'Updating...' : 'Revoke Consent'}
          </button>
        </div>

        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">GDPR & CCPA Compliance</h3>
          <p className="text-sm text-blue-800">
            Your consent preference is required for personalized ad delivery. You may change this
            setting at any time. This action is effective immediately.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ConsentGatePage;

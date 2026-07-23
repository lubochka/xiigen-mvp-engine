/**
 * FLOW-08 — PurchaseHistoryPage
 * View purchase history for events.
 * Data operations via /api/dynamic/xiigen-purchase-history
 */

import React, { useState, useEffect } from 'react';

interface PurchaseRecord {
  purchaseId: string;
  userId: string;
  eventId: string;
  tenantId: string;
  purchasedAt: string;
  purchaseAmount: number;
  eventCategory: string;
  knowledgeScope: string;
}

export function PurchaseHistoryPage() {
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPurchases();
  }, []);

  const loadPurchases = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch('/api/dynamic/xiigen-purchase-history');
      if (!resp.ok) {
        setError('Failed to load purchase history');
        return;
      }
      const data = await resp.json();
      setPurchases(data?.hits ?? []);
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6" data-testid="purchase-history-page">
        <p data-testid="purchases-loading">Loading purchase history...</p>
      </div>
    );
  }

  return (
    <div className="p-6" data-testid="purchase-history-page">
      <h1 className="text-2xl font-bold mb-6">Purchase History</h1>
      {error && (
        <p className="text-red-600 mb-4" data-testid="purchases-error">
          {error}
        </p>
      )}
      {purchases.length === 0 ? (
        <p className="text-gray-500" data-testid="no-purchases">
          No purchase history yet
        </p>
      ) : (
        <ul className="space-y-3" data-testid="purchases-list">
          {purchases.map((p) => (
            <li
              key={p.purchaseId}
              className="bg-white rounded shadow p-4"
              data-testid="purchase-item"
            >
              <div className="flex justify-between">
                <span className="font-medium" data-testid="purchase-event">
                  {p.eventId}
                </span>
                <span className="font-bold text-green-600" data-testid="purchase-amount">
                  ${p.purchaseAmount.toFixed(2)}
                </span>
              </div>
              <p className="text-sm text-gray-600" data-testid="purchase-category">
                {p.eventCategory}
              </p>
              <p className="text-xs text-gray-400 mt-1">{p.purchasedAt}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default PurchaseHistoryPage;

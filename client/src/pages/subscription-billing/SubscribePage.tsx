/**
 * SubscribePage — FLOW-12 T210
 * Subscribe to an ACTIVE plan with payment method selection.
 * Shows TRIALING/ACTIVE status after successful subscription.
 */
import React, { useState } from 'react';

export function SubscribePage() {
  const [planId, setPlanId] = useState('');
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [subscriptionStatus, setSubscriptionStatus] = useState<'ACTIVE' | 'TRIALING' | null>(null);
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!planId) {
      setError('Plan is required');
      return;
    }
    if (!paymentMethodId) {
      setError('Payment method is required');
      return;
    }

    setStatus('loading');
    // Simulate subscribe API — includes TRIALING/ACTIVE state logic
    setTimeout(() => {
      setStatus('success');
      setSubscriptionId('sub-' + Date.now());
      // Simulate trial days from plan (demo)
      const hasTrial = planId.includes('trial');
      if (hasTrial) {
        setSubscriptionStatus('TRIALING');
        setTrialEndsAt(new Date(Date.now() + 14 * 86400000).toISOString());
      } else {
        setSubscriptionStatus('ACTIVE');
      }
    }, 300);
  }

  return (
    <div className="p-6 max-w-xl" data-testid="subscribe-page">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Subscribe</h1>

      {status === 'success' && subscriptionStatus && (
        <div
          data-testid="subscription-success"
          className="mb-4 p-4 bg-green-50 border border-green-200 rounded"
        >
          <p className="text-green-700 font-medium">Subscription created!</p>
          <p className="text-sm text-green-600 mt-1" data-testid="subscription-id">
            ID: {subscriptionId}
          </p>
          <p
            className={`text-sm mt-1 font-semibold ${subscriptionStatus === 'TRIALING' ? 'text-blue-600' : 'text-green-600'}`}
            data-testid="subscription-status"
          >
            Status: {subscriptionStatus}
          </p>
          {subscriptionStatus === 'TRIALING' && trialEndsAt && (
            <p className="text-sm text-blue-500 mt-1" data-testid="trial-ends-at">
              Trial ends: {new Date(trialEndsAt).toLocaleDateString()}
            </p>
          )}
        </div>
      )}

      {status !== 'success' && (
        <form onSubmit={handleSubmit} data-testid="subscribe-form" className="space-y-4">
          <div>
            <label htmlFor="planId" className="block text-sm font-medium text-gray-700 mb-1">
              Select Plan
            </label>
            <select
              id="planId"
              value={planId}
              onChange={(e) => setPlanId(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              data-testid="plan-select"
            >
              <option value="">— Select a plan —</option>
              <option value="plan-basic">Basic ($9.99/mo)</option>
              <option value="plan-pro">Pro ($29.99/mo)</option>
              <option value="plan-annual">Annual ($99.99/yr)</option>
              <option value="plan-trial">Pro Trial (14 days)</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="paymentMethodId"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Payment Method
              <span className="text-gray-400 ml-1 text-xs">— vault reference (not raw card)</span>
            </label>
            <input
              id="paymentMethodId"
              type="text"
              value={paymentMethodId}
              onChange={(e) => setPaymentMethodId(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              data-testid="payment-method-input"
              placeholder="pm-vault-..."
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm" data-testid="subscribe-error">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={status === 'loading'}
            className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
            data-testid="subscribe-button"
          >
            {status === 'loading' ? 'Subscribing…' : 'Subscribe'}
          </button>
        </form>
      )}
    </div>
  );
}

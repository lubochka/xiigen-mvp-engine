/**
 * SubscriptionPlanPage — FLOW-12 T209
 * Plan list and publish form with integer-cents validation and OCC error display.
 */
import React, { useState } from 'react';

interface PlanFormState {
  planId: string;
  planName: string;
  priceCents: string;
  billingInterval: string;
  trialDays: string;
  version: string;
}

function isIntegerCents(value: string): boolean {
  const n = Number(value);
  return Number.isInteger(n) && n > 0;
}

export function SubscriptionPlanPage() {
  const [form, setForm] = useState<PlanFormState>({
    planId: '',
    planName: '',
    priceCents: '',
    billingInterval: 'MONTHLY',
    trialDays: '0',
    version: '1',
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error' | 'occ_conflict'>(
    'idle',
  );
  const [error, setError] = useState<string | null>(null);
  const [publishedPlanId, setPublishedPlanId] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus('idle');

    // Integer cents validation — CF-12-2
    if (!form.priceCents) {
      setError('priceCents is required');
      return;
    }
    if (!isIntegerCents(form.priceCents)) {
      setError(
        'priceCents must be a positive integer (e.g. 999 for $9.99) — float prices are not allowed',
      );
      return;
    }

    setStatus('loading');
    // Simulate API call — plan publish
    setTimeout(() => {
      // Simulate occasional OCC conflict (10% chance in demo)
      if (Math.random() < 0.1) {
        setStatus('occ_conflict');
        setError('Plan version changed — retry with a fresh read');
      } else {
        setStatus('success');
        setPublishedPlanId(form.planId || `plan-${Date.now()}`);
      }
    }, 300);
  }

  return (
    <div className="p-6 max-w-2xl" data-testid="subscription-plan-page">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Subscription Plans</h1>

      {status === 'success' && (
        <div
          data-testid="plan-publish-success"
          className="mb-4 p-4 bg-green-50 border border-green-200 rounded"
        >
          <p className="text-green-700 font-medium">Plan published successfully!</p>
          <p className="text-sm text-green-600 mt-1" data-testid="published-plan-id">
            Plan ID: {publishedPlanId}
          </p>
        </div>
      )}

      {status === 'occ_conflict' && (
        <div
          data-testid="occ-conflict-error"
          className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded"
        >
          <p className="text-yellow-700 font-medium">Concurrent edit detected</p>
          <p className="text-sm text-yellow-600 mt-1">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} data-testid="plan-publish-form" className="space-y-4">
        <div>
          <label htmlFor="planId" className="block text-sm font-medium text-gray-700 mb-1">
            Plan ID
          </label>
          <input
            id="planId"
            name="planId"
            type="text"
            value={form.planId}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            data-testid="plan-id-input"
            placeholder="e.g. plan-pro"
          />
        </div>

        <div>
          <label htmlFor="planName" className="block text-sm font-medium text-gray-700 mb-1">
            Plan Name
          </label>
          <input
            id="planName"
            name="planName"
            type="text"
            value={form.planName}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            data-testid="plan-name-input"
            placeholder="e.g. Pro Plan"
          />
        </div>

        <div>
          <label htmlFor="priceCents" className="block text-sm font-medium text-gray-700 mb-1">
            Price (integer cents)
            <span className="text-gray-400 ml-1 text-xs">— e.g. 999 for $9.99</span>
          </label>
          <input
            id="priceCents"
            name="priceCents"
            type="number"
            step="1"
            value={form.priceCents}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            data-testid="price-cents-input"
            placeholder="999"
          />
          {form.priceCents && !isIntegerCents(form.priceCents) && (
            <p className="text-red-500 text-xs mt-1" data-testid="price-cents-error">
              priceCents must be a positive integer
            </p>
          )}
        </div>

        <div>
          <label htmlFor="billingInterval" className="block text-sm font-medium text-gray-700 mb-1">
            Billing Interval
          </label>
          <select
            id="billingInterval"
            name="billingInterval"
            value={form.billingInterval}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            data-testid="billing-interval-select"
          >
            <option value="MONTHLY">Monthly</option>
            <option value="ANNUAL">Annual</option>
            <option value="CUSTOM">Custom</option>
          </select>
        </div>

        <div>
          <label htmlFor="trialDays" className="block text-sm font-medium text-gray-700 mb-1">
            Trial Days
          </label>
          <input
            id="trialDays"
            name="trialDays"
            type="number"
            step="1"
            min="0"
            value={form.trialDays}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            data-testid="trial-days-input"
          />
        </div>

        {error && status !== 'occ_conflict' && (
          <p className="text-red-500 text-sm" data-testid="form-error">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={status === 'loading'}
          className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
          data-testid="publish-plan-button"
        >
          {status === 'loading' ? 'Publishing…' : 'Publish Plan'}
        </button>
      </form>
    </div>
  );
}

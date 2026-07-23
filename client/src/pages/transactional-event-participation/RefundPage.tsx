import React, { useState } from 'react';

interface RefundState {
  status: 'idle' | 'submitting' | 'initiated' | 'ineligible' | 'error';
  refundId?: string;
  errorMessage?: string;
  reason?: string;
}

export const RefundPage: React.FC = () => {
  const [state, setState] = useState<RefundState>({ status: 'idle' });
  const [purchaseId, setPurchaseId] = useState('');
  const [reason, setReason] = useState('');

  const handleRefund = async () => {
    setState({ status: 'submitting' });
    try {
      const response = await fetch('/api/dynamic/refund-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchaseId, reason }),
      });

      if (!response.ok) {
        const error = await response.json();
        setState({ status: 'error', errorMessage: error.message ?? 'Refund request failed' });
        return;
      }

      const data = await response.json();
      if (data.status === 'INELIGIBLE') {
        setState({ status: 'ineligible', reason: data.reason });
      } else {
        setState({ status: 'initiated', refundId: data.refundId });
      }
    } catch {
      setState({ status: 'error', errorMessage: 'Network error' });
    }
  };

  return (
    <div className="max-w-lg mx-auto p-6" data-testid="refund-page">
      <h1 className="text-2xl font-bold mb-6">Request Refund</h1>

      {state.status === 'idle' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Purchase ID</label>
            <input
              type="text"
              value={purchaseId}
              onChange={(e) => setPurchaseId(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              data-testid="purchase-id-input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Reason for Refund</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              rows={3}
              data-testid="reason-input"
            />
          </div>
          <button
            onClick={handleRefund}
            className="w-full bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
            data-testid="submit-refund-button"
          >
            Submit Refund Request
          </button>
        </div>
      )}

      {state.status === 'submitting' && (
        <div className="text-center" data-testid="submitting-state">
          <p className="text-gray-600">Processing refund request...</p>
        </div>
      )}

      {state.status === 'initiated' && (
        <div className="bg-green-50 p-4 rounded-md" data-testid="refund-initiated-state">
          <h2 className="font-semibold text-green-800">Refund Initiated</h2>
          <p className="text-green-600 mt-1">
            Your refund request has been submitted and is being processed.
          </p>
          <p className="text-xs text-gray-500 mt-2">Refund ID: {state.refundId}</p>
        </div>
      )}

      {state.status === 'ineligible' && (
        <div className="bg-yellow-50 p-4 rounded-md" data-testid="refund-ineligible-state">
          <h2 className="font-semibold text-yellow-800">Refund Not Eligible</h2>
          <p className="text-yellow-600 mt-1">
            {state.reason === 'REFUND_WINDOW_EXPIRED'
              ? 'The refund window for this purchase has expired.'
              : 'This purchase is not eligible for a refund.'}
          </p>
        </div>
      )}

      {state.status === 'error' && (
        <div className="bg-red-50 p-4 rounded-md" data-testid="refund-error-state">
          <p className="text-red-800">{state.errorMessage}</p>
          <button
            onClick={() => setState({ status: 'idle' })}
            className="mt-2 text-sm text-red-700 underline"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
};

export default RefundPage;

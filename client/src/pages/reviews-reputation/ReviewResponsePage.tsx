/**
 * ReviewResponsePage — FLOW-10 T172
 * Entity owner posts a response to a review.
 * revision_allowed:true only for content_policy rejection.
 */
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';

interface ResponseState {
  status: 'idle' | 'loading' | 'success' | 'rejected';
  rejectionReason?: string;
  revisionAllowed?: boolean;
}

export function ReviewResponsePage() {
  const { reviewId } = useParams<{ reviewId: string }>();
  const [responseText, setResponseText] = useState('');
  const [responseState, setResponseState] = useState<ResponseState>({ status: 'idle' });
  const [alreadyResponded] = useState(false); // Would be loaded from API

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!responseText.trim()) return;

    setResponseState({ status: 'loading' });
    setTimeout(() => {
      // Simulate successful response
      setResponseState({ status: 'success' });
    }, 300);
  }

  const isDisabled =
    alreadyResponded || responseState.status === 'loading' || responseState.status === 'success';

  return (
    <div className="p-6 max-w-xl" data-testid="review-response-page">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Respond to Review</h1>
      <p className="text-sm text-gray-500 mb-4">Review ID: {reviewId}</p>

      {responseState.status === 'success' && (
        <div
          data-testid="response-success"
          className="p-4 bg-green-50 border border-green-200 rounded mb-4"
        >
          <p className="text-green-700 font-medium">Response published successfully!</p>
        </div>
      )}

      {responseState.status === 'rejected' && (
        <div
          data-testid="response-rejected"
          className="p-4 bg-red-50 border border-red-200 rounded mb-4"
        >
          <p className="text-red-700 font-medium">
            Response rejected: {responseState.rejectionReason}
          </p>
          {responseState.revisionAllowed && (
            <p className="text-sm text-red-600 mt-1" data-testid="revision-allowed-message">
              You may revise and resubmit your response.
            </p>
          )}
          {!responseState.revisionAllowed && (
            <p className="text-sm text-red-600 mt-1" data-testid="no-revision-message">
              Revision is not allowed for this rejection reason.
            </p>
          )}
        </div>
      )}

      {alreadyResponded && (
        <div
          data-testid="already-responded-notice"
          className="p-4 bg-gray-50 border border-gray-200 rounded mb-4"
        >
          <p className="text-gray-600">You have already responded to this review.</p>
        </div>
      )}

      <form onSubmit={handleSubmit} data-testid="response-form">
        <div className="mb-4">
          <label htmlFor="response-text" className="block text-sm font-medium text-gray-700 mb-1">
            Your Response
          </label>
          <textarea
            id="response-text"
            value={responseText}
            onChange={(e) => setResponseText(e.target.value)}
            disabled={isDisabled}
            className="border rounded px-3 py-2 w-full disabled:bg-gray-100 disabled:cursor-not-allowed"
            rows={4}
            data-testid="response-text-input"
            placeholder="Write your response to this review..."
          />
        </div>

        <button
          type="submit"
          disabled={isDisabled || !responseText.trim()}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          data-testid="submit-response-button"
        >
          {responseState.status === 'loading' ? 'Submitting...' : 'Submit Response'}
        </button>
      </form>
    </div>
  );
}

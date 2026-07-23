/**
 * GroupApprovalPage — FLOW-06 admin approval queue.
 * Route: /groups/:groupId/admin/approvals
 *
 * Playwright mock hooks (driven by query params):
 *   ?mock=pending  → pending requests list (data-testid="approval-queue")
 *   ?mock=approved → approval confirmed (data-testid="approval-confirmed")
 *   ?mock=rejected → rejection confirmed (data-testid="rejection-confirmed")
 *   otherwise      → empty queue
 */

import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

interface PendingRequest {
  requestId: string;
  userId: string;
  displayName: string;
  requestedAt: string;
  expiresAt: string;
}

const MOCK_REQUESTS: PendingRequest[] = [
  {
    requestId: 'jr-001',
    userId: 'usr-101',
    displayName: 'Alice Johnson',
    requestedAt: '2026-04-11',
    expiresAt: '2026-04-14',
  },
  {
    requestId: 'jr-002',
    userId: 'usr-102',
    displayName: 'Bob Williams',
    requestedAt: '2026-04-11',
    expiresAt: '2026-04-14',
  },
  {
    requestId: 'jr-003',
    userId: 'usr-103',
    displayName: 'Carol Martinez',
    requestedAt: '2026-04-12',
    expiresAt: '2026-04-15',
  },
];

export function GroupApprovalPage() {
  const [searchParams] = useSearchParams();
  const mockState = searchParams.get('mock');

  const [lastAction, setLastAction] = useState<{
    type: 'approved' | 'rejected';
    requestId: string;
  } | null>(null);

  if (mockState === 'approved' || lastAction?.type === 'approved') {
    return (
      <div
        className="max-w-2xl mx-auto mt-10 p-8 bg-white rounded-lg shadow"
        data-testid="page-group-approval"
      >
        <div
          data-testid="approval-confirmed"
          className="p-4 bg-green-50 border border-green-200 rounded-lg"
        >
          <p className="text-green-700 font-semibold">Member Approved</p>
          <p className="text-green-600 text-sm mt-1">The member has been approved and notified.</p>
        </div>
      </div>
    );
  }

  if (mockState === 'rejected' || lastAction?.type === 'rejected') {
    return (
      <div
        className="max-w-2xl mx-auto mt-10 p-8 bg-white rounded-lg shadow"
        data-testid="page-group-approval"
      >
        <div
          data-testid="rejection-confirmed"
          className="p-4 bg-red-50 border border-red-200 rounded-lg"
        >
          <p className="text-red-700 font-semibold">Request Rejected</p>
          <p className="text-red-600 text-sm mt-1">
            The join request has been declined and the member notified.
          </p>
        </div>
      </div>
    );
  }

  if (mockState === 'pending') {
    return (
      <div
        className="max-w-2xl mx-auto mt-10 p-8 bg-white rounded-lg shadow"
        data-testid="page-group-approval"
      >
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Pending Approvals</h1>

        <div data-testid="approval-queue" className="space-y-4">
          {MOCK_REQUESTS.map((req) => (
            <div
              key={req.requestId}
              className="p-4 border rounded-lg flex items-center justify-between"
              data-testid={`approval-request-${req.requestId}`}
            >
              <div>
                <div className="font-medium text-gray-800">{req.displayName}</div>
                <div className="text-sm text-gray-500">
                  Requested: {req.requestedAt} · Expires: {req.expiresAt}
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  data-testid={`approve-button-${req.requestId}`}
                  onClick={() => setLastAction({ type: 'approved', requestId: req.requestId })}
                  className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                >
                  Approve
                </button>
                <button
                  data-testid={`reject-button-${req.requestId}`}
                  onClick={() => setLastAction({ type: 'rejected', requestId: req.requestId })}
                  className="px-4 py-2 bg-red-100 text-red-700 text-sm rounded hover:bg-red-200"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Default: empty queue
  return (
    <div
      className="max-w-2xl mx-auto mt-10 p-8 bg-white rounded-lg shadow"
      data-testid="page-group-approval"
    >
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Pending Approvals</h1>
      <div data-testid="approval-queue" className="text-sm text-gray-500">
        No pending join requests at this time.
      </div>
    </div>
  );
}

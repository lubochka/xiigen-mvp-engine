/**
 * FLOW-07 — FriendRequestPage
 * Send and manage friend requests.
 * Data operations via /api/dynamic/xiigen-friend-requests
 */

import React, { useState } from 'react';

interface FriendRequest {
  requestId: string;
  senderUserId: string;
  recipientUserId: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'BLOCKED';
  sentAt: string;
}

export function FriendRequestPage() {
  const [recipientId, setRecipientId] = useState('');
  const [message, setMessage] = useState('');
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const sendRequest = async () => {
    if (!recipientId.trim()) return;
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const resp = await fetch('/api/dynamic/xiigen-friend-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientUserId: recipientId, message }),
      });
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        if (resp.status === 429) {
          setError('Rate limit exceeded. Please try again later.');
        } else {
          setError(body?.message ?? 'Failed to send friend request');
        }
        return;
      }
      setSuccessMsg('Friend request sent successfully');
      setRecipientId('');
      setMessage('');
      await loadRequests();
    } catch (e) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const loadRequests = async () => {
    try {
      const resp = await fetch('/api/dynamic/xiigen-friend-requests');
      if (resp.ok) {
        const data = await resp.json();
        setRequests(data?.hits ?? []);
      }
    } catch {
      // ignore
    }
  };

  const respondToRequest = async (requestId: string, response: 'ACCEPT' | 'REJECT') => {
    try {
      await fetch(`/api/dynamic/xiigen-friend-requests/${requestId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response }),
      });
      await loadRequests();
    } catch {
      // ignore
    }
  };

  React.useEffect(() => {
    loadRequests();
  }, []);

  return (
    <div className="p-6" data-testid="friend-request-page">
      <h1 className="text-2xl font-bold mb-6">Friend Requests</h1>

      <section className="bg-white rounded shadow p-4 mb-6" data-testid="send-request-form">
        <h2 className="text-lg font-semibold mb-3">Send Friend Request</h2>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            className="border rounded px-3 py-2 flex-1"
            placeholder="Recipient User ID"
            value={recipientId}
            onChange={(e) => setRecipientId(e.target.value)}
            data-testid="recipient-id-input"
          />
        </div>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            className="border rounded px-3 py-2 flex-1"
            placeholder="Optional message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            data-testid="request-message-input"
          />
        </div>
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
          onClick={sendRequest}
          disabled={loading || !recipientId.trim()}
          data-testid="send-request-btn"
        >
          {loading ? 'Sending...' : 'Send Request'}
        </button>
        {error && (
          <p className="text-red-600 mt-2" data-testid="request-error">
            {error}
          </p>
        )}
        {successMsg && (
          <p className="text-green-600 mt-2" data-testid="request-success">
            {successMsg}
          </p>
        )}
      </section>

      <section data-testid="pending-requests">
        <h2 className="text-lg font-semibold mb-3">Pending Requests</h2>
        {requests.length === 0 ? (
          <p className="text-gray-500" data-testid="no-requests">
            No pending requests
          </p>
        ) : (
          <ul className="space-y-2">
            {requests
              .filter((r) => r.status === 'PENDING')
              .map((req) => (
                <li
                  key={req.requestId}
                  className="bg-white rounded shadow p-3 flex items-center gap-2"
                  data-testid="request-item"
                >
                  <span className="flex-1">From: {req.senderUserId}</span>
                  <span className="text-sm text-gray-500">{req.sentAt}</span>
                  <button
                    className="bg-green-500 text-white px-2 py-1 rounded text-sm"
                    onClick={() => respondToRequest(req.requestId, 'ACCEPT')}
                    data-testid="accept-btn"
                  >
                    Accept
                  </button>
                  <button
                    className="bg-red-500 text-white px-2 py-1 rounded text-sm"
                    onClick={() => respondToRequest(req.requestId, 'REJECT')}
                    data-testid="reject-btn"
                  >
                    Reject
                  </button>
                </li>
              ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default FriendRequestPage;

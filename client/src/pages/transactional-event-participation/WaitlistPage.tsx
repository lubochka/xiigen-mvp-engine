import React, { useState } from 'react';

interface WaitlistState {
  status: 'idle' | 'joining' | 'joined' | 'error';
  waitlistId?: string;
  position?: number;
  joinedAt?: string;
  errorMessage?: string;
}

export const WaitlistPage: React.FC = () => {
  const [state, setState] = useState<WaitlistState>({ status: 'idle' });
  const [eventId, setEventId] = useState('');
  const [ticketTier, setTicketTier] = useState('GENERAL');

  const handleJoinWaitlist = async () => {
    setState({ status: 'joining' });
    try {
      const response = await fetch('/api/dynamic/waitlist-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, ticketTier }),
      });

      if (!response.ok) {
        const error = await response.json();
        setState({ status: 'error', errorMessage: error.message ?? 'Failed to join waitlist' });
        return;
      }

      const data = await response.json();
      setState({
        status: 'joined',
        waitlistId: data.waitlistId,
        position: data.position,
        joinedAt: data.joinedAt,
      });
    } catch {
      setState({ status: 'error', errorMessage: 'Network error' });
    }
  };

  return (
    <div className="max-w-lg mx-auto p-6" data-testid="waitlist-page">
      <h1 className="text-2xl font-bold mb-6">Join Waitlist</h1>

      {state.status === 'idle' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Event ID</label>
            <input
              type="text"
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              data-testid="event-id-input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Ticket Tier</label>
            <select
              value={ticketTier}
              onChange={(e) => setTicketTier(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="GENERAL">General Admission</option>
              <option value="VIP">VIP</option>
            </select>
          </div>
          <button
            onClick={handleJoinWaitlist}
            className="w-full bg-yellow-500 text-white px-4 py-2 rounded-md hover:bg-yellow-600"
            data-testid="join-waitlist-button"
          >
            Join Waitlist
          </button>
        </div>
      )}

      {state.status === 'joining' && (
        <div className="text-center" data-testid="joining-state">
          <p className="text-gray-600">Joining waitlist...</p>
        </div>
      )}

      {state.status === 'joined' && (
        <div className="bg-yellow-50 p-4 rounded-md" data-testid="joined-state">
          <h2 className="font-semibold text-yellow-800">You are on the waitlist!</h2>
          <p className="text-yellow-600 mt-1">
            You are position <strong data-testid="waitlist-position">{state.position}</strong> in
            the queue.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            We will notify you by email if a spot becomes available.
          </p>
          <p className="text-xs text-gray-400 mt-1">Waitlist ID: {state.waitlistId}</p>
        </div>
      )}

      {state.status === 'error' && (
        <div className="bg-red-50 p-4 rounded-md" data-testid="error-state">
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

export default WaitlistPage;

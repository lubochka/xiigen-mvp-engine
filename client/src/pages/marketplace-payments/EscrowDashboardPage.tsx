/**
 * EscrowDashboardPage — FLOW-16 Marketplace Payments
 *
 * Displays escrow status for a given order. Provides Release and Dispute actions.
 * Release triggers EscrowReleaseRequested; Dispute triggers DisputeInitiated.
 */

import React, { useState } from 'react';

type EscrowStatus = 'HOLDING' | 'RELEASED' | 'DISPUTED' | 'NOT_FOUND';
type ActionStatus = 'idle' | 'loading' | 'done' | 'error';

interface EscrowRecord {
  escrowId: string;
  orderId: string;
  status: EscrowStatus;
  amountCents: number;
  createdAt: string;
}

const MOCK_ESCROW: EscrowRecord = {
  escrowId: 'escrow-demo-001',
  orderId: 'order-demo-001',
  status: 'HOLDING',
  amountCents: 4999,
  createdAt: '2026-04-13T10:00:00Z',
};

export function EscrowDashboardPage(): React.ReactElement {
  const [orderId, setOrderId] = useState('');
  const [escrow, setEscrow] = useState<EscrowRecord | null>(null);
  const [lookupStatus, setLookupStatus] = useState<'idle' | 'loading' | 'done'>('idle');
  const [actionStatus, setActionStatus] = useState<ActionStatus>('idle');
  const [actionMessage, setActionMessage] = useState('');

  function handleLookup(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    setLookupStatus('loading');
    setEscrow(null);
    setActionStatus('idle');
    setActionMessage('');

    setTimeout(() => {
      // Demo: return mock record for any non-empty orderId
      if (orderId.trim()) {
        setEscrow({ ...MOCK_ESCROW, orderId: orderId.trim() });
      }
      setLookupStatus('done');
    }, 400);
  }

  function handleRelease(): void {
    if (!escrow) return;
    setActionStatus('loading');
    setActionMessage('');

    // In production: POST /api/dynamic/xiigen-escrow-commands  { type: 'EscrowReleaseRequested', orderId }
    setTimeout(() => {
      setEscrow(prev => prev ? { ...prev, status: 'RELEASED' } : null);
      setActionStatus('done');
      setActionMessage('Escrow released. Payout will be processed shortly.');
    }, 600);
  }

  function handleDispute(): void {
    if (!escrow) return;
    setActionStatus('loading');
    setActionMessage('');

    // In production: POST /api/dynamic/xiigen-escrow-commands  { type: 'DisputeInitiated', orderId }
    setTimeout(() => {
      setEscrow(prev => prev ? { ...prev, status: 'DISPUTED' } : null);
      setActionStatus('done');
      setActionMessage('Dispute opened. A case manager will review within 48 hours.');
    }, 600);
  }

  const statusColors: Record<EscrowStatus, string> = {
    HOLDING: 'bg-yellow-50 text-yellow-800',
    RELEASED: 'bg-green-50 text-green-800',
    DISPUTED: 'bg-red-50 text-red-800',
    NOT_FOUND: 'bg-gray-50 text-gray-600',
  };

  return (
    <main className="mx-auto max-w-lg p-6">
      <h1 className="mb-4 text-2xl font-semibold text-gray-800">Escrow Dashboard</h1>

      {/* Lookup form */}
      <form onSubmit={handleLookup} className="mb-6 flex gap-2">
        <input
          type="text"
          value={orderId}
          onChange={e => setOrderId(e.target.value)}
          placeholder="Order ID"
          className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Look Up
        </button>
      </form>

      {lookupStatus === 'loading' && (
        <p role="status" className="text-sm text-gray-500">Loading escrow record…</p>
      )}

      {lookupStatus === 'done' && !escrow && (
        <p className="text-sm text-gray-500">No escrow record found for that order ID.</p>
      )}

      {escrow && (
        <div className="space-y-4">
          {/* Status badge */}
          <div className={`inline-block rounded px-3 py-1 text-sm font-medium ${statusColors[escrow.status]}`}>
            {escrow.status}
          </div>

          {/* Escrow details */}
          <dl className="space-y-2 text-sm text-gray-700">
            <div className="flex gap-2">
              <dt className="font-medium">Escrow ID:</dt>
              <dd>{escrow.escrowId}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="font-medium">Order ID:</dt>
              <dd>{escrow.orderId}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="font-medium">Amount:</dt>
              <dd>${(escrow.amountCents / 100).toFixed(2)}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="font-medium">Created:</dt>
              <dd>{new Date(escrow.createdAt).toLocaleString()}</dd>
            </div>
          </dl>

          {/* Actions — only available when HOLDING */}
          {escrow.status === 'HOLDING' && actionStatus !== 'done' && (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleRelease}
                disabled={actionStatus === 'loading'}
                className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {actionStatus === 'loading' ? 'Processing…' : 'Release Funds'}
              </button>
              <button
                type="button"
                onClick={handleDispute}
                disabled={actionStatus === 'loading'}
                className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {actionStatus === 'loading' ? 'Processing…' : 'Open Dispute'}
              </button>
            </div>
          )}

          {actionStatus === 'done' && actionMessage && (
            <p role="status" className="rounded bg-blue-50 px-3 py-2 text-sm text-blue-700">
              {actionMessage}
            </p>
          )}

          {actionStatus === 'error' && (
            <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
              Action failed. Please try again.
            </p>
          )}
        </div>
      )}
    </main>
  );
}

export default EscrowDashboardPage;

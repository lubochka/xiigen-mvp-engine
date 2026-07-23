import React, { useEffect, useState } from 'react';

interface QRCodeData {
  ticketId: string;
  qrToken: string;
  eventId: string;
  generatedAt: string;
}

export const QRCodePage: React.FC = () => {
  const [qrData, setQrData] = useState<QRCodeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const ticketId = new URLSearchParams(window.location.search).get('ticketId') ?? '';

  useEffect(() => {
    const fetchQR = async () => {
      if (!ticketId) {
        setError('No ticket ID provided');
        setLoading(false);
        return;
      }
      try {
        const response = await fetch(`/api/dynamic/ticket-qr-codes?ticketId=${ticketId}`);
        if (!response.ok) {
          setError('QR code not found');
          return;
        }
        const data = await response.json();
        setQrData(data);
      } catch {
        setError('Failed to load QR code');
      } finally {
        setLoading(false);
      }
    };

    fetchQR();
  }, [ticketId]);

  if (loading)
    return (
      <div className="p-6 text-center" data-testid="loading">
        Loading QR code...
      </div>
    );

  if (error) {
    return (
      <div className="p-6" data-testid="qr-error">
        <div className="bg-red-50 p-4 rounded-md">
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  if (!qrData) return null;

  return (
    <div className="max-w-lg mx-auto p-6 text-center" data-testid="qr-code-page">
      <h1 className="text-2xl font-bold mb-6">Your Ticket QR Code</h1>

      <div className="bg-white border-2 border-gray-200 rounded-lg p-8 inline-block">
        {/* QR code display — token displayed for demo purposes */}
        <div
          className="w-48 h-48 bg-gray-100 flex items-center justify-center mx-auto"
          data-testid="qr-code-display"
          data-token={qrData.qrToken}
        >
          <div className="text-xs text-gray-500 text-center p-2 break-all">
            QR Token: {qrData.qrToken.substring(0, 20)}...
          </div>
        </div>
      </div>

      <div className="mt-4 text-sm text-gray-600 space-y-1">
        <div>
          Ticket ID: <span data-testid="ticket-id">{qrData.ticketId}</span>
        </div>
        <div>Event: {qrData.eventId}</div>
        <div>Generated: {new Date(qrData.generatedAt).toLocaleString()}</div>
      </div>

      <p className="mt-4 text-xs text-gray-500">
        Present this QR code at the venue entrance for scanning.
      </p>
    </div>
  );
};

export default QRCodePage;

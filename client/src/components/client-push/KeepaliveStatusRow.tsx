/**
 * KeepaliveStatusRow — displays keepalive scheduler result for a tenant.
 */

import React from 'react';

export interface KeepaliveStatusRowProps {
  tenantId: string;
  pinged: number;
  cleaned: number;
}

export function KeepaliveStatusRow({
  tenantId,
  pinged,
  cleaned,
}: KeepaliveStatusRowProps): React.ReactElement {
  return (
    <div className="keepalive-status-row" data-testid={`keepalive-row-${tenantId}`}>
      <span data-testid={`keepalive-tenant-${tenantId}`}>{tenantId}</span>
      <span
        data-testid={`keepalive-pinged-${tenantId}`}
        aria-label={`Connections pinged: ${pinged}`}
      >
        Pinged: {pinged}
      </span>
      <span
        data-testid={`keepalive-cleaned-${tenantId}`}
        aria-label={`Connections cleaned: ${cleaned}`}
      >
        Cleaned: {cleaned}
      </span>
    </div>
  );
}

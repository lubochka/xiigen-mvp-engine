/**
 * StatusBadge — colored badge that maps status strings to colors.
 * NEW component for web client.
 */
import React from 'react';

export interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

const STATUS_STYLES: Record<string, string> = {
  HEALTHY: 'bg-green-100 text-green-700',
  DEGRADED: 'bg-yellow-100 text-yellow-700',
  DOWN: 'bg-red-100 text-red-700',
  UNKNOWN: 'bg-gray-100 text-gray-500',
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-gray-100 text-gray-500',
  suspended: 'bg-yellow-100 text-yellow-700',
  GENERATED: 'bg-blue-100 text-blue-700',
  INJECTED: 'bg-yellow-100 text-yellow-700',
  MINIMAL: 'bg-green-100 text-green-700',
  CORE: 'bg-purple-100 text-purple-700',
  COMPLETED: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
  RUNNING: 'bg-blue-100 text-blue-700',
  PENDING: 'bg-gray-100 text-gray-500',
  CANCELLED: 'bg-gray-100 text-gray-500',
  BLOCKED: 'bg-red-100 text-red-700',
  REGISTERED: 'bg-green-100 text-green-700',
  SUCCESS: 'bg-green-100 text-green-700',
  SKIPPED: 'bg-gray-100 text-gray-400',
};

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const style = STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-500';
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full ${style} ${sizeClass}`}
      data-testid={`status-badge-${status}`}
    >
      {status}
    </span>
  );
}

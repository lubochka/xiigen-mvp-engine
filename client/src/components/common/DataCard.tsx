/**
 * DataCard — generic card with title, value, and optional trend indicator.
 * Translated from React Native View → HTML div with Tailwind.
 */
import React from 'react';

export interface DataCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'flat';
  color?: string;
}

export function DataCard({ title, value, subtitle, trend, color }: DataCardProps) {
  const trendIcon = trend === 'up' ? '↑' : trend === 'down' ? '↓' : trend === 'flat' ? '→' : '';
  const trendColor =
    trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-400';

  return (
    <div
      className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm"
      data-testid="data-card"
    >
      <p className="text-sm text-gray-500 mb-1" data-testid="data-card-title">
        {title}
      </p>
      <div className="flex items-baseline gap-2">
        <span
          className="text-2xl font-semibold"
          style={color ? { color } : undefined}
          data-testid="data-card-value"
        >
          {value}
        </span>
        {trendIcon && (
          <span className={`text-sm font-medium ${trendColor}`} data-testid="data-card-trend">
            {trendIcon}
          </span>
        )}
      </div>
      {subtitle && (
        <p className="text-xs text-gray-400 mt-1" data-testid="data-card-subtitle">
          {subtitle}
        </p>
      )}
    </div>
  );
}

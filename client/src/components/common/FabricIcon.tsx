/**
 * FabricIcon — maps FabricType to an inline SVG icon with fabric color.
 * Translated from React Native vector icons → inline SVG.
 */
import React from 'react';
import { fabricColor } from '../../theme/tokens';

export interface FabricIconProps {
  fabricType: string;
  size?: number;
  className?: string;
}

const ICON_PATHS: Record<string, string> = {
  DATABASE:
    'M12 2C6.48 2 2 4.24 2 7v10c0 2.76 4.48 5 10 5s10-2.24 10-5V7c0-2.76-4.48-5-10-5zm0 15c-4.42 0-8-1.79-8-4v-2.55C5.82 12 8.72 13 12 13s6.18-1 8-2.55V13c0 2.21-3.58 4-8 4z',
  QUEUE: 'M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z',
  AI_ENGINE:
    'M21 10.12h-6.78l2.74-2.82-2.2-2.2L9 10.88V19h8.12l5.78-5.78-1.9-3.1zM12 17.5v-5.5l3.5 3.5L12 19z',
  RAG: 'M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z',
  CORE: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z',
  FLOW_ENGINE:
    'M14 4l2.29 2.29-2.88 2.88 1.42 1.42 2.88-2.88L20 10V4zm-4 0H4v6l2.29-2.29 4.71 4.7V20h2v-8.41l-5.29-5.3z',
  SECRETS:
    'M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z',
};

export function FabricIcon({ fabricType, size = 20, className = '' }: FabricIconProps) {
  const color = fabricColor(fabricType);
  const path = ICON_PATHS[fabricType] ?? ICON_PATHS.CORE;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      className={className}
      data-testid={`fabric-icon-${fabricType}`}
      role="img"
      aria-label={`${fabricType} fabric`}
    >
      <path d={path} />
    </svg>
  );
}

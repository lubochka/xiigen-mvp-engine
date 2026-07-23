/**
 * XIIGen Client — Design Tokens
 *
 * Fabric-first theme: visual values from config, not hardcoded.
 * Translated from React Native → web (same values, no StyleSheet).
 */

export interface ColorTokens {
  background: string;
  surface: string;
  surfaceElevated: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;
  primary: string;
  primaryLight: string;
  primaryDark: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  fabricDatabase: string;
  fabricQueue: string;
  fabricAiEngine: string;
  fabricRag: string;
  fabricCore: string;
  fabricFlowEngine: string;
  nodeWaiting: string;
  nodeRunning: string;
  nodeCompleted: string;
  nodeFailed: string;
  nodeSkipped: string;
}

export const LIGHT_COLORS: ColorTokens = {
  background: '#F8F9FB',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  border: '#E2E5EA',
  textPrimary: '#111827',
  textSecondary: '#4B5563',
  textMuted: '#9CA3AF',
  textInverse: '#FFFFFF',
  primary: '#2563EB',
  primaryLight: '#DBEAFE',
  primaryDark: '#1D4ED8',
  success: '#059669',
  warning: '#D97706',
  error: '#DC2626',
  info: '#2563EB',
  fabricDatabase: '#2563EB',
  fabricQueue: '#7C3AED',
  fabricAiEngine: '#059669',
  fabricRag: '#D97706',
  fabricCore: '#111827',
  fabricFlowEngine: '#DC2626',
  nodeWaiting: '#9CA3AF',
  nodeRunning: '#3B82F6',
  nodeCompleted: '#059669',
  nodeFailed: '#DC2626',
  nodeSkipped: '#D1D5DB',
};

export const DARK_COLORS: ColorTokens = {
  background: '#0F1117',
  surface: '#1A1D27',
  surfaceElevated: '#252830',
  border: '#2E3340',
  textPrimary: '#F3F4F6',
  textSecondary: '#D1D5DB',
  textMuted: '#6B7280',
  textInverse: '#111827',
  primary: '#60A5FA',
  primaryLight: '#1E3A5F',
  primaryDark: '#93BBFD',
  success: '#34D399',
  warning: '#FBBF24',
  error: '#F87171',
  info: '#60A5FA',
  fabricDatabase: '#60A5FA',
  fabricQueue: '#A78BFA',
  fabricAiEngine: '#34D399',
  fabricRag: '#FBBF24',
  fabricCore: '#F3F4F6',
  fabricFlowEngine: '#F87171',
  nodeWaiting: '#6B7280',
  nodeRunning: '#60A5FA',
  nodeCompleted: '#34D399',
  nodeFailed: '#F87171',
  nodeSkipped: '#374151',
};

export interface SpacingTokens {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
}
export const SPACING: SpacingTokens = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };

export interface TypographyTokens {
  fontFamily: string;
  fontFamilyMono: string;
  sizeXs: number;
  sizeSm: number;
  sizeMd: number;
  sizeLg: number;
  sizeXl: number;
  sizeXxl: number;
  weightRegular: string;
  weightMedium: string;
  weightSemibold: string;
  weightBold: string;
}
export const TYPOGRAPHY: TypographyTokens = {
  fontFamily: 'Inter, system-ui, sans-serif',
  fontFamilyMono: 'JetBrains Mono, monospace',
  sizeXs: 11,
  sizeSm: 13,
  sizeMd: 15,
  sizeLg: 18,
  sizeXl: 22,
  sizeXxl: 28,
  weightRegular: '400',
  weightMedium: '500',
  weightSemibold: '600',
  weightBold: '700',
};

export interface ShapeTokens {
  radiusSm: number;
  radiusMd: number;
  radiusLg: number;
  radiusFull: number;
}
export const SHAPE: ShapeTokens = { radiusSm: 4, radiusMd: 8, radiusLg: 12, radiusFull: 9999 };

export interface ThemeTokens {
  mode: 'light' | 'dark';
  colors: ColorTokens;
  spacing: SpacingTokens;
  typography: TypographyTokens;
  shape: ShapeTokens;
}

export function createTheme(mode: 'light' | 'dark'): ThemeTokens {
  return {
    mode,
    colors: mode === 'dark' ? DARK_COLORS : LIGHT_COLORS,
    spacing: SPACING,
    typography: TYPOGRAPHY,
    shape: SHAPE,
  };
}

export const DEFAULT_THEME = createTheme('light');

/** Map FabricType → color. */
export function fabricColor(fabricType: string, theme: ThemeTokens = DEFAULT_THEME): string {
  const map: Record<string, string> = {
    DATABASE: theme.colors.fabricDatabase,
    QUEUE: theme.colors.fabricQueue,
    AI_ENGINE: theme.colors.fabricAiEngine,
    RAG: theme.colors.fabricRag,
    CORE: theme.colors.fabricCore,
    FLOW_ENGINE: theme.colors.fabricFlowEngine,
  };
  return map[fabricType] ?? theme.colors.textMuted;
}

/** Map health/status → color. */
export function statusColor(status: string, theme: ThemeTokens = DEFAULT_THEME): string {
  const map: Record<string, string> = {
    HEALTHY: theme.colors.success,
    DEGRADED: theme.colors.warning,
    DOWN: theme.colors.error,
    UNKNOWN: theme.colors.textMuted,
    active: theme.colors.success,
    inactive: theme.colors.textMuted,
    suspended: theme.colors.warning,
    GENERATED: theme.colors.info,
    INJECTED: theme.colors.warning,
    MINIMAL: theme.colors.success,
    CORE: theme.colors.primary,
    COMPLETED: theme.colors.success,
    FAILED: theme.colors.error,
    RUNNING: theme.colors.info,
    PENDING: theme.colors.textMuted,
    CANCELLED: theme.colors.textMuted,
  };
  return map[status] ?? theme.colors.textMuted;
}

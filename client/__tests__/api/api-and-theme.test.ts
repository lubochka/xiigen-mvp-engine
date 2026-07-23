/**
 * P10.1 Tests — API Layer + Theme + Common Components + App Routing
 */

// ══════════════════════════════════════════════════════
// API Types
// ══════════════════════════════════════════════════════

import {
  successResult, failureResult, PAGE_NAMES,
  type DataProcessResult, type ApiConfig,
} from '../../src/api/types';

describe('API Types', () => {
  it('successResult should create success DataProcessResult', () => {
    const r = successResult({ count: 5 });
    expect(r.isSuccess).toBe(true);
    expect(r.data).toEqual({ count: 5 });
    expect(r.error).toBeNull();
    expect(r.metadata.timestamp).toBeDefined();
  });

  it('failureResult should create failure DataProcessResult', () => {
    const r = failureResult<string>('NOT_FOUND', 'Item missing');
    expect(r.isSuccess).toBe(false);
    expect(r.data).toBeNull();
    expect(r.error!.code).toBe('NOT_FOUND');
    expect(r.error!.message).toBe('Item missing');
  });

  it('PAGE_NAMES should have exactly 10 entries', () => {
    expect(PAGE_NAMES).toHaveLength(10);
    expect(PAGE_NAMES).toContain('Dashboard');
    expect(PAGE_NAMES).toContain('GenerationLab');
    expect(PAGE_NAMES).toContain('QualityDashboard');
  });
});

// ══════════════════════════════════════════════════════
// API Endpoints
// ══════════════════════════════════════════════════════

import { ENDPOINTS, resolvePath, type EndpointKey } from '../../src/api/endpoints';

describe('API Endpoints', () => {
  it('should have health endpoints', () => {
    expect(ENDPOINTS.healthLive.path).toBe('/health/live');
    expect(ENDPOINTS.healthReady.method).toBe('GET');
    expect(ENDPOINTS.healthStatus.fabric).toBe('CORE');
  });

  it('should have tenant endpoints', () => {
    expect(ENDPOINTS.tenantCreate.method).toBe('POST');
    expect(ENDPOINTS.tenantList.path).toBe('/tenants');
    expect(ENDPOINTS.tenantById.path).toBe('/tenants/:id');
    expect(ENDPOINTS.tenantDelete.method).toBe('DELETE');
  });

  it('should have engine endpoints', () => {
    expect(ENDPOINTS.engineGenerate.method).toBe('POST');
    expect(ENDPOINTS.engineHistory.path).toBe('/engine/history');
    expect(ENDPOINTS.engineContracts.path).toBe('/engine/contracts');
  });

  it('resolvePath should replace :params', () => {
    expect(resolvePath('/tenants/:id', { id: '123' })).toBe('/tenants/123');
    expect(resolvePath('/engine/contracts/:id', { id: 'T44' })).toBe('/engine/contracts/T44');
  });

  it('resolvePath should return path unchanged without params', () => {
    expect(resolvePath('/health/live')).toBe('/health/live');
  });

  it('resolvePath should encode special characters', () => {
    expect(resolvePath('/items/:id', { id: 'a b' })).toBe('/items/a%20b');
  });

  it('should have all expected endpoint keys', () => {
    const keys: EndpointKey[] = [
      'healthLive', 'healthReady', 'healthStatus',
      'tenantCreate', 'tenantList', 'tenantById',
      'engineGenerate', 'engineHistory', 'engineStatus',
      'registryFactories', 'flowDefinitions', 'freedomConfig',
    ];
    for (const k of keys) {
      expect(ENDPOINTS[k]).toBeDefined();
      expect(ENDPOINTS[k].path).toBeDefined();
      expect(ENDPOINTS[k].method).toBeDefined();
    }
  });
});

// ══════════════════════════════════════════════════════
// API Client
// ══════════════════════════════════════════════════════

import { ApiClient } from '../../src/api/client';

describe('ApiClient', () => {
  it('should construct with default config', () => {
    const client = new ApiClient();
    const config = client.getConfig();
    expect(config.baseUrl).toBeDefined();
    expect(config.defaultTimeout).toBeGreaterThan(0);
    expect(config.retryAttempts).toBeGreaterThanOrEqual(0);
  });

  it('should accept custom config', () => {
    const client = new ApiClient({ baseUrl: 'https://api.example.com', retryAttempts: 5 });
    expect(client.getConfig().baseUrl).toBe('https://api.example.com');
    expect(client.getConfig().retryAttempts).toBe(5);
  });

  it('configure should update config', () => {
    const client = new ApiClient();
    client.configure({ defaultTenantId: 'tenant-A' });
    expect(client.getConfig().defaultTenantId).toBe('tenant-A');
  });

  it('get should return failure on network error', async () => {
    // No server running → fetch will fail
    const client = new ApiClient({
      baseUrl: 'http://localhost:19999',
      retryAttempts: 0,
      defaultTimeout: 500,
    });
    const result = await client.get('healthLive');
    expect(result.isSuccess).toBe(false);
    expect(result.error!.code).toBe('NETWORK_ERROR');
  });

  it('post should return failure on network error', async () => {
    const client = new ApiClient({
      baseUrl: 'http://localhost:19999',
      retryAttempts: 0,
      defaultTimeout: 500,
    });
    const result = await client.post('engineGenerate', {
      tenantId: 't1',
      body: { task_type_id: 'T44' },
    });
    expect(result.isSuccess).toBe(false);
  });
});

// ══════════════════════════════════════════════════════
// Theme Tokens
// ══════════════════════════════════════════════════════

import {
  LIGHT_COLORS, DARK_COLORS, SPACING, TYPOGRAPHY, SHAPE,
  createTheme, DEFAULT_THEME, fabricColor, statusColor,
} from '../../src/theme/tokens';

describe('Theme Tokens', () => {
  it('LIGHT_COLORS should have all required keys', () => {
    expect(LIGHT_COLORS.background).toBeDefined();
    expect(LIGHT_COLORS.primary).toBeDefined();
    expect(LIGHT_COLORS.success).toBeDefined();
    expect(LIGHT_COLORS.fabricDatabase).toBeDefined();
    expect(LIGHT_COLORS.nodeCompleted).toBeDefined();
  });

  it('DARK_COLORS should have all required keys', () => {
    expect(DARK_COLORS.background).toBeDefined();
    expect(DARK_COLORS.primary).toBeDefined();
  });

  it('SPACING should have xs through xxl', () => {
    expect(SPACING.xs).toBe(4);
    expect(SPACING.md).toBe(16);
    expect(SPACING.xxl).toBe(48);
  });

  it('TYPOGRAPHY should have font families', () => {
    expect(TYPOGRAPHY.fontFamily).toContain('sans-serif');
    expect(TYPOGRAPHY.fontFamilyMono).toContain('monospace');
  });

  it('SHAPE should have radii', () => {
    expect(SHAPE.radiusSm).toBe(4);
    expect(SHAPE.radiusFull).toBe(9999);
  });

  it('createTheme should produce light theme', () => {
    const t = createTheme('light');
    expect(t.mode).toBe('light');
    expect(t.colors).toBe(LIGHT_COLORS);
  });

  it('createTheme should produce dark theme', () => {
    const t = createTheme('dark');
    expect(t.mode).toBe('dark');
    expect(t.colors).toBe(DARK_COLORS);
  });

  it('DEFAULT_THEME should be light', () => {
    expect(DEFAULT_THEME.mode).toBe('light');
  });

  it('fabricColor should map fabric types to colors', () => {
    expect(fabricColor('DATABASE')).toBe(LIGHT_COLORS.fabricDatabase);
    expect(fabricColor('QUEUE')).toBe(LIGHT_COLORS.fabricQueue);
    expect(fabricColor('AI_ENGINE')).toBe(LIGHT_COLORS.fabricAiEngine);
    expect(fabricColor('UNKNOWN')).toBe(LIGHT_COLORS.textMuted);
  });

  it('statusColor should map statuses to colors', () => {
    expect(statusColor('HEALTHY')).toBe(LIGHT_COLORS.success);
    expect(statusColor('DOWN')).toBe(LIGHT_COLORS.error);
    expect(statusColor('DEGRADED')).toBe(LIGHT_COLORS.warning);
    expect(statusColor('GENERATED')).toBe(LIGHT_COLORS.info);
    expect(statusColor('active')).toBe(LIGHT_COLORS.success);
  });
});

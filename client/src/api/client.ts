/**
 * XIIGen Client — Fabric-First API Client
 *
 * ALL backend communication flows through this single client.
 * Mirrors the backend's fabric pattern:
 *   - Endpoint resolution from config (never hardcoded URLs)
 *   - DataProcessResult<T> shaped responses (DNA-3)
 *   - tenantId on every request (DNA-5)
 *   - Retry with backoff on transient failures
 */

import {
  type ApiConfig,
  type ApiRequestOptions,
  type DataProcessResult,
  failureResult,
  successResult,
} from './types';
import { ENDPOINTS, type EndpointKey, resolvePath } from './endpoints';

const DEFAULT_CONFIG: ApiConfig = {
  baseUrl: '/api',
  defaultTimeout: 15000,
  retryAttempts: 2,
  retryDelay: 1000,
  defaultTenantId: 'system',
};

export class ApiClient {
  private config: ApiConfig;

  constructor(config?: Partial<ApiConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /** GET request by endpoint key. */
  async get<T>(
    endpointKey: EndpointKey,
    options?: Partial<ApiRequestOptions> & { pathParams?: Record<string, string> },
  ): Promise<DataProcessResult<T>> {
    const endpoint = ENDPOINTS[endpointKey];
    const url = this.buildUrl(endpoint.path, options?.pathParams, options?.params);
    return this.request<T>('GET', url, options);
  }

  /** POST request by endpoint key. */
  async post<T>(
    endpointKey: EndpointKey,
    options?: Partial<ApiRequestOptions> & { pathParams?: Record<string, string> },
  ): Promise<DataProcessResult<T>> {
    const endpoint = ENDPOINTS[endpointKey];
    const url = this.buildUrl(endpoint.path, options?.pathParams, options?.params);
    return this.request<T>('POST', url, options);
  }

  /** PUT request by endpoint key. */
  async put<T>(
    endpointKey: EndpointKey,
    options?: Partial<ApiRequestOptions> & { pathParams?: Record<string, string> },
  ): Promise<DataProcessResult<T>> {
    const endpoint = ENDPOINTS[endpointKey];
    const url = this.buildUrl(endpoint.path, options?.pathParams, options?.params);
    return this.request<T>('PUT', url, options);
  }

  /** DELETE request by endpoint key. */
  async del<T>(
    endpointKey: EndpointKey,
    options?: Partial<ApiRequestOptions> & { pathParams?: Record<string, string> },
  ): Promise<DataProcessResult<T>> {
    const endpoint = ENDPOINTS[endpointKey];
    const url = this.buildUrl(endpoint.path, options?.pathParams, options?.params);
    return this.request<T>('DELETE', url, options);
  }

  /** Update configuration. */
  configure(updates: Partial<ApiConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /** Get current config (for testing). */
  getConfig(): ApiConfig {
    return { ...this.config };
  }

  // ── Internal ──────────────────────────────────────

  private async request<T>(
    method: string,
    url: string,
    options?: Partial<ApiRequestOptions>,
  ): Promise<DataProcessResult<T>> {
    const tenantId = options?.tenantId ?? this.config.defaultTenantId;
    const timeout = options?.timeout ?? this.config.defaultTimeout;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Tenant-Id': tenantId,
      ...options?.headers,
    };

    const fetchOptions: RequestInit = {
      method,
      headers,
      signal: options?.signal,
    };

    if (options?.body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      fetchOptions.body = JSON.stringify(options.body);
    }

    let lastError: string = 'Unknown error';
    for (let attempt = 0; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        if (!options?.signal) {
          fetchOptions.signal = controller.signal;
        }

        const response = await fetch(url, fetchOptions);
        clearTimeout(timeoutId);

        if (!response.ok) {
          const body = await response.text();
          let parsed: Record<string, unknown> | undefined;
          try {
            parsed = JSON.parse(body);
          } catch {
            /* not JSON */
          }

          if (response.status >= 500 && attempt < this.config.retryAttempts) {
            lastError = `HTTP ${response.status}: ${body.substring(0, 200)}`;
            await this.delay(this.config.retryDelay * (attempt + 1));
            continue;
          }

          // RUN-147 V-R1 Fix S3: never surface raw JSON to the UI. The server
          // envelope uses snake_case keys (`error_message`, `error_code`,
          // `is_success`) but the client envelope uses camelCase. Extract a
          // human message from either shape. Fallback to a generic sentence
          // rather than the raw body blob (previously UX disaster — see
          // VISUAL-ROUND-0-SCORES.md marketplace finding).
          const humanMessage =
            (parsed?.['error_message'] as string | undefined) ??
            (parsed?.['errorMessage'] as string | undefined) ??
            (parsed?.['message'] as string | undefined) ??
            (parsed?.['error'] as { message?: string } | undefined)?.message ??
            `The server returned an error (HTTP ${response.status}). Please try again.`;

          return failureResult<T>(
            (parsed?.['error_code'] as string | undefined) ??
              (parsed?.['errorCode'] as string | undefined) ??
              `HTTP_${response.status}`,
            humanMessage,
            parsed as Record<string, unknown>,
          );
        }

        const data = await response.json();
        // If backend returns DataProcessResult shape, unwrap it. Accept BOTH
        // camelCase (`isSuccess`/`data`/`error`) and snake_case
        // (`is_success`/`data`/`error`) so the server-side NestJS contract and
        // any legacy handler produce identical client behaviour.
        if (typeof data === 'object' && data !== null) {
          if ('isSuccess' in data) {
            return data as DataProcessResult<T>;
          }
          if ('is_success' in data) {
            const envelope = data as Record<string, unknown>;
            if (envelope['is_success'] === true) {
              return successResult<T>(envelope['data'] as T);
            }
            return failureResult<T>(
              (envelope['error_code'] as string | undefined) ?? 'SERVER_ERROR',
              (envelope['error_message'] as string | undefined) ??
                'The server reported a failure. Please try again.',
              envelope,
            );
          }
        }
        return successResult<T>(data);
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        if (attempt < this.config.retryAttempts) {
          await this.delay(this.config.retryDelay * (attempt + 1));
          continue;
        }
      }
    }

    return failureResult<T>('NETWORK_ERROR', lastError);
  }

  private buildUrl(
    pathTemplate: string,
    pathParams?: Record<string, string>,
    queryParams?: Record<string, string | number | boolean | undefined>,
  ): string {
    const path = resolvePath(pathTemplate, pathParams);
    const base = this.config.baseUrl.replace(/\/+$/, '');
    let url = `${base}${path}`;

    if (queryParams) {
      const parts: string[] = [];
      for (const [k, v] of Object.entries(queryParams)) {
        if (v !== undefined)
          parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
      }
      if (parts.length > 0) url += `?${parts.join('&')}`;
    }

    return url;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }
}

/** Singleton instance. */
export const apiClient = new ApiClient();

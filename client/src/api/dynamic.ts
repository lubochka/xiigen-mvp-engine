/**
 * Dynamic CRUD client (DNA-6, Rule 7 in CLAUDE.md).
 *
 * Bypasses the typed ENDPOINTS registry because index names are runtime-discovered.
 * All indices MUST match `xiigen-<slug>` on the server (validated there too).
 *
 * Admin panels default to MASTER_TENANT_ID — the first-defined tenant, which
 * owns all engine state. Per-tenant callers pass an explicit `tenantId`.
 */

export const MASTER_TENANT_ID = 'xiigen-master-00000000-0000-0000-0000-000000000001';

const DEFAULT_BASE_URL = '/api';

export interface DynamicDoc extends Record<string, unknown> {
  _id?: string;
}

export interface DynamicCallOptions {
  tenantId?: string;
  baseUrl?: string;
  signal?: AbortSignal;
}

async function request<T>(
  method: string,
  url: string,
  opts: DynamicCallOptions & { body?: Record<string, unknown> },
): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-Id': opts.tenantId ?? MASTER_TENANT_ID,
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    signal: opts.signal,
  });
  const payload = (await response.json().catch(() => ({}))) as {
    success?: boolean;
    data?: T;
    error?: string;
    message?: string;
  };
  if (!response.ok || payload.success === false) {
    const err = new Error(payload.message ?? `HTTP ${response.status}`);
    (err as Error & { code?: string }).code = payload.error ?? String(response.status);
    throw err;
  }
  return payload.data as T;
}

export async function listDocs<T extends DynamicDoc = DynamicDoc>(
  indexName: string,
  filters: Record<string, unknown> = {},
  opts: DynamicCallOptions & { size?: number; from?: number } = {},
): Promise<T[]> {
  const base = opts.baseUrl ?? DEFAULT_BASE_URL;
  const qs = new URLSearchParams();
  if (opts.size !== undefined) qs.set('size', String(opts.size));
  if (opts.from !== undefined) qs.set('from', String(opts.from));
  for (const [k, v] of Object.entries(filters)) {
    if (v === undefined || v === null || v === '') continue;
    qs.set(k, String(v));
  }
  const url = `${base}/dynamic/${encodeURIComponent(indexName)}${qs.toString() ? `?${qs}` : ''}`;
  return request<T[]>('GET', url, opts);
}

export async function getDoc<T extends DynamicDoc = DynamicDoc>(
  indexName: string,
  docId: string,
  opts: DynamicCallOptions = {},
): Promise<T> {
  const base = opts.baseUrl ?? DEFAULT_BASE_URL;
  const url = `${base}/dynamic/${encodeURIComponent(indexName)}/${encodeURIComponent(docId)}`;
  return request<T>('GET', url, opts);
}

export async function createDoc<T extends DynamicDoc = DynamicDoc>(
  indexName: string,
  body: Record<string, unknown>,
  opts: DynamicCallOptions = {},
): Promise<T> {
  const base = opts.baseUrl ?? DEFAULT_BASE_URL;
  const url = `${base}/dynamic/${encodeURIComponent(indexName)}`;
  return request<T>('POST', url, { ...opts, body });
}

export async function updateDoc<T extends DynamicDoc = DynamicDoc>(
  indexName: string,
  docId: string,
  body: Record<string, unknown>,
  opts: DynamicCallOptions = {},
): Promise<T> {
  const base = opts.baseUrl ?? DEFAULT_BASE_URL;
  const url = `${base}/dynamic/${encodeURIComponent(indexName)}/${encodeURIComponent(docId)}`;
  return request<T>('PUT', url, { ...opts, body });
}

export async function deleteDoc(
  indexName: string,
  docId: string,
  opts: DynamicCallOptions = {},
): Promise<boolean> {
  const base = opts.baseUrl ?? DEFAULT_BASE_URL;
  const url = `${base}/dynamic/${encodeURIComponent(indexName)}/${encodeURIComponent(docId)}`;
  return request<boolean>('DELETE', url, opts);
}

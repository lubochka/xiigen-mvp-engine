/**
 * OpenApiGenerator — generates an OpenAPI 3.0 specification from engine route definitions.
 *
 * Routes are described as RouteDefinition objects (not by scanning decorators).
 * The generator produces a valid OpenAPI 3.0 JSON dict.
 *
 * DNA-1: output is Record<string, unknown>.
 * DNA-3: returns DataProcessResult.
 *
 * Phase 11.3.
 */

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../kernel/data-process-result';

// ── Route Definition ────────────────────────────────

export interface RouteDefinition {
  path: string;
  method: 'get' | 'post' | 'put' | 'delete';
  tag: string;
  summary: string;
  description?: string;
  parameters?: RouteParam[];
  requestBody?: RouteRequestBody;
  responses?: Record<string, RouteResponse>;
}

export interface RouteParam {
  name: string;
  in: 'path' | 'query' | 'header';
  required: boolean;
  description?: string;
  schema: { type: string };
}

export interface RouteRequestBody {
  description?: string;
  required?: boolean;
  contentType?: string;
  schema: Record<string, unknown>;
}

export interface RouteResponse {
  description: string;
  schema?: Record<string, unknown>;
}

export interface ServerInfo {
  title: string;
  version: string;
  description?: string;
  serverUrl?: string;
}

// ── Standard Schemas ────────────────────────────────

const DATA_PROCESS_RESULT_SCHEMA: Record<string, unknown> = {
  type: 'object',
  properties: {
    is_success: { type: 'boolean' },
    data: { type: 'object', nullable: true },
    error: {
      type: 'object',
      nullable: true,
      properties: {
        code: { type: 'string' },
        message: { type: 'string' },
      },
    },
    metadata: {
      type: 'object',
      properties: {
        timestamp: { type: 'string', format: 'date-time' },
        trace_id: { type: 'string' },
        duration_ms: { type: 'number' },
      },
    },
  },
};

// ── Generator ───────────────────────────────────────

@Injectable()
export class OpenApiGenerator {
  /**
   * Generate an OpenAPI 3.0 specification from route definitions.
   */
  generate(
    routes: RouteDefinition[],
    serverInfo: ServerInfo,
  ): DataProcessResult<Record<string, unknown>> {
    const paths: Record<string, Record<string, unknown>> = {};

    for (const route of routes) {
      if (!paths[route.path]) {
        paths[route.path] = {};
      }

      const operation: Record<string, unknown> = {
        tags: [route.tag],
        summary: route.summary,
        operationId: this.buildOperationId(route),
      };

      if (route.description) {
        operation.description = route.description;
      }

      // Parameters
      if (route.parameters && route.parameters.length > 0) {
        operation.parameters = route.parameters.map((p) => ({
          name: p.name,
          in: p.in,
          required: p.required,
          description: p.description ?? '',
          schema: p.schema,
        }));
      }

      // Request body
      if (route.requestBody) {
        operation.requestBody = {
          description: route.requestBody.description ?? '',
          required: route.requestBody.required ?? true,
          content: {
            [route.requestBody.contentType ?? 'application/json']: {
              schema: route.requestBody.schema,
            },
          },
        };
      }

      // Responses
      const responses = route.responses ?? {
        '200': {
          description: 'Success',
          schema: { $ref: '#/components/schemas/DataProcessResult' },
        },
      };
      operation.responses = {};
      for (const [code, resp] of Object.entries(responses)) {
        const respObj: Record<string, unknown> = { description: resp.description };
        if (resp.schema) {
          respObj.content = {
            'application/json': { schema: resp.schema },
          };
        }
        (operation.responses as Record<string, unknown>)[code] = respObj;
      }

      (paths[route.path] as Record<string, unknown>)[route.method] = operation;
    }

    // Collect unique tags
    const tagSet = new Set(routes.map((r) => r.tag));
    const tags = [...tagSet].sort().map((t) => ({ name: t, description: `${t} operations` }));

    const spec: Record<string, unknown> = {
      openapi: '3.0.0',
      info: {
        title: serverInfo.title,
        version: serverInfo.version,
        description: serverInfo.description ?? 'XIIGen Engine API',
      },
      servers: [
        { url: serverInfo.serverUrl ?? 'http://localhost:3000', description: 'Engine server' },
      ],
      tags,
      paths,
      components: {
        schemas: {
          DataProcessResult: DATA_PROCESS_RESULT_SCHEMA,
        },
      },
    };

    return DataProcessResult.success(spec);
  }

  /**
   * Get the standard engine route definitions.
   * This is the single source of truth for all engine API routes.
   */
  getEngineRoutes(): RouteDefinition[] {
    const tenantHeader: RouteParam = {
      name: 'X-Tenant-Id',
      in: 'header',
      required: true,
      description: 'Tenant ID for scope isolation (DNA-5)',
      schema: { type: 'string' },
    };

    return [
      // Health
      {
        path: '/health/live',
        method: 'get',
        tag: 'health',
        summary: 'Liveness probe',
        description: 'Always returns 200 OK.',
      },
      {
        path: '/health/ready',
        method: 'get',
        tag: 'health',
        summary: 'Readiness probe',
        description: 'Returns 200 if HEALTHY/DEGRADED, 503 if DOWN.',
        parameters: [tenantHeader],
      },
      {
        path: '/health/status',
        method: 'get',
        tag: 'health',
        summary: 'Full fabric health',
        description: 'Per-fabric health status report.',
        parameters: [tenantHeader],
      },

      // Tenants
      {
        path: '/tenants',
        method: 'post',
        tag: 'tenants',
        summary: 'Create tenant',
        requestBody: {
          description: 'Tenant name',
          schema: { type: 'object', properties: { name: { type: 'string' } } },
        },
      },
      { path: '/tenants', method: 'get', tag: 'tenants', summary: 'List tenants' },
      {
        path: '/tenants/{id}',
        method: 'get',
        tag: 'tenants',
        summary: 'Get tenant by ID',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      },
      {
        path: '/tenants/{id}/config',
        method: 'put',
        tag: 'tenants',
        summary: 'Update tenant config',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { schema: { type: 'object' } },
      },
      {
        path: '/tenants/{id}/keys',
        method: 'put',
        tag: 'tenants',
        summary: 'Set tenant API keys',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { schema: { type: 'object' } },
      },
      {
        path: '/tenants/{id}/quotas',
        method: 'put',
        tag: 'tenants',
        summary: 'Set tenant quotas',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { schema: { type: 'object' } },
      },
      {
        path: '/tenants/{id}',
        method: 'delete',
        tag: 'tenants',
        summary: 'Deactivate tenant',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      },

      // Engine
      {
        path: '/engine/generate',
        method: 'post',
        tag: 'engine',
        summary: 'Trigger generation',
        description: 'Generate code from an engine contract spec.',
        parameters: [tenantHeader],
        requestBody: { description: 'Engine contract spec', schema: { type: 'object' } },
      },
      {
        path: '/engine/history',
        method: 'get',
        tag: 'engine',
        summary: 'Generation history',
        parameters: [tenantHeader],
      },
      {
        path: '/engine/status',
        method: 'get',
        tag: 'engine',
        summary: 'Engine status',
        description: 'Generation count, factory count, task type count, promotion count.',
        parameters: [tenantHeader],
      },
      {
        path: '/engine/contracts',
        method: 'get',
        tag: 'engine',
        summary: 'List engine contracts',
        parameters: [tenantHeader],
      },
      {
        path: '/engine/contracts/{id}',
        method: 'get',
        tag: 'engine',
        summary: 'Get engine contract',
        parameters: [
          tenantHeader,
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
      },

      // FREEDOM Config
      {
        path: '/api/freedom/config',
        method: 'get',
        tag: 'freedom',
        summary: 'Get FREEDOM config',
        parameters: [tenantHeader],
      },
      {
        path: '/api/freedom/config',
        method: 'put',
        tag: 'freedom',
        summary: 'Update FREEDOM config',
        parameters: [tenantHeader],
        requestBody: { schema: { type: 'object' } },
      },

      // Flows
      {
        path: '/api/flows/definitions',
        method: 'get',
        tag: 'flows',
        summary: 'List flow definitions',
        parameters: [tenantHeader],
      },
      {
        path: '/api/flows/definitions',
        method: 'post',
        tag: 'flows',
        summary: 'Save flow definition',
        parameters: [tenantHeader],
        requestBody: { schema: { type: 'object' } },
      },
      {
        path: '/api/flows/runs',
        method: 'get',
        tag: 'flows',
        summary: 'List flow runs',
        parameters: [tenantHeader],
      },
    ];
  }

  // ── Helpers ───────────────────────────────────────

  private buildOperationId(route: RouteDefinition): string {
    const parts = route.path.replace(/[{}]/g, '').split('/').filter(Boolean);
    const verb = route.method;
    return `${verb}_${parts.join('_')}`;
  }
}

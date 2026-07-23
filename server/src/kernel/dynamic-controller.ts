/**
 * DNA-6: DynamicController
 * Single routing controller — NO entity-specific controllers.
 * Routes are resolved dynamically from config/registry.
 * All payloads are Record<string, unknown> (DNA-1 compliant).
 */

import { DataProcessResult } from './data-process-result';
import { validateScope } from './scope-isolation';

/** A registered route in the dynamic controller. */
export class RouteDefinition {
  readonly routeKey: string; // e.g., "inventory.create"
  readonly handlerId: string; // factory interface id, e.g., "F166"
  readonly method: string; // "GET" | "POST" | "PUT" | "DELETE"
  readonly description: string;
  readonly requiredFields: readonly string[];
  readonly requiresAuth: boolean;

  constructor(params: {
    routeKey: string;
    handlerId: string;
    method: string;
    description?: string;
    requiredFields?: string[];
    requiresAuth?: boolean;
  }) {
    this.routeKey = params.routeKey;
    this.handlerId = params.handlerId;
    this.method = params.method;
    this.description = params.description ?? '';
    this.requiredFields = Object.freeze(params.requiredFields ?? []);
    this.requiresAuth = params.requiresAuth ?? true;
  }
}

/** Handler type: async (tenantId, payload) → DataProcessResult */
export type HandlerFn = (
  tenantId: string,
  payload: Record<string, unknown>,
) => Promise<DataProcessResult<Record<string, unknown>>>;

/**
 * DNA-6: Single controller that routes ALL requests dynamically.
 *
 * No /inventory, /orders, /users controllers — ONE controller resolves
 * the route from registry and dispatches to the correct factory-backed handler.
 *
 * Routes are loaded from config/DB (FREEDOM layer) — adding a route
 * = adding a config document, not writing a controller.
 */
export class DynamicController {
  private readonly routes = new Map<string, RouteDefinition>();
  private readonly handlers = new Map<string, HandlerFn>();

  // ── Route Registration ────────────────────────────

  /** Register a route + handler. Typically called during startup from config. */
  registerRoute(definition: RouteDefinition, handler: HandlerFn): DataProcessResult<boolean> {
    if (this.routes.has(definition.routeKey)) {
      return DataProcessResult.failure(
        'ROUTE_EXISTS',
        `Route '${definition.routeKey}' already registered`,
      );
    }
    this.routes.set(definition.routeKey, definition);
    this.handlers.set(definition.routeKey, handler);
    return DataProcessResult.success(true);
  }

  /** Register multiple routes at once. Returns count registered. */
  registerRoutesBulk(routes: Array<[RouteDefinition, HandlerFn]>): DataProcessResult<number> {
    let count = 0;
    for (const [defn, handler] of routes) {
      const result = this.registerRoute(defn, handler);
      if (result.isSuccess) {
        count++;
      }
    }
    return DataProcessResult.success(count);
  }

  // ── Request Dispatch ──────────────────────────────

  /**
   * Dispatch a request to the registered handler.
   *
   * 1. Validate tenant_id (DNA-5)
   * 2. Look up route
   * 3. Validate required fields
   * 4. Call handler
   */
  async dispatch(
    routeKey: string,
    tenantId: string,
    payload: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    // Step 1: Scope isolation
    const scopeCheck = validateScope(tenantId);
    if (!scopeCheck.isSuccess) {
      return DataProcessResult.failure(
        scopeCheck.errorCode ?? 'SCOPE_MISSING',
        scopeCheck.errorMessage ?? 'tenant_id required',
      );
    }

    // Step 2: Route lookup
    const route = this.routes.get(routeKey);
    if (!route) {
      return DataProcessResult.failure(
        'ROUTE_NOT_FOUND',
        `No handler registered for route '${routeKey}'`,
        { available_routes: this.listRouteKeys() },
      );
    }

    // Step 3: Validate required fields
    if (route.requiredFields.length > 0) {
      const missing = route.requiredFields.filter(
        (f) => !(f in payload) || payload[f] === null || payload[f] === undefined,
      );
      if (missing.length > 0) {
        return DataProcessResult.failure(
          'MISSING_FIELDS',
          `Route '${routeKey}' requires: ${missing.join(', ')}`,
          { missing_fields: missing },
        );
      }
    }

    // Step 4: Dispatch to handler
    const handler = this.handlers.get(routeKey)!;
    try {
      return await handler(tenantId, payload);
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      return DataProcessResult.error(
        'HANDLER_ERROR',
        `Handler for '${routeKey}' raised: ${err.message}`,
        err,
      );
    }
  }

  // ── Introspection ─────────────────────────────────

  /** List all registered routes (for API docs / health). */
  listRoutes(): Array<Record<string, unknown>> {
    return Array.from(this.routes.values()).map((r) => ({
      route_key: r.routeKey,
      handler_id: r.handlerId,
      method: r.method,
      description: r.description,
      required_fields: [...r.requiredFields],
    }));
  }

  /** List just the route keys. */
  listRouteKeys(): string[] {
    return Array.from(this.routes.keys());
  }

  /** Check if a route is registered. */
  hasRoute(routeKey: string): boolean {
    return this.routes.has(routeKey);
  }

  /** Number of registered routes. */
  get routeCount(): number {
    return this.routes.size;
  }
}

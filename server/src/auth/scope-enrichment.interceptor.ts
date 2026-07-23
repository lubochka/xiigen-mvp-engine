/**
 * ScopeEnrichmentInterceptor — FLOW-01 Phase A2.5 (V-04).
 *
 * Runs AFTER AuthGuard('jwt') has verified the Bearer token and AFTER
 * TenantContextMiddleware has placed TenantContext in CLS, but BEFORE the
 * controller handler fires. Builds a ScopeContext {tenantId, userId, roles,
 * correlationId} from the verified JWT principal (`req.user`) and writes it
 * into CLS under SCOPE_CONTEXT_KEY.
 *
 * Downstream guards (RolesGuard, MasterTenantGuard), interceptors, and
 * services read the scope via `clsService.get(SCOPE_CONTEXT_KEY)` — giving
 * them a uniform `hasRole()` + userId surface without each recomputing from
 * `req.user`.
 *
 * Behaviour decisions:
 *
 *   1. **If no `req.user` present** (route is public / controller didn't
 *      declare AuthGuard), the interceptor is a NO-OP. Guards that need the
 *      scope either set it themselves or emit 401/403. We do NOT 500 the
 *      request for a missing principal — that's exactly the pattern tests
 *      like the Phase 0 HTTP matrix expect (anonymous anon → 401 at guard,
 *      not 500 at interceptor).
 *
 *   2. **Tenant claim vs TenantContext** — JwtAuthStrategy already enforces
 *      `token.tenantId === CLS.tenantId` via ITokenService.verify (V-16
 *      structural guarantee). Here we simply trust `req.user.tenantId` and
 *      bundle it into the ScopeContext (duplicate-scoping is cheap).
 *
 *   3. **correlationId** — optional header `x-correlation-id`. Propagated
 *      to ScopeContext so downstream logs share a single trace id. If
 *      absent, the scope carries `undefined` and logs fall back to
 *      `instanceId` (per MicroserviceBase).
 *
 *   4. **roles** — read directly from the verified JWT; those claims were
 *      attached to the token at login time (AuthService.login → token
 *      service with roles claim). Interceptor does NOT re-fetch user
 *      records — the role set is the signed one.
 *
 * @connectionType PROTOCOL_PERIPHERAL
 * @flowId FLOW-01
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { Observable } from 'rxjs';

import { ScopeContext, SCOPE_CONTEXT_KEY } from '../kernel/scope-isolation';
import {
  TenantContext,
  TENANT_CONTEXT_KEY,
} from '../kernel/multi-tenant/tenant-context';
import { JwtVerifiedPrincipal } from './auth.dto';

/** Header name used by CorrelationId propagation. Kept here to stay self-contained. */
export const CORRELATION_ID_HEADER = 'x-correlation-id';

/**
 * Narrow request shape the interceptor uses — aligned with express's `Request`
 * but avoids importing express so this file can be unit-tested without an HTTP
 * runtime.
 */
export interface ScopeEnrichmentRequest {
  user?: JwtVerifiedPrincipal | undefined;
  headers?: Record<string, string | string[] | undefined>;
}

/**
 * Extract the first matching header value (case-insensitive for the two
 * standard casings) or undefined.
 */
function readHeader(
  req: ScopeEnrichmentRequest,
  name: string,
): string | undefined {
  const headers = req.headers ?? {};
  const lower = name.toLowerCase();
  const pascal = lower.replace(/(^|-)([a-z])/g, (_, sep, ch) => sep + ch.toUpperCase());
  const raw = headers[lower] ?? headers[pascal] ?? headers[name];
  if (Array.isArray(raw)) return raw[0];
  if (typeof raw === 'string' && raw.length > 0) return raw;
  return undefined;
}

/**
 * Build a ScopeContext from a verified JWT principal + optional tenant context.
 * Exported for reuse by tests and by the Mode-C interceptor variants.
 *
 * Resolution order for tenantId:
 *   1. req.user.tenantId  (the verified JWT claim)
 *   2. tenantContext.tenantId (already set by TenantContextMiddleware)
 *   3. undefined → returns undefined (caller treats as "no scope to enrich")
 */
export function buildScopeFromPrincipal(
  principal: JwtVerifiedPrincipal,
  tenantContext: TenantContext | undefined,
  correlationId: string | undefined,
): ScopeContext {
  const fromPrincipal =
    typeof principal.tenantId === 'string' && principal.tenantId.length > 0
      ? principal.tenantId
      : undefined;
  const fromContext = tenantContext ? tenantContext.tenantId : undefined;
  const tenantId = fromPrincipal ?? fromContext ?? '';
  return new ScopeContext({
    tenantId,
    userId: principal.userId,
    correlationId,
    roles: [...principal.roles],
  });
}

@Injectable()
export class ScopeEnrichmentInterceptor implements NestInterceptor {
  constructor(private readonly cls: ClsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    // Only process HTTP context — rpc/ws contexts are out of scope here.
    const http = context.switchToHttp();
    const req: ScopeEnrichmentRequest = http.getRequest();

    const principal = req.user;
    if (principal && typeof principal === 'object' && typeof principal.userId === 'string') {
      const tenantContext = this.cls.get<TenantContext>(TENANT_CONTEXT_KEY);
      const correlationId = readHeader(req, CORRELATION_ID_HEADER);
      const scope = buildScopeFromPrincipal(principal, tenantContext, correlationId);
      this.cls.set(SCOPE_CONTEXT_KEY, scope);
    }
    // No principal → no-op. Downstream guards decide whether to 401/403.

    return next.handle();
  }
}

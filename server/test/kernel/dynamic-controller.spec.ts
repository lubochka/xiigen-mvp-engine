/**
 * Tests for DNA-6: DynamicController
 * Ported from Python: tests/unit/test_cloud_events_and_controller.py (controller portion)
 */

import { DynamicController, RouteDefinition, DataProcessResult } from '../../src/kernel';

describe('DynamicController (DNA-6)', () => {
  function makeController(): DynamicController {
    const ctrl = new DynamicController();
    const handler = async (tenantId: string, payload: Record<string, unknown>) => {
      return DataProcessResult.success({ echo: payload, tenant: tenantId });
    };
    const route = new RouteDefinition({
      routeKey: 'test.echo',
      handlerId: 'F999',
      method: 'POST',
      description: 'Echo handler',
      requiredFields: ['message'],
    });
    ctrl.registerRoute(route, handler);
    return ctrl;
  }

  describe('route registration', () => {
    it('should register a route', () => {
      const ctrl = makeController();
      expect(ctrl.hasRoute('test.echo')).toBe(true);
      expect(ctrl.routeCount).toBe(1);
    });

    it('should reject duplicate route key', () => {
      const ctrl = makeController();
      const handler = async () => DataProcessResult.success({});
      const result = ctrl.registerRoute(
        new RouteDefinition({ routeKey: 'test.echo', handlerId: 'F998', method: 'POST' }),
        handler,
      );
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('ROUTE_EXISTS');
    });

    it('should register multiple routes via bulk', () => {
      const ctrl = new DynamicController();
      const handler = async () => DataProcessResult.success({});
      const routes: Array<[RouteDefinition, typeof handler]> = Array.from({ length: 5 }, (_, i) => [
        new RouteDefinition({ routeKey: `r${i}`, handlerId: `F${i}`, method: 'GET' }),
        handler,
      ]);
      const result = ctrl.registerRoutesBulk(routes);
      expect(result.data).toBe(5);
      expect(ctrl.routeCount).toBe(5);
    });

    it('should skip duplicates in bulk registration', () => {
      const ctrl = makeController(); // already has test.echo
      const handler = async () => DataProcessResult.success({});
      const routes: Array<[RouteDefinition, typeof handler]> = [
        [new RouteDefinition({ routeKey: 'test.echo', handlerId: 'F1', method: 'POST' }), handler],
        [new RouteDefinition({ routeKey: 'new.route', handlerId: 'F2', method: 'GET' }), handler],
      ];
      const result = ctrl.registerRoutesBulk(routes);
      expect(result.data).toBe(1); // only new.route succeeded
      expect(ctrl.routeCount).toBe(2);
    });
  });

  describe('dispatch', () => {
    it('should dispatch successfully with valid input', async () => {
      const ctrl = makeController();
      const result = await ctrl.dispatch('test.echo', 'T-001', { message: 'hello' });
      expect(result.isSuccess).toBe(true);
      expect((result.data as any).echo.message).toBe('hello');
      expect((result.data as any).tenant).toBe('T-001');
    });

    it('should fail on missing tenant_id (DNA-5)', async () => {
      const ctrl = makeController();
      const result = await ctrl.dispatch('test.echo', '', { message: 'hello' });
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('SCOPE_MISSING');
    });

    it('should fail on null-ish tenant_id', async () => {
      const ctrl = makeController();
      const result = await ctrl.dispatch('test.echo', '   ', { message: 'hello' });
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('SCOPE_MISSING');
    });

    it('should fail on unknown route', async () => {
      const ctrl = makeController();
      const result = await ctrl.dispatch('unknown.route', 'T-001', {});
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('ROUTE_NOT_FOUND');
    });

    it('should include available routes in ROUTE_NOT_FOUND metadata', async () => {
      const ctrl = makeController();
      const result = await ctrl.dispatch('unknown.route', 'T-001', {});
      expect(result.metadata['available_routes']).toContain('test.echo');
    });

    it('should fail on missing required fields', async () => {
      const ctrl = makeController();
      const result = await ctrl.dispatch('test.echo', 'T-001', {});
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('MISSING_FIELDS');
      expect(result.metadata['missing_fields']).toContain('message');
    });

    it('should treat null required field value as missing', async () => {
      const ctrl = makeController();
      const result = await ctrl.dispatch('test.echo', 'T-001', { message: null });
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('MISSING_FIELDS');
    });

    it('should accept falsy-but-present required fields (0, false, empty string)', async () => {
      const ctrl = new DynamicController();
      const handler = async (_t: string, p: Record<string, unknown>) =>
        DataProcessResult.success(p);
      ctrl.registerRoute(
        new RouteDefinition({
          routeKey: 'r',
          handlerId: 'F0',
          method: 'POST',
          requiredFields: ['val'],
        }),
        handler,
      );
      // 0 is a valid value — not missing
      const result = await ctrl.dispatch('r', 'T-001', { val: 0 });
      expect(result.isSuccess).toBe(true);
    });

    it('should catch handler exceptions and return HANDLER_ERROR', async () => {
      const ctrl = new DynamicController();
      const badHandler = async () => {
        throw new Error('boom');
      };
      ctrl.registerRoute(
        new RouteDefinition({ routeKey: 'bad', handlerId: 'F0', method: 'POST' }),
        badHandler,
      );
      const result = await ctrl.dispatch('bad', 'T-001', {});
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('HANDLER_ERROR');
      expect(result.errorMessage).toContain('boom');
    });

    it('should dispatch route without required fields', async () => {
      const ctrl = new DynamicController();
      const handler = async (_t: string, p: Record<string, unknown>) =>
        DataProcessResult.success({ got: p });
      ctrl.registerRoute(
        new RouteDefinition({ routeKey: 'open', handlerId: 'F0', method: 'POST' }),
        handler,
      );
      const result = await ctrl.dispatch('open', 'T-001', { anything: true });
      expect(result.isSuccess).toBe(true);
    });
  });

  describe('introspection', () => {
    it('should list routes', () => {
      const ctrl = makeController();
      const routes = ctrl.listRoutes();
      expect(routes.length).toBe(1);
      expect(routes[0]['route_key']).toBe('test.echo');
      expect(routes[0]['handler_id']).toBe('F999');
      expect(routes[0]['method']).toBe('POST');
      expect(routes[0]['description']).toBe('Echo handler');
      expect(routes[0]['required_fields']).toEqual(['message']);
    });

    it('should list route keys', () => {
      const ctrl = makeController();
      expect(ctrl.listRouteKeys()).toEqual(['test.echo']);
    });

    it('should report hasRoute correctly', () => {
      const ctrl = makeController();
      expect(ctrl.hasRoute('test.echo')).toBe(true);
      expect(ctrl.hasRoute('nonexistent')).toBe(false);
    });

    it('should report routeCount', () => {
      const ctrl = new DynamicController();
      expect(ctrl.routeCount).toBe(0);
      const handler = async () => DataProcessResult.success({});
      ctrl.registerRoute(
        new RouteDefinition({ routeKey: 'a', handlerId: 'F1', method: 'GET' }),
        handler,
      );
      expect(ctrl.routeCount).toBe(1);
    });
  });

  describe('RouteDefinition', () => {
    it('should have default values', () => {
      const route = new RouteDefinition({ routeKey: 'test', handlerId: 'F1', method: 'GET' });
      expect(route.description).toBe('');
      expect(route.requiredFields).toEqual([]);
      expect(route.requiresAuth).toBe(true);
    });

    it('should freeze requiredFields', () => {
      const route = new RouteDefinition({
        routeKey: 'test',
        handlerId: 'F1',
        method: 'POST',
        requiredFields: ['a'],
      });
      expect(() => {
        (route.requiredFields as string[]).push('b');
      }).toThrow();
    });
  });
});

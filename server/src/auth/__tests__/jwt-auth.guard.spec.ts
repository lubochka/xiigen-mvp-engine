/**
 * GlobalJwtAuthGuard tests — FLOW-01 Phase A4 (V-06).
 *
 * Confirms:
 *   - @Public() metadata short-circuits the guard (returns true)
 *   - Missing metadata delegates to super.canActivate() (the base
 *     AuthGuard('jwt') implementation)
 *   - Reflector is queried with the IS_PUBLIC_KEY plus [handler, class] tuple
 *
 * We stub `super.canActivate` via a `Object.getPrototypeOf` override so the
 * tests don't need a full passport runtime. Integration behaviour (real
 * JwtAuthStrategy firing) is covered elsewhere by the auth-matrix tests
 * landing in Phase B1.
 */

import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { Public, IS_PUBLIC_KEY } from '../public.decorator';
import { GlobalJwtAuthGuard } from '../jwt-auth.guard';

function makeReflector(value: boolean | undefined): Reflector {
  return {
    getAllAndOverride: jest.fn().mockReturnValue(value),
  } as unknown as Reflector;
}

function makeCtx(): ExecutionContext {
  const handler = function fakeHandler(): void {};
  const klass = class FakeController {};
  return {
    getHandler: () => handler,
    getClass: () => klass,
    switchToHttp: () => ({
      getRequest: () => ({ headers: {} }),
      getResponse: () => ({}),
    }),
  } as unknown as ExecutionContext;
}

describe('GlobalJwtAuthGuard', () => {
  it('returns true immediately when @Public() metadata is present (handler OR class)', async () => {
    const reflector = makeReflector(true);
    const guard = new GlobalJwtAuthGuard(reflector);
    const result = await guard.canActivate(makeCtx());
    expect(result).toBe(true);
    const spy = reflector.getAllAndOverride as unknown as jest.Mock;
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toBe(IS_PUBLIC_KEY);
  });

  it('queries Reflector with [handler, class] tuple', () => {
    const reflector = makeReflector(true);
    const guard = new GlobalJwtAuthGuard(reflector);
    guard.canActivate(makeCtx());
    const spy = reflector.getAllAndOverride as unknown as jest.Mock;
    const targets = spy.mock.calls[0][1] as unknown[];
    expect(Array.isArray(targets)).toBe(true);
    expect(targets.length).toBe(2);
    // First target is the handler (function), second is the class (function).
    expect(typeof targets[0]).toBe('function');
    expect(typeof targets[1]).toBe('function');
  });

  it('delegates to super.canActivate when @Public() is NOT set', async () => {
    const reflector = makeReflector(undefined);
    const guard = new GlobalJwtAuthGuard(reflector);
    // Patch super.canActivate via the prototype chain to avoid booting Passport.
    const parentProto = Object.getPrototypeOf(Object.getPrototypeOf(guard)) as {
      canActivate: (c: ExecutionContext) => Promise<boolean>;
    };
    const superSpy = jest.spyOn(parentProto, 'canActivate').mockResolvedValue(true);
    const result = await guard.canActivate(makeCtx());
    expect(result).toBe(true);
    expect(superSpy).toHaveBeenCalledTimes(1);
    superSpy.mockRestore();
  });

  it('delegates to super.canActivate when metadata is explicitly false', async () => {
    const reflector = makeReflector(false);
    const guard = new GlobalJwtAuthGuard(reflector);
    const parentProto = Object.getPrototypeOf(Object.getPrototypeOf(guard)) as {
      canActivate: (c: ExecutionContext) => Promise<boolean>;
    };
    const superSpy = jest.spyOn(parentProto, 'canActivate').mockResolvedValue(false);
    const result = await guard.canActivate(makeCtx());
    expect(result).toBe(false);
    expect(superSpy).toHaveBeenCalledTimes(1);
    superSpy.mockRestore();
  });

  it('propagates super.canActivate rejections (UnauthorizedException from strategy)', async () => {
    const reflector = makeReflector(undefined);
    const guard = new GlobalJwtAuthGuard(reflector);
    const parentProto = Object.getPrototypeOf(Object.getPrototypeOf(guard)) as {
      canActivate: (c: ExecutionContext) => Promise<boolean>;
    };
    const superSpy = jest
      .spyOn(parentProto, 'canActivate')
      .mockRejectedValue(new Error('NO_TOKEN'));
    await expect(guard.canActivate(makeCtx())).rejects.toThrow('NO_TOKEN');
    superSpy.mockRestore();
  });

  it('real Reflector: @Public() applied to a class short-circuits the guard', () => {
    @Public()
    class PublicController {
      handler(): string {
        return 'ok';
      }
    }
    const guard = new GlobalJwtAuthGuard(new Reflector());
    const ctx = {
      getHandler: () => PublicController.prototype.handler,
      getClass: () => PublicController,
      switchToHttp: () => ({ getRequest: () => ({}), getResponse: () => ({}) }),
    } as unknown as ExecutionContext;
    expect(guard.canActivate(ctx)).toBe(true);
  });
});

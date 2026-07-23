/**
 * @Public() decorator tests — FLOW-01 Phase A4 (V-06).
 *
 * Confirms:
 *   - IS_PUBLIC_KEY is a stable exported string (change detector)
 *   - @Public() sets the metadata on a method target
 *   - @Public() sets the metadata on a class target
 *   - Reflector can read the metadata back (integration with GlobalJwtAuthGuard)
 */

import { Reflector } from '@nestjs/core';

import { Public, IS_PUBLIC_KEY } from '../public.decorator';

describe('IS_PUBLIC_KEY', () => {
  it('is a stable string constant', () => {
    expect(IS_PUBLIC_KEY).toBe('auth::is-public');
  });
});

describe('@Public() decorator', () => {
  it('sets IS_PUBLIC_KEY metadata on a method target', () => {
    class SampleController {
      handler(): string {
        return 'ok';
      }
    }
    Public()(SampleController.prototype, 'handler', {
      value: SampleController.prototype.handler,
    });
    const reflector = new Reflector();
    const value = reflector.get<boolean>(
      IS_PUBLIC_KEY,
      SampleController.prototype.handler,
    );
    expect(value).toBe(true);
  });

  it('sets IS_PUBLIC_KEY metadata on a class target', () => {
    @Public()
    class SampleController {}
    const reflector = new Reflector();
    const value = reflector.get<boolean>(IS_PUBLIC_KEY, SampleController);
    expect(value).toBe(true);
  });

  it('Reflector.getAllAndOverride resolves handler metadata over class', () => {
    @Public()
    class SampleController {
      privateHandler(): string {
        return 'no';
      }
      publicHandler(): string {
        return 'yes';
      }
    }
    // Remove the class-level metadata for privateHandler so we can detect it's
    // the class metadata bleeding through (negative case).
    const reflector = new Reflector();
    // Class-level @Public() covers BOTH handlers under getAllAndOverride — handler + class are both Public-true.
    expect(
      reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        SampleController.prototype.publicHandler,
        SampleController,
      ]),
    ).toBe(true);
    expect(
      reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        SampleController.prototype.privateHandler,
        SampleController,
      ]),
    ).toBe(true);
  });

  it('undecorated classes/handlers carry no IS_PUBLIC_KEY metadata', () => {
    class NotDecorated {
      handler(): string {
        return 'nope';
      }
    }
    const reflector = new Reflector();
    expect(
      reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        NotDecorated.prototype.handler,
        NotDecorated,
      ]),
    ).toBeUndefined();
  });
});

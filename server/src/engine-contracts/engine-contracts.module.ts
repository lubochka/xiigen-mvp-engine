/**
 * EngineContractsModule — NestJS module for engine contract infrastructure.
 *
 * Registers: TaskTypeRegistry, TemplateRenderer, StubBfaValidator.
 * StubBfaValidator is provided as IBfaValidator — real BFA replaces it in Phase 7.
 *
 * Phase 6.4: Contract infrastructure module.
 */

import { Module } from '@nestjs/common';
import { TaskTypeRegistry } from './task-type-registry';
import { TemplateRenderer } from './template-renderer';
import { IBfaValidator, StubBfaValidator } from './bfa-validator.stub';

@Module({
  providers: [
    TaskTypeRegistry,
    TemplateRenderer,
    {
      provide: IBfaValidator,
      useClass: StubBfaValidator,
    },
  ],
  exports: [TaskTypeRegistry, TemplateRenderer, IBfaValidator],
})
export class EngineContractsModule {}

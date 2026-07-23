/**
 * DevOpsModule — NestJS module for structured logging, lint validation,
 * and infrastructure validators.
 *
 * Provides: StructuredLogger, RequestLogger, LintValidator,
 *           DockerfileValidator, ComposeValidator, CiValidator.
 * Exports: StructuredLogger, RequestLogger (consumed by other modules for logging).
 *
 * Phase 13.5: Module wiring.
 */

import { Module } from '@nestjs/common';
import { StructuredLogger } from './structured-logger';
import { RequestLogger } from './request-logger';
import { LintValidator } from './lint-validator';
import { DockerfileValidator } from './dockerfile-validator';
import { ComposeValidator } from './compose-validator';
import { CiValidator } from './ci-validator';

@Module({
  providers: [
    {
      provide: StructuredLogger,
      useFactory: () => new StructuredLogger({ module: 'xiigen' }),
    },
    {
      provide: RequestLogger,
      useFactory: (logger: StructuredLogger) => new RequestLogger(logger),
      inject: [StructuredLogger],
    },
    LintValidator,
    DockerfileValidator,
    ComposeValidator,
    CiValidator,
  ],
  exports: [StructuredLogger, RequestLogger],
})
export class DevOpsModule {}

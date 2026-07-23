/**
 * ProjectTrackerModule — NestJS module for the Project Tracker Fabric.
 *
 * Provides PROJECT_TRACKER_SERVICE token.
 * Default: InMemoryProjectTrackerProvider (no external dependencies).
 * Production: EsProjectTrackerProvider (requires DATABASE_SERVICE).
 *
 * FREEDOM config key: projectTrackerProvider ("in_memory" | "elasticsearch")
 *
 * TIER1-S2: Initial delivery — in-memory + ES providers.
 */

import { Module, Global } from '@nestjs/common';
import { InMemoryProjectTrackerProvider } from './in-memory-tracker.provider';
import { EsProjectTrackerProvider } from './es-tracker.provider';
import { PROJECT_TRACKER_SERVICE } from '../interfaces/project-tracker.interface';
import { DATABASE_SERVICE, IDatabaseService } from '../interfaces/database.interface';

@Global()
@Module({
  providers: [
    InMemoryProjectTrackerProvider,
    EsProjectTrackerProvider,

    // Provide PROJECT_TRACKER_SERVICE token.
    // Uses ES-backed provider when DATABASE_SERVICE resolves; falls back to in-memory.
    {
      provide: PROJECT_TRACKER_SERVICE,
      useFactory: (
        inMemory: InMemoryProjectTrackerProvider,
        es: EsProjectTrackerProvider,
        db: IDatabaseService | null,
      ) => {
        // If database fabric is available, use ES-backed provider
        return db ? es : inMemory;
      },
      inject: [
        InMemoryProjectTrackerProvider,
        EsProjectTrackerProvider,
        { token: DATABASE_SERVICE, optional: true },
      ],
    },
  ],
  exports: [PROJECT_TRACKER_SERVICE, InMemoryProjectTrackerProvider, EsProjectTrackerProvider],
})
export class ProjectTrackerModule {}

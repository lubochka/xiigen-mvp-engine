/**
 * Test helpers for creating NestJS testing modules.
 * Used across all test suites for consistent setup.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ModuleMetadata } from '@nestjs/common';

/**
 * Create a NestJS testing module with standard configuration.
 * Wraps Test.createTestingModule for consistent test setup.
 */
export async function createTestModule(metadata: ModuleMetadata): Promise<TestingModule> {
  const moduleRef = await Test.createTestingModule(metadata).compile();
  return moduleRef;
}

/**
 * Create a minimal testing module with just providers.
 * Most common pattern for unit tests.
 */
export async function createMinimalModule(
  providers: ModuleMetadata['providers'],
): Promise<TestingModule> {
  return createTestModule({ providers });
}

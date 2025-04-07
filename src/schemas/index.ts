/**
 * Central export point for all validation schemas
 * Makes importing schemas easier throughout the application
 */

// Export common utilities
export * from './common';

// Export all schemas
export * from './user.schema';
export * from './search-request.schema';
export * from './search-result.schema';
export * from './review-tag.schema';
export * from './duplicate-log.schema';

// Export a shared JSON validator utility that can be used across schemas
import { z } from 'zod';

// Custom JSON validator with proper type annotation
type JsonSchemaType = z.ZodType<any, any, any>;

export const jsonSchema: JsonSchemaType = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.array(z.lazy(() => jsonSchema)),
  z.record(z.lazy(() => jsonSchema)),
]);

export type Json = z.infer<typeof jsonSchema>; 
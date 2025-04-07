import { z } from 'zod';

/**
 * Duplicate Log schema validation
 * Ensures duplicate log data is properly validated before database operations
 */

// Base duplicate log schema with all fields
export const duplicateLogSchema = z.object({
  duplicate_id: z.string().uuid(),
  original_result_id: z.string().uuid(),
  duplicate_url: z.string().url(),
  search_engine: z.string().nullable(),
  reason: z.string().nullable(),
  timestamp: z.string().datetime(),
});

// Schema for creating a new duplicate log entry
export const duplicateLogCreateSchema = duplicateLogSchema
  .omit({
    timestamp: true,
  })
  .extend({
    search_engine: z.string().nullable().optional(),
    reason: z.string().nullable().optional(),
  });

// Schema for client input (camelCase version for frontend)
export const duplicateLogInputSchema = z.object({
  duplicateId: z.string().uuid(),
  originalResultId: z.string().uuid(),
  duplicateUrl: z.string().url(),
  searchEngine: z.string().optional().nullable(),
  reason: z.string().optional().nullable(),
});

// Schema for retrieving duplicates for an original result
export const duplicateLogByOriginalSchema = z.object({
  originalResultId: z.string().uuid(),
});

// Type definitions based on the schemas
export type DuplicateLog = z.infer<typeof duplicateLogSchema>;
export type DuplicateLogCreate = z.infer<typeof duplicateLogCreateSchema>;
export type DuplicateLogInput = z.infer<typeof duplicateLogInputSchema>;
export type DuplicateLogByOriginal = z.infer<typeof duplicateLogByOriginalSchema>; 
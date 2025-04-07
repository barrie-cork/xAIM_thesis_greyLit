import { z } from 'zod';

/**
 * Review Tag schema validation
 * Ensures review tag data is properly validated before database operations
 */

// Define valid tag values as an enum
export const ReviewTagEnum = z.enum(['include', 'exclude', 'maybe']);
export type ReviewTagType = z.infer<typeof ReviewTagEnum>;

// Base review tag schema with all fields
export const reviewTagSchema = z.object({
  id: z.string().uuid(),
  result_id: z.string().uuid(),
  tag: ReviewTagEnum,
  exclusion_reason: z.string().nullable(),
  notes: z.string().nullable(),
  retrieved: z.boolean().nullable(),
  reviewer_id: z.string().uuid(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime().nullable(),
});

// Schema for creating a new review tag
export const reviewTagCreateSchema = reviewTagSchema
  .omit({
    id: true,
    reviewer_id: true,
    created_at: true,
    updated_at: true,
  })
  .extend({
    exclusion_reason: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    retrieved: z.boolean().nullable().optional(),
  });

// Schema for client input (camelCase version for frontend)
export const reviewTagInputSchema = z.object({
  resultId: z.string().uuid(),
  tag: ReviewTagEnum,
  exclusionReason: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  retrieved: z.boolean().optional().nullable(),
});

// Schema for updating a review tag
export const reviewTagUpdateSchema = z.object({
  id: z.string().uuid(),
  tag: ReviewTagEnum.optional(),
  exclusionReason: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  retrieved: z.boolean().optional().nullable(),
});

// Schema for retrieving tags by result ID
export const reviewTagByResultIdSchema = z.object({
  resultId: z.string().uuid(),
});

// Schema for retrieving tags by query ID
export const reviewTagByQueryIdSchema = z.object({
  queryId: z.string().uuid(),
});

// Schema for deleting a tag
export const reviewTagDeleteSchema = z.object({
  id: z.string().uuid(),
});

// Type definitions based on the schemas
export type ReviewTag = z.infer<typeof reviewTagSchema>;
export type ReviewTagCreate = z.infer<typeof reviewTagCreateSchema>;
export type ReviewTagInput = z.infer<typeof reviewTagInputSchema>;
export type ReviewTagUpdate = z.infer<typeof reviewTagUpdateSchema>;
export type ReviewTagByResultId = z.infer<typeof reviewTagByResultIdSchema>;
export type ReviewTagByQueryId = z.infer<typeof reviewTagByQueryIdSchema>;
export type ReviewTagDelete = z.infer<typeof reviewTagDeleteSchema>; 
import { z } from 'zod';

/**
 * Search Request schema validation
 * Ensures search request data is properly validated before database operations
 */

// Custom JSON validator with proper type annotation
type JsonSchemaType = z.ZodType<any, any, any>;

const jsonSchema: JsonSchemaType = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.array(z.lazy(() => jsonSchema)),
  z.record(z.lazy(() => jsonSchema)),
]);

export type Json = z.infer<typeof jsonSchema>;

// Base search request schema with all fields (snake_case to match database)
export const searchRequestSchema = z.object({
  query_id: z.string().uuid(),
  user_id: z.string().uuid(),
  query: z.string().min(1, "Search query can't be empty"),
  source: z.string().min(1, "Source can't be empty"),
  filters: jsonSchema.nullable(),
  timestamp: z.string().datetime(),
  search_title: z.string().nullable(),
  is_saved: z.boolean().default(false),
});

// Schema for creating a new search request
export const searchRequestCreateSchema = searchRequestSchema
  .omit({ 
    query_id: true, 
    timestamp: true 
  })
  .extend({
    search_title: z.string().nullable().optional(),
    filters: jsonSchema.nullable().optional(),
  });

// Schema for client input
export const searchRequestInputSchema = z.object({
  query: z.string().min(1, "Search query can't be empty"),
  source: z.string().min(1, "Source can't be empty"),
  filters: jsonSchema.nullable().optional(),
  search_title: z.string().nullable().optional(),
  is_saved: z.boolean().default(false),
});

// Schema for updating a search request
export const searchRequestUpdateSchema = z.object({
  query_id: z.string().uuid(),
  search_title: z.string().nullable().optional(),
  is_saved: z.boolean().optional(),
});

// Schema for retrieving a search request by ID
export const searchRequestByIdSchema = z.object({
  query_id: z.string().uuid(),
});

// Type definitions based on the schemas
export type SearchRequest = z.infer<typeof searchRequestSchema>;
export type SearchRequestCreate = z.infer<typeof searchRequestCreateSchema>;
export type SearchRequestInput = z.infer<typeof searchRequestInputSchema>;
export type SearchRequestUpdate = z.infer<typeof searchRequestUpdateSchema>;
export type SearchRequestById = z.infer<typeof searchRequestByIdSchema>; 
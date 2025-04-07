import { z } from 'zod';

/**
 * Search Result schema validation
 * Ensures search result data is properly validated before database operations
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

// Base search result schema with all fields (snake_case to match database)
export const searchResultSchema = z.object({
  id: z.string().uuid(),
  query_id: z.string().uuid(),
  title: z.string().min(1),
  url: z.string().url(),
  snippet: z.string().nullable(),
  rank: z.number().nullable(),
  result_type: z.string().nullable(),
  search_engine: z.string().nullable(),
  device: z.string().nullable(),
  location: z.string().nullable(),
  language: z.string().nullable(),
  total_results: z.number().nullable(),
  credits_used: z.number().nullable(),
  search_id: z.string().nullable(),
  search_url: z.string().nullable(),
  related_searches: jsonSchema.nullable(),
  similar_questions: jsonSchema.nullable(),
  timestamp: z.string().datetime(),
  raw_response: jsonSchema.nullable(),
  deduped: z.boolean().default(true),
});

// Schema for creating a new search result
export const searchResultCreateSchema = searchResultSchema
  .omit({
    id: true,
    timestamp: true,
  })
  .extend({
    snippet: z.string().nullable().optional(),
    rank: z.number().nullable().optional(),
    result_type: z.string().nullable().optional(),
    search_engine: z.string().nullable().optional(),
    device: z.string().nullable().optional(),
    location: z.string().nullable().optional(),
    language: z.string().nullable().optional(),
    total_results: z.number().nullable().optional(),
    credits_used: z.number().nullable().optional(),
    search_id: z.string().nullable().optional(),
    search_url: z.string().nullable().optional(),
    related_searches: jsonSchema.nullable().optional(),
    similar_questions: jsonSchema.nullable().optional(),
    raw_response: jsonSchema.nullable().optional(),
    deduped: z.boolean().default(true),
  });

// Schema for client input (camelCase version for frontend)
export const searchResultInputSchema = z.object({
  queryId: z.string().uuid(),
  title: z.string().min(1),
  url: z.string().url(),
  snippet: z.string().optional().nullable(),
  rank: z.number().optional().nullable(),
  resultType: z.string().optional().nullable(),
  searchEngine: z.string().optional().nullable(),
  device: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  language: z.string().optional().nullable(),
  totalResults: z.number().optional().nullable(),
  creditsUsed: z.number().optional().nullable(),
  searchId: z.string().optional().nullable(),
  searchUrl: z.string().optional().nullable(),
  relatedSearches: jsonSchema.optional().nullable(),
  similarQuestions: jsonSchema.optional().nullable(),
  rawResponse: jsonSchema.optional().nullable(),
  deduped: z.boolean().default(true),
});

// Schema for bulk creation of search results
export const searchResultBulkCreateSchema = z.array(searchResultInputSchema);

// Schema for retrieving a search result by ID
export const searchResultByIdSchema = z.object({
  id: z.string().uuid(),
});

// Schema for retrieving search results by query ID
export const searchResultByQueryIdSchema = z.object({
  queryId: z.string().uuid(),
});

// Type definitions based on the schemas
export type SearchResult = z.infer<typeof searchResultSchema>;
export type SearchResultCreate = z.infer<typeof searchResultCreateSchema>;
export type SearchResultInput = z.infer<typeof searchResultInputSchema>;
export type SearchResultById = z.infer<typeof searchResultByIdSchema>;
export type SearchResultByQueryId = z.infer<typeof searchResultByQueryIdSchema>; 
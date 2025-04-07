import { z } from 'zod';

/**
 * Common schema utilities
 * Provides shared functionality for schema validation
 */

// Custom JSON validator with proper type annotation
export type JsonSchemaType = z.ZodType<any, any, any>;

export const jsonSchema: JsonSchemaType = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.array(z.lazy(() => jsonSchema)),
  z.record(z.lazy(() => jsonSchema)),
]);

export type Json = z.infer<typeof jsonSchema>;

/**
 * Adapter functions for converting between database and API naming conventions
 * This helps handle the conversion between snake_case (database) and camelCase (API)
 */

// Converts snake_case object keys to camelCase
export function toCamelCase<T extends Record<string, any>>(obj: T): Record<string, any> {
  return Object.keys(obj).reduce((acc, key) => {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    acc[camelKey] = obj[key];
    return acc;
  }, {} as Record<string, any>);
}

// Converts camelCase object keys to snake_case
export function toSnakeCase<T extends Record<string, any>>(obj: T): Record<string, any> {
  return Object.keys(obj).reduce((acc, key) => {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    acc[snakeKey] = obj[key];
    return acc;
  }, {} as Record<string, any>);
}

// Search engine options
export const SearchEngineEnum = z.enum(['google', 'bing', 'pubmed', 'cochrane']);
export type SearchEngineType = z.infer<typeof SearchEngineEnum>; 
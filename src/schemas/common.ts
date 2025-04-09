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

// Converts snake_case object keys to camelCase with support for nested objects and arrays
export function toCamelCase<T extends Record<string, any>>(obj: T): Record<string, any> {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => toCamelCase(item));
  }

  const result: Record<string, any> = {};

  for (const key of Object.keys(obj)) {
    // Convert key to camelCase
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    
    // Handle nested objects and arrays
    const value = obj[key];
    
    if (value !== null && typeof value === 'object') {
      result[camelKey] = toCamelCase(value);
    } else {
      result[camelKey] = value;
    }
  }

  return result;
}

// Converts camelCase object keys to snake_case with support for nested objects and arrays
export function toSnakeCase<T extends Record<string, any>>(obj: T): Record<string, any> {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => toSnakeCase(item));
  }

  const result: Record<string, any> = {};

  for (const key of Object.keys(obj)) {
    // Convert key to snake_case
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    
    // Handle nested objects and arrays
    const value = obj[key];
    
    if (value !== null && typeof value === 'object') {
      result[snakeKey] = toSnakeCase(value);
    } else {
      result[snakeKey] = value;
    }
  }

  return result;
}

// Search engine options
export const SearchEngineEnum = z.enum(['google', 'bing', 'pubmed', 'cochrane']);
export type SearchEngineType = z.infer<typeof SearchEngineEnum>; 
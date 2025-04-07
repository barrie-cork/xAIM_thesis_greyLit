import { z } from 'zod';

/**
 * User schema validation
 * Ensures user data is properly validated before database operations
 */

// Base user schema with all fields
export const userSchema = z.object({
  id: z.string().uuid(),
  instance_id: z.string().nullable(),
  email: z.string().email(),
  created_at: z.string().datetime(),
  last_login: z.string().datetime().nullable(),
});

// Schema for creating a new user
export const userCreateSchema = userSchema
  .pick({
    id: true,
    email: true,
  })
  .extend({
    instance_id: z.string().nullable().optional(),
    created_at: z.string().datetime().optional(),
    last_login: z.string().datetime().nullable().optional(),
  });

// Schema for updating a user
export const userUpdateSchema = userSchema
  .partial()
  .pick({
    email: true,
    instance_id: true,
    last_login: true,
  });

// For user profile operations
export const userProfileSchema = z.object({
  email: z.string().email().optional(),
  // Add other profile fields as needed
});

// Schema for returning a user (safe, without sensitive data if needed)
export const userResponseSchema = userSchema;

// Type definitions based on the schemas
export type User = z.infer<typeof userSchema>;
export type UserCreate = z.infer<typeof userCreateSchema>;
export type UserUpdate = z.infer<typeof userUpdateSchema>;
export type UserProfile = z.infer<typeof userProfileSchema>;
export type UserResponse = z.infer<typeof userResponseSchema>; 
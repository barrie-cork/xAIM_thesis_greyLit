import { describe, expect, test, beforeEach, afterEach, jest } from '@jest/globals';
import { appRouter } from '@/server/trpc/router';
import { createInnerTRPCContext } from '@/server/trpc/context';
import { inferProcedureInput } from '@trpc/server';
import { type AppRouter } from '@/server/trpc/router';
import { TRPCError } from '@trpc/server';

// Mock Prisma client
jest.mock('@/server/db/client', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

// Mock Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createServerClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(),
      getSession: jest.fn(),
    },
  })),
}));

// Import the mocked modules
import { prisma } from '@/server/db/client';
import { createServerClient } from '@/lib/supabase/server';

describe('User API', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCurrent', () => {
    test('should return the current user when authenticated', async () => {
      // Mock data
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        created_at: new Date().toISOString(),
        last_login: new Date().toISOString(),
      };

      // Set up mocks
      (createServerClient as jest.Mock).mockImplementation(() => ({
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user123' } } }),
          getSession: jest.fn().mockResolvedValue({ data: { session: { user: { id: 'user123' } } } }),
        },
      }));

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      // Create caller
      const ctx = createInnerTRPCContext({
        headers: new Headers(),
        cookies: {} as any,
      });
      
      const caller = appRouter.createCaller(ctx);

      // Execute the query
      const result = await caller.user.getCurrent();

      // Verify the result
      expect(result).toEqual(mockUser);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user123' },
      });
    });

    test('should throw an error when user is not authenticated', async () => {
      // Set up mocks for unauthenticated user
      (createServerClient as jest.Mock).mockImplementation(() => ({
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: null } }),
          getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
        },
      }));

      // Create caller
      const ctx = createInnerTRPCContext({
        headers: new Headers(),
        cookies: {} as any,
      });
      
      const caller = appRouter.createCaller(ctx);

      // Execute the query and expect error
      await expect(caller.user.getCurrent()).rejects.toThrow(TRPCError);
    });
  });

  describe('updateProfile', () => {
    test('should update user profile when authenticated', async () => {
      // Mock data
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        created_at: new Date().toISOString(),
        last_login: new Date().toISOString(),
      };

      const updatedUser = {
        ...mockUser,
        email: 'updated@example.com',
      };

      // Set up mocks
      (createServerClient as jest.Mock).mockImplementation(() => ({
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user123' } } }),
          getSession: jest.fn().mockResolvedValue({ data: { session: { user: { id: 'user123' } } } }),
        },
      }));

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue(updatedUser);

      // Create caller
      const ctx = createInnerTRPCContext({
        headers: new Headers(),
        cookies: {} as any,
      });
      
      const caller = appRouter.createCaller(ctx);

      // Input for the mutation
      type Input = inferProcedureInput<AppRouter['user']['updateProfile']>;
      const input: Input = {
        email: 'updated@example.com',
      };

      // Execute the mutation
      const result = await caller.user.updateProfile(input);

      // Verify the result
      expect(result).toEqual(updatedUser);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user123' },
        data: { email: 'updated@example.com' },
      });
    });

    test('should throw an error when user is not authenticated', async () => {
      // Set up mocks for unauthenticated user
      (createServerClient as jest.Mock).mockImplementation(() => ({
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: null } }),
          getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
        },
      }));

      // Create caller
      const ctx = createInnerTRPCContext({
        headers: new Headers(),
        cookies: {} as any,
      });
      
      const caller = appRouter.createCaller(ctx);

      // Input for the mutation
      type Input = inferProcedureInput<AppRouter['user']['updateProfile']>;
      const input: Input = {
        email: 'updated@example.com',
      };

      // Execute the mutation and expect error
      await expect(caller.user.updateProfile(input)).rejects.toThrow(TRPCError);
    });
  });
}); 
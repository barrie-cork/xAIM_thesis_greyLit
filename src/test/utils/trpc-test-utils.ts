import { createTRPCProxyClient, loggerLink, TRPCClientError } from '@trpc/client';
import { initTRPC, Router } from '@trpc/server';
import { httpBatchLink } from '@trpc/client/links/httpBatchLink';
import superjson from 'superjson';
import { ZodError } from 'zod';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';
import { NextRequest } from 'next/server';
import type { Session } from '@supabase/auth-helpers-nextjs';
import type { SupabaseClient } from '@supabase/ssr';
import { Database } from '../../lib/supabase/types';

/**
 * Mock Prisma Client for testing
 */
export type PrismaMock = DeepMockProxy<PrismaClient>;
export const createPrismaMock = () => mockDeep<PrismaClient>();

/**
 * Mock Supabase Client for testing
 * This is a simplified version with only the methods we need
 */
export type SupabaseMock = {
  auth: {
    getSession: () => Promise<{ data: { session: null | any } }>;
    signOut: () => Promise<{ error: null | any }>;
    updateUser: () => Promise<{ data: { user: null | any }, error: null | any }>;
  }
};

export const createSupabaseMock = (): SupabaseMock => ({
  auth: {
    getSession: () => Promise.resolve({
      data: { session: null },
    }),
    signOut: () => Promise.resolve({ error: null }),
    updateUser: () => Promise.resolve({ data: { user: null }, error: null }),
  }
});

/**
 * Mock NextRequest for testing
 */
export const createMockRequest = (): Partial<NextRequest> => ({
  cookies: {
    get: (name: string) => ({ name, value: 'test-cookie-value' }),
  },
  headers: new Headers(),
  nextUrl: new URL('http://localhost:3000'),
});

/**
 * Create a test context for tRPC procedures
 * Note: This is a simplified version of the real context
 */
export interface TestContext {
  prisma: PrismaMock;
  supabase: SupabaseMock;
  session: Session | null;
  userId: string | null;
  requestId: string;
  req: Partial<NextRequest>;
}

export function createTestContext(options: {
  prisma?: PrismaMock;
  supabase?: SupabaseMock;
  session?: Session | null;
  userId?: string | null;
  requestId?: string;
  req?: Partial<NextRequest>;
}): TestContext {
  const prisma = options.prisma || createPrismaMock();
  const supabase = options.supabase || createSupabaseMock();
  
  return {
    prisma,
    supabase,
    session: options.session || null,
    userId: options.userId || null,
    requestId: options.requestId || 'test-request-id',
    req: options.req || createMockRequest(),
  };
}

// Type alias to prevent verbosity
export type TestTRPC = ReturnType<typeof createTestTRPC>;

/**
 * Initialize tRPC for testing
 */
export function createTestTRPC() {
  // Create a new instance of tRPC for testing
  const t = initTRPC.context<TestContext>().create({
    transformer: superjson,
    errorFormatter({ shape, error }) {
      return {
        ...shape,
        data: {
          ...shape.data,
          zodError:
            error.cause instanceof ZodError ? error.cause.flatten() : null,
        },
      };
    },
  });

  // Export reusable router and procedure helpers for testing
  return {
    router: t.router,
    procedure: t.procedure,
    middleware: t.middleware,
    mergeRouters: t.mergeRouters,
  };
}

/**
 * Create a tRPC client for testing
 */
export function createTestClient<TRouter extends Router<any, any>>(router: TRouter) {
  return createTRPCProxyClient<TRouter>({
    transformer: superjson,
    links: [
      loggerLink({
        enabled: () => process.env.NODE_ENV === 'development',
      }),
      httpBatchLink({
        url: 'http://localhost:3000/api/trpc',
      }),
    ],
  });
}

/**
 * Simple caller for testing procedures directly without HTTP
 */
export function createCaller<TRouter extends Router<any, any>>(
  router: TRouter,
  ctx: TestContext
) {
  // @ts-ignore - The types here aren't perfect but it works for testing
  return router.createCaller(ctx);
} 
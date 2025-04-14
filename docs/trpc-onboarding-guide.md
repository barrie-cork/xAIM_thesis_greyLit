# tRPC Onboarding Guide

This guide provides a comprehensive introduction to using tRPC in our application. It's designed for new developers joining the project who need to understand how to work with our API layer.

## Table of Contents

1. [Introduction to tRPC](#introduction-to-trpc)
2. [Project Setup](#project-setup)
3. [Creating API Endpoints](#creating-api-endpoints)
4. [Using tRPC in React Components](#using-trpc-in-react-components)
5. [Best Practices](#best-practices)
6. [Common Pitfalls](#common-pitfalls)
7. [Utility Hooks and Components](#utility-hooks-and-components)
8. [Testing tRPC](#testing-trpc)
9. [Resources](#resources)

## Introduction to tRPC

tRPC allows us to build end-to-end typesafe APIs without schema validation or code generation. It provides:

- **Type Safety**: Full type safety from backend to frontend
- **Great Developer Experience**: Autocomplete for API endpoints
- **Small Bundle Size**: No runtime validation needed
- **Easy to Use**: Simple API with minimal boilerplate

## Project Setup

Our project uses tRPC with Next.js App Router. The main components are:

- **Server**: Located in `src/server/trpc/`
  - `router.ts`: Main router that combines all sub-routers
  - `procedures.ts`: Defines public and protected procedures
  - `context.ts`: Creates the context for each request
  - `routers/`: Directory containing all sub-routers

- **Client**: Located in `src/utils/`
  - `trpc.ts`: Creates the tRPC client for React components
  - `api.ts`: Creates the tRPC client for Next.js

## Creating API Endpoints

### 1. Define a Router

Create a new router in `src/server/trpc/routers/` or add to an existing one:

```typescript
// src/server/trpc/routers/example.ts
import { router, publicProcedure, protectedProcedure } from '../procedures';
import { z } from 'zod';

export const exampleRouter = router({
  // Public procedure (no authentication required)
  hello: publicProcedure
    .input(z.object({ name: z.string() }))
    .query(({ input }) => {
      return { greeting: `Hello, ${input.name}!` };
    }),

  // Protected procedure (authentication required)
  secretMessage: protectedProcedure
    .query(({ ctx }) => {
      // ctx.userId is available here
      return { message: `This is a secret message for user ${ctx.userId}` };
    }),

  // Mutation (changes data)
  createItem: protectedProcedure
    .input(z.object({ name: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Create item in database
      const item = await ctx.prisma.item.create({
        data: {
          name: input.name,
          userId: ctx.userId,
        },
      });
      return item;
    }),
});
```

### 2. Add the Router to the Main Router

Add your router to the main router in `src/server/trpc/router.ts`:

```typescript
import { router } from './procedures';
import { exampleRouter } from './routers/example';

export const appRouter = router({
  example: exampleRouter,
  // Other routers...
});

export type AppRouter = typeof appRouter;
```

## Using tRPC in React Components

### Queries (Reading Data)

Use the `useQuery` hook to fetch data:

```tsx
import { trpc } from '@/utils/trpc';

function MyComponent() {
  const { data, isLoading, error } = trpc.example.hello.useQuery({ name: 'World' });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return <div>{data.greeting}</div>;
}
```

### Mutations (Writing Data)

Use the `useMutation` hook to modify data:

```tsx
import { trpc } from '@/utils/trpc';

function MyComponent() {
  const mutation = trpc.example.createItem.useMutation({
    onSuccess: (data) => {
      console.log('Item created:', data);
    },
    onError: (error) => {
      console.error('Error creating item:', error);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const name = e.target.name.value;
    mutation.mutate({ name });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="name" />
      <button type="submit" disabled={mutation.isLoading}>
        {mutation.isLoading ? 'Creating...' : 'Create Item'}
      </button>
      {mutation.error && <div>Error: {mutation.error.message}</div>}
    </form>
  );
}
```

### Using Our Custom Hook

We've created a custom hook `useTRPCMutation` to simplify mutation usage:

```tsx
import { useTRPCMutation } from '@/hooks/useTRPCMutation';

function MyComponent() {
  const { mutation, error, isSuccess, mutate } = useTRPCMutation('example.createItem', {
    onSuccess: (data) => {
      console.log('Item created:', data);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const name = e.target.name.value;
    mutate({ name });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="name" />
      <button type="submit" disabled={mutation.isLoading}>
        {mutation.isLoading ? 'Creating...' : 'Create Item'}
      </button>
      {error && <div>Error: {error}</div>}
      {isSuccess && <div>Item created successfully!</div>}
    </form>
  );
}
```

## Best Practices

1. **Use Zod for Input Validation**: Always validate inputs with Zod schemas
2. **Use Protected Procedures**: Use `protectedProcedure` for authenticated routes
3. **Handle Errors Properly**: Always handle errors in your components
4. **Use Loading States**: Show loading indicators during API calls
5. **Use the `useMutation` Hook**: Never use `trpcClient` directly in components
6. **Keep Routers Organized**: Split routers into logical groups
7. **Use Context for Database Access**: Access database through the context

For more details, see [tRPC Best Practices](./trpc-best-practices.md).

## Common Pitfalls

1. **Using `trpcClient` Directly**: Always use the `useMutation` hook in components
2. **Not Handling Loading States**: Always show loading indicators
3. **Not Handling Errors**: Always handle errors in your components
4. **Not Validating Inputs**: Always use Zod schemas for input validation
5. **Not Using Protected Procedures**: Use `protectedProcedure` for authenticated routes

## Utility Hooks and Components

We've created several utility hooks and components to make working with tRPC easier:

1. **`useTRPCMutation`**: A custom hook for standardized mutation handling
2. **`MutationStateDisplay`**: A component for displaying mutation states

See the [Utility Hooks README](../src/hooks/README.md) and [Utility Components README](../src/components/utils/README.md) for more details.

## Testing tRPC

We use Vitest for testing tRPC. Here's how to test tRPC procedures:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { appRouter } from '@/server/trpc/router';
import { createInnerTRPCContext } from '@/server/trpc/context';

describe('Example Router', () => {
  it('should return a greeting', async () => {
    // Create a context
    const ctx = createInnerTRPCContext({
      session: null,
      userId: null,
    });

    // Create a caller
    const caller = appRouter.createCaller(ctx);

    // Call the procedure
    const result = await caller.example.hello({ name: 'Test' });

    // Assert the result
    expect(result).toEqual({ greeting: 'Hello, Test!' });
  });
});
```

## Resources

- [tRPC Documentation](https://trpc.io/docs)
- [tRPC GitHub Repository](https://github.com/trpc/trpc)
- [Zod Documentation](https://zod.dev/)
- [Our tRPC Best Practices](./trpc-best-practices.md)
- [Our tRPC API Usage Fix](./trpc-api-usage-fix.md)

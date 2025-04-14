# tRPC Cheat Sheet

A quick reference guide for working with tRPC in our application.

## Server-Side

### Creating a Router

```typescript
// src/server/trpc/routers/example.ts
import { router, publicProcedure, protectedProcedure } from '../procedures';
import { z } from 'zod';

export const exampleRouter = router({
  // Procedures go here
});
```

### Adding a Query Procedure (Read)

```typescript
// Public query (no auth required)
getItems: publicProcedure
  .input(z.object({
    limit: z.number().min(1).max(100).optional().default(10),
    cursor: z.string().optional(),
  }))
  .query(async ({ ctx, input }) => {
    const items = await ctx.prisma.item.findMany({
      take: input.limit + 1,
      cursor: input.cursor ? { id: input.cursor } : undefined,
      orderBy: { createdAt: 'desc' },
    });
    
    const hasMore = items.length > input.limit;
    const nextCursor = hasMore ? items.pop().id : undefined;
    
    return {
      items,
      nextCursor,
    };
  });
```

### Adding a Mutation Procedure (Write)

```typescript
// Protected mutation (auth required)
createItem: protectedProcedure
  .input(z.object({
    name: z.string().min(1).max(100),
    description: z.string().optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    return ctx.prisma.item.create({
      data: {
        name: input.name,
        description: input.description,
        userId: ctx.userId,
      },
    });
  });
```

### Adding the Router to the Main Router

```typescript
// src/server/trpc/router.ts
import { router } from './procedures';
import { exampleRouter } from './routers/example';

export const appRouter = router({
  example: exampleRouter,
  // Other routers...
});
```

## Client-Side

### Using Queries (Read)

```tsx
// Basic query
const { data, isLoading, error } = trpc.example.getItems.useQuery({ limit: 10 });

// With options
const { data, isLoading, error } = trpc.example.getItems.useQuery(
  { limit: 10 },
  {
    enabled: !!userId,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
    onSuccess: (data) => {
      console.log('Data fetched:', data);
    },
    onError: (error) => {
      console.error('Error fetching data:', error);
    },
  }
);
```

### Using Mutations (Write)

```tsx
// Basic mutation
const mutation = trpc.example.createItem.useMutation();
mutation.mutate({ name: 'New Item' });

// With options
const mutation = trpc.example.createItem.useMutation({
  onSuccess: (data) => {
    console.log('Item created:', data);
    // Invalidate queries to refetch data
    utils.example.getItems.invalidate();
  },
  onError: (error) => {
    console.error('Error creating item:', error);
  },
});

// Using mutateAsync with await
try {
  const result = await mutation.mutateAsync({ name: 'New Item' });
  console.log('Item created:', result);
} catch (error) {
  console.error('Error creating item:', error);
}
```

### Using Our Custom Hook

```tsx
// Using useTRPCMutation
const { mutation, error, isSuccess, mutate } = useTRPCMutation('example.createItem', {
  onSuccess: (data) => {
    console.log('Item created:', data);
  },
});

// Call the mutation
mutate({ name: 'New Item' });
```

### Displaying Mutation States

```tsx
// Using MutationStateDisplay
<MutationStateDisplay
  isLoading={mutation.isLoading}
  error={mutation.error}
  isSuccess={isSuccess}
  successMessage="Item created successfully!"
  loadingMessage="Creating item..."
/>
```

## Common Patterns

### Invalidating Queries

```tsx
// Get the utils
const utils = trpc.useContext();

// Invalidate a specific query
utils.example.getItems.invalidate();

// Invalidate all queries in a router
utils.example.invalidate();
```

### Optimistic Updates

```tsx
const utils = trpc.useContext();

const mutation = trpc.example.createItem.useMutation({
  onMutate: async (newItem) => {
    // Cancel outgoing fetches
    await utils.example.getItems.cancel();
    
    // Get the data from the cache
    const prevData = utils.example.getItems.getData();
    
    // Optimistically update the cache
    utils.example.getItems.setData(undefined, (old) => {
      return {
        ...old,
        items: [
          { id: 'temp-id', ...newItem, createdAt: new Date() },
          ...old.items,
        ],
      };
    });
    
    // Return the previous data so we can revert if something goes wrong
    return { prevData };
  },
  onError: (err, newItem, context) => {
    // Revert to the previous data if there was an error
    utils.example.getItems.setData(undefined, context.prevData);
  },
  onSettled: () => {
    // Refetch after error or success to make sure our cache is correct
    utils.example.getItems.invalidate();
  },
});
```

### Infinite Queries

```tsx
const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = 
  trpc.example.getItems.useInfiniteQuery(
    { limit: 10 },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  );

// Render the data
return (
  <div>
    {data?.pages.map((page) => (
      page.items.map((item) => (
        <div key={item.id}>{item.name}</div>
      ))
    ))}
    
    <button
      onClick={() => fetchNextPage()}
      disabled={!hasNextPage || isFetchingNextPage}
    >
      {isFetchingNextPage
        ? 'Loading more...'
        : hasNextPage
        ? 'Load more'
        : 'No more items'}
    </button>
  </div>
);
```

## Error Handling

```tsx
// Error handling in a component
const { data, isLoading, error } = trpc.example.getItems.useQuery({ limit: 10 });

if (isLoading) return <div>Loading...</div>;
if (error) return <div>Error: {error.message}</div>;

// Error handling in a mutation
const mutation = trpc.example.createItem.useMutation({
  onError: (error) => {
    if (error.data?.code === 'UNAUTHORIZED') {
      // Handle unauthorized error
    } else if (error.data?.code === 'BAD_REQUEST') {
      // Handle bad request error
    } else {
      // Handle other errors
    }
  },
});
```

## Testing

```typescript
// Testing a query procedure
it('should return items', async () => {
  const ctx = createInnerTRPCContext({
    session: null,
    userId: null,
  });
  
  const caller = appRouter.createCaller(ctx);
  const result = await caller.example.getItems({ limit: 10 });
  
  expect(result.items).toBeInstanceOf(Array);
});

// Testing a protected procedure
it('should create an item', async () => {
  const ctx = createInnerTRPCContext({
    session: { user: { id: 'test-user-id' } },
    userId: 'test-user-id',
  });
  
  const caller = appRouter.createCaller(ctx);
  const result = await caller.example.createItem({ name: 'Test Item' });
  
  expect(result.name).toBe('Test Item');
  expect(result.userId).toBe('test-user-id');
});
```

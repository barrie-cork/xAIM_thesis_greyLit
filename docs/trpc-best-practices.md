# tRPC Best Practices

This document outlines the best practices for using tRPC in our application to ensure consistent patterns and avoid common issues.

## Using tRPC Mutations in React Components

### ✅ DO: Use the `useMutation` hook

Always use the `useMutation` hook from the `trpc` object for mutations in React components:

```tsx
import { trpc } from '@/utils/trpc';

function MyComponent() {
  const mutation = trpc.search.execute.useMutation({
    onSuccess: (data) => {
      // Handle success
    },
    onError: (error) => {
      // Handle error
    }
  });

  const handleSubmit = () => {
    mutation.mutate({ query: "example" });
  };

  return (
    <div>
      {mutation.isLoading && <Spinner />}
      {mutation.error && <ErrorMessage message={mutation.error.message} />}
      <button onClick={handleSubmit}>Submit</button>
    </div>
  );
}
```

### ❌ DON'T: Use `trpcClient` directly in components

Never use the `trpcClient` directly in React components for mutations:

```tsx
// INCORRECT - Don't do this!
import { trpcClient } from '@/utils/trpc';

function MyComponent() {
  const handleSubmit = async () => {
    try {
      const result = await trpcClient.search.execute({ query: "example" });
      // Handle result
    } catch (error) {
      // Handle error
    }
  };

  return <button onClick={handleSubmit}>Submit</button>;
}
```

## Handling Loading and Error States

Always handle loading and error states when using tRPC mutations:

```tsx
const mutation = trpc.search.execute.useMutation();

// In your JSX
{mutation.isLoading && <Spinner />}
{mutation.error && <ErrorMessage message={mutation.error.message} />}
{mutation.isSuccess && <SuccessMessage data={mutation.data} />}
```

## Using tRPC Queries

For queries, use the `useQuery` hook:

```tsx
const { data, isLoading, error } = trpc.search.getResults.useQuery(
  { searchId: "123" },
  {
    enabled: !!searchId, // Only run the query when searchId is available
    refetchOnWindowFocus: false, // Disable refetching when window regains focus
  }
);
```

## TRPCProvider

Ensure all components using tRPC hooks are wrapped in the `TRPCProvider` component:

```tsx
import { TRPCProvider } from '@/components/TRPCProvider';

function MyApp({ children }) {
  return (
    <TRPCProvider>
      {children}
    </TRPCProvider>
  );
}
```

## When to Use `trpcClient`

The `trpcClient` should only be used in:

1. Server-side code (not in React components)
2. Utility functions that are not part of the React component tree
3. Testing environments

## Reference Implementation

See `src/components/utils/TRPCMutationExample.tsx` for a reference implementation of proper tRPC mutation usage.

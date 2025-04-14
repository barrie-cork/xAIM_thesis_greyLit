# Utility Components

This directory contains utility components that can be used throughout the application.

## TRPCMutationExample

`TRPCMutationExample` is a reference implementation of proper tRPC mutation usage. It demonstrates how to use the `useMutation` hook from tRPC and handle loading, error, and success states.

### Usage

```tsx
import { TRPCMutationExample } from '@/components/utils/TRPCMutationExample';

function MyPage() {
  return (
    <div>
      <h1>Example Page</h1>
      <TRPCMutationExample />
    </div>
  );
}
```

## MutationStateDisplay

`MutationStateDisplay` is a reusable component for displaying tRPC mutation states. It shows loading spinners, error messages, and success messages based on the state of the mutation.

### Usage

```tsx
import { trpc } from '@/utils/trpc';
import { MutationStateDisplay } from '@/components/utils/MutationStateDisplay';

function MyComponent() {
  const mutation = trpc.search.execute.useMutation();
  
  return (
    <div>
      <MutationStateDisplay
        isLoading={mutation.isLoading}
        error={mutation.error}
        isSuccess={mutation.isSuccess}
        successMessage="Search executed successfully!"
        loadingMessage="Executing search..."
      />
      <button onClick={() => mutation.mutate({ query: 'example' })}>
        Execute Search
      </button>
    </div>
  );
}
```

### API

```tsx
interface MutationStateDisplayProps {
  isLoading: boolean;
  error: Error | null;
  isSuccess: boolean;
  successMessage?: string;
  loadingMessage?: string;
}
```

- `isLoading`: Whether the mutation is loading
- `error`: Error object if the mutation failed, null otherwise
- `isSuccess`: Whether the mutation succeeded
- `successMessage`: Message to display when the mutation succeeds (default: 'Operation completed successfully')
- `loadingMessage`: Message to display when the mutation is loading (default: 'Processing request...')

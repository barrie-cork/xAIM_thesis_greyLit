# Custom Hooks

This directory contains custom hooks that can be used throughout the application.

## useTRPCMutation

`useTRPCMutation` is a custom hook that provides a standardized way to use tRPC mutations with proper error handling and state management.

### Usage

```tsx
import { useTRPCMutation } from '@/hooks/useTRPCMutation';

function MyComponent() {
  const {
    mutation,
    error,
    isSuccess,
    reset,
    mutate,
    mutateAsync
  } = useTRPCMutation('search.execute', {
    onSuccess: (data) => {
      // Handle success
      console.log('Search created with ID:', data.searchRequestId);
    },
    onError: (error) => {
      // Handle error
      console.error('Error executing search:', error);
    }
  });

  const handleSubmit = () => {
    mutate({
      query: 'example search',
      providers: ['SERPER'],
      maxResults: 10
    });
  };

  return (
    <div>
      {mutation.isLoading && <Spinner />}
      {error && <ErrorMessage message={error} />}
      {isSuccess && <SuccessMessage />}
      <button onClick={handleSubmit} disabled={mutation.isLoading}>
        Execute Search
      </button>
    </div>
  );
}
```

### API

```tsx
function useTRPCMutation<
  TProcedure extends keyof RouterInputs,
  TInput extends RouterInputs[TProcedure],
  TOutput extends RouterOutputs[TProcedure]
>(
  procedure: TProcedure,
  options?: {
    onSuccess?: (data: TOutput) => void;
    onError?: (error: Error) => void;
  }
): {
  mutation: UseTRPCMutationResult<TOutput, TRPCClientErrorLike<AppRouter>>;
  error: string | null;
  isSuccess: boolean;
  reset: () => void;
  mutate: (input: TInput) => void;
  mutateAsync: (input: TInput) => Promise<TOutput>;
}
```

- `procedure`: The tRPC procedure to call (e.g., 'search.execute')
- `options`: Additional options for the mutation
  - `onSuccess`: Callback function called when the mutation succeeds
  - `onError`: Callback function called when the mutation fails

Returns:
- `mutation`: The original tRPC mutation object
- `error`: Error message if the mutation failed, null otherwise
- `isSuccess`: Whether the mutation succeeded
- `reset`: Function to reset the state
- `mutate`: Function to trigger the mutation
- `mutateAsync`: Function to trigger the mutation and return a promise

'use client';

import { useState } from 'react';
import { trpc } from '@/utils/trpc';
import type { RouterInputs, RouterOutputs } from '@/utils/api';

/**
 * Custom hook for tRPC mutations with standardized error handling
 * 
 * @param procedure - The tRPC procedure to call (e.g., 'search.execute')
 * @param options - Additional options for the mutation
 * @returns A tuple containing the mutation object and helper functions
 */
export function useTRPCMutation<
  TProcedure extends keyof RouterInputs,
  TInput extends RouterInputs[TProcedure],
  TOutput extends RouterOutputs[TProcedure]
>(
  procedure: TProcedure,
  options?: {
    onSuccess?: (data: TOutput) => void;
    onError?: (error: Error) => void;
  }
) {
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Get the mutation from tRPC
  const mutation = trpc[procedure].useMutation({
    onSuccess: (data) => {
      setIsSuccess(true);
      setError(null);
      options?.onSuccess?.(data as TOutput);
    },
    onError: (err) => {
      setError(err.message);
      setIsSuccess(false);
      options?.onError?.(err);
    },
  });

  // Reset the state
  const reset = () => {
    setError(null);
    setIsSuccess(false);
  };

  return {
    mutation,
    error,
    isSuccess,
    reset,
    mutate: (input: TInput) => mutation.mutate(input as any),
    mutateAsync: (input: TInput) => mutation.mutateAsync(input as any),
  };
}

export default useTRPCMutation;

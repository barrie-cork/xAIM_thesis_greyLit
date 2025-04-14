'use client';

import { useState } from 'react';
import { trpc } from '@/utils/trpc';
import { Button, Alert, AlertTitle, AlertDescription, Spinner } from '@/components/ui';

/**
 * Example component demonstrating the proper way to use tRPC mutations
 * This serves as a reference for other components in the application
 */
export function TRPCMutationExample() {
  const [result, setResult] = useState<any>(null);
  
  // Use the useMutation hook from trpc
  const mutation = trpc.search.execute.useMutation({
    // Handle successful response
    onSuccess: (data) => {
      setResult(data);
    },
    // Handle errors
    onError: (error) => {
      console.error('Mutation error:', error);
    }
  });

  // Example handler function that triggers the mutation
  const handleExecuteSearch = () => {
    mutation.mutate({
      query: 'example search',
      providers: ['SERPER'],
      maxResults: 10
    });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">tRPC Mutation Example</h3>
      
      {/* Show loading state */}
      {mutation.isLoading && (
        <div className="flex items-center space-x-2">
          <Spinner size="sm" />
          <span>Processing request...</span>
        </div>
      )}
      
      {/* Show error state */}
      {mutation.error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{mutation.error.message}</AlertDescription>
        </Alert>
      )}
      
      {/* Show success state */}
      {mutation.isSuccess && (
        <Alert>
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>
            Search request created with ID: {result?.searchRequestId}
          </AlertDescription>
        </Alert>
      )}
      
      {/* Trigger button */}
      <Button 
        onClick={handleExecuteSearch} 
        disabled={mutation.isLoading}
      >
        Execute Search
      </Button>
    </div>
  );
}

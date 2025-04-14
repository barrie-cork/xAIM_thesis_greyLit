'use client';

import { useState } from 'react';
import { Button, Input, Label, Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui';
import { useTRPCMutation } from '@/hooks/useTRPCMutation';
import { MutationStateDisplay } from '@/components/utils/MutationStateDisplay';

/**
 * Example component demonstrating the proper way to use tRPC mutations
 * with our custom hooks and components
 */
export function SearchMutationExample() {
  const [query, setQuery] = useState('');
  const [searchId, setSearchId] = useState<string | null>(null);

  // Use our custom hook for the search mutation
  const {
    mutation,
    error,
    isSuccess,
    mutate
  } = useTRPCMutation('search.execute', {
    onSuccess: (data) => {
      if (data.searchRequestId) {
        setSearchId(data.searchRequestId);
      }
    }
  });

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    mutate({
      query,
      providers: ['SERPER'],
      maxResults: 10
    });
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Search Example</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="query">Search Query</Label>
            <Input
              id="query"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter search query"
              required
            />
          </div>

          {/* Display mutation state */}
          <MutationStateDisplay
            isLoading={mutation.isLoading}
            error={error ? new Error(error) : null}
            isSuccess={isSuccess}
            successMessage={searchId ? `Search created with ID: ${searchId}` : 'Search completed'}
            loadingMessage="Executing search..."
          />
        </form>
      </CardContent>
      <CardFooter>
        <Button 
          type="submit" 
          onClick={handleSubmit}
          disabled={mutation.isLoading || !query.trim()}
          className="w-full"
        >
          Execute Search
        </Button>
      </CardFooter>
    </Card>
  );
}

export default SearchMutationExample;

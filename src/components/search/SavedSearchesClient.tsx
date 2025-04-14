'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, Button, Badge, Alert, AlertDescription, AlertTitle } from '@/components/ui';
import { Search, ArrowLeft, AlertCircle, Trash2, ExternalLink, Calendar, Clock } from 'lucide-react';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { api } from '@/utils/api';

interface SavedSearch {
  id: string;
  query: string;
  source: string;
  filters: any;
  searchTitle: string;
  timestamp: Date;
}

interface SavedSearchesClientProps {
  userId: string;
}

export function SavedSearchesClient({ userId }: SavedSearchesClientProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);

  // Use tRPC to fetch saved searches
  const { data, isLoading: tRPCLoading, error: tRPCError } = api.search.getSaved.useQuery(undefined, {
    onSuccess: (data) => {
      // Transform data if needed
      const formattedSearches = data.map(search => ({
        id: search.query_id,
        query: search.query,
        source: search.source,
        filters: search.filters,
        searchTitle: search.search_title || `Search: ${search.query.substring(0, 30)}...`,
        timestamp: new Date(search.timestamp)
      }));
      setSavedSearches(formattedSearches);
      setIsLoading(false);
    },
    onError: (err) => {
      setError(err.message);
      setIsLoading(false);
    }
  });

  // Fallback to mock data if tRPC fails or for development
  useEffect(() => {
    if (!tRPCLoading && !data && !tRPCError) {
      // Mock data for development
      const mockSavedSearches: SavedSearch[] = [
        {
          id: '1',
          query: 'diabetes AND (treatment OR therapy) AND "clinical guidelines"',
          source: 'Google,Bing',
          filters: { fileTypes: ['pdf', 'doc'], domain: 'nice.org.uk' },
          searchTitle: 'Diabetes Treatment Guidelines',
          timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
        },
        {
          id: '2',
          query: 'covid-19 AND (vaccination OR immunization) AND children',
          source: 'Google',
          filters: { fileTypes: ['pdf'], domain: 'cdc.gov' },
          searchTitle: 'COVID-19 Vaccination for Children',
          timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
        }
      ];
      setSavedSearches(mockSavedSearches);
      setIsLoading(false);
    }
  }, [tRPCLoading, data, tRPCError]);

  // Delete saved search
  const deleteSavedSearch = api.search.delete.useMutation({
    onSuccess: () => {
      // Refetch saved searches
      api.search.getSaved.invalidate();
    },
    onError: (err) => {
      setError(`Failed to delete search: ${err.message}`);
    }
  });

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this saved search?')) {
      deleteSavedSearch.mutate({ id });
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-gray-600">Loading saved searches...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <Link href="/" className="inline-flex items-center justify-center rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-300">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Link>
        <LogoutButton />
      </div>

      {savedSearches.length === 0 ? (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Saved Searches</h3>
              <p className="text-gray-500 mb-4">You haven't saved any searches yet.</p>
              <Link href="/search-builder" className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                Create a Search
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {savedSearches.map((search) => (
            <Card key={search.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle>{search.searchTitle}</CardTitle>
                  <Badge variant="outline" className="ml-2">
                    {search.source.split(',').join(', ')}
                  </Badge>
                </div>
                <CardDescription>
                  <div className="flex items-center text-sm text-gray-500 mt-1">
                    <Calendar className="h-4 w-4 mr-1" />
                    {formatDate(search.timestamp)}
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 p-3 rounded-md font-mono text-sm overflow-x-auto">
                  {search.query}
                </div>
                {search.filters && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium mb-2">Filters:</h4>
                    <div className="flex flex-wrap gap-2">
                      {search.filters.fileTypes && search.filters.fileTypes.map((type: string) => (
                        <Badge key={type} variant="secondary">{type.toUpperCase()}</Badge>
                      ))}
                      {search.filters.domain && (
                        <Badge variant="secondary">Domain: {search.filters.domain}</Badge>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/search-builder?id=${search.id}`}>
                    <Search className="h-4 w-4 mr-2" />
                    Edit
                  </Link>
                </Button>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/search-results?id=${search.id}`}>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Results
                    </Link>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleDelete(search.id)}
                    disabled={deleteSavedSearch.isLoading}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

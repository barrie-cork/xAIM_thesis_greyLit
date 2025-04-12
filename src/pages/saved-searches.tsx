import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Button,
  Alert,
  AlertTitle,
  AlertDescription,
} from '@/components/ui';
import { ArrowLeft, Search, Trash2, Edit, AlertCircle, Loader2 } from 'lucide-react';
import { trpc } from '@/utils/trpc';

export default function SavedSearches() {
  const router = useRouter();
  
  // Fetch saved searches
  const { 
    data: savedSearches, 
    isLoading, 
    isError, 
    error,
    refetch 
  } = trpc.search.getSavedSearches.useQuery();
  
  // Delete mutation
  const deleteMutation = trpc.search.delete.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  // Handle executing a saved search
  const handleExecuteSearch = (query: string) => {
    router.push({
      pathname: '/search-results',
      query: { 
        q: query,
        max: 20,
        dedup: 'true',
      }
    });
  };

  // Handle editing a saved search
  const handleEditSearch = (searchData: any) => {
    // Store the search data in localStorage to be loaded by the search builder
    if (typeof window !== 'undefined') {
      localStorage.setItem('editSearchData', JSON.stringify(searchData));
      router.push('/search-builder?edit=true');
    }
  };

  // Handle deleting a saved search
  const handleDeleteSearch = async (queryId: string) => {
    if (confirm('Are you sure you want to delete this saved search?')) {
      try {
        await deleteMutation.mutateAsync({ query_id: queryId });
      } catch (err) {
        console.error('Failed to delete search:', err);
      }
    }
  };

  return (
    <>
      <Head>
        <title>Saved Searches | Grey Literature Search</title>
        <meta name="description" content="View and manage your saved search strategies" />
      </Head>
      
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <div className="flex items-center mb-4">
              <Link href="/" passHref>
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Home
                </Button>
              </Link>
              
              <h1 className="text-2xl font-bold ml-4">Saved Searches</h1>
            </div>
            
            <p className="text-gray-600">
              View, edit, and execute your saved search strategies.
            </p>
          </div>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
              <span className="ml-3 text-gray-600">Loading saved searches...</span>
            </div>
          ) : isError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                {error?.message || 'Failed to load saved searches'}
              </AlertDescription>
            </Alert>
          ) : savedSearches && savedSearches.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {savedSearches.map((search) => (
                <Card key={search.query_id} className="flex flex-col">
                  <CardHeader>
                    <CardTitle className="text-lg">{search.search_title || 'Untitled Search'}</CardTitle>
                    <CardDescription className="truncate">
                      {search.query}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <div className="text-sm text-gray-500">
                      <p><strong>Source:</strong> {search.source}</p>
                      <p><strong>Created:</strong> {new Date(search.timestamp).toLocaleDateString()}</p>
                      {search.filters && (
                        <div className="mt-2">
                          <p className="font-medium">Filters:</p>
                          <pre className="text-xs bg-gray-50 p-2 rounded mt-1 overflow-auto max-h-24">
                            {JSON.stringify(search.filters, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between border-t pt-4">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleEditSearch(search)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button 
                      variant="default" 
                      size="sm"
                      onClick={() => handleExecuteSearch(search.query)}
                    >
                      <Search className="h-4 w-4 mr-1" />
                      Execute
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => handleDeleteSearch(search.query_id)}
                      disabled={deleteMutation.isLoading}
                    >
                      {deleteMutation.isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg border p-8 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <Search className="h-6 w-6 text-gray-500" />
              </div>
              <h3 className="text-lg font-medium mb-2">No saved searches</h3>
              <p className="text-gray-500 mb-4">
                You haven't saved any search strategies yet. Create and save a search to see it here.
              </p>
              <Link href="/search-builder" passHref>
                <Button>
                  Create a Search
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

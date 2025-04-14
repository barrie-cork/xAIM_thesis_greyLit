'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, Button, Badge, Alert, AlertDescription, AlertTitle, Separator, Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui';
import { ExternalLink, ArrowLeft, AlertCircle, Search, Server, CheckCircle, Filter, ArrowRight, ArrowLeft as ArrowLeftIcon, LayersIcon } from 'lucide-react';
import { LogoutButton } from '@/components/auth/LogoutButton';

// Define types for search results
interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  searchEngine: string;
  timestamp: Date;
  rank?: number;
  resultType?: string;
}

interface SearchResultsClientProps {
  searchId: string;
  userId: string;
}

export function SearchResultsClient({ searchId, userId }: SearchResultsClientProps) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Here you would fetch the search results using the searchId
    // For now, we'll simulate loading and then set some mock results
    const fetchResults = async () => {
      try {
        setIsLoading(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Mock results
        const mockResults: SearchResult[] = [
          {
            title: "Example Result 1",
            url: "https://example.com/result1",
            snippet: "This is a sample search result snippet that would typically contain relevant text from the page.",
            searchEngine: "Google",
            timestamp: new Date(),
            rank: 1,
            resultType: "webpage"
          },
          {
            title: "Example Result 2",
            url: "https://example.com/result2",
            snippet: "Another sample search result with different content to demonstrate the results list.",
            searchEngine: "Bing",
            timestamp: new Date(),
            rank: 2,
            resultType: "pdf"
          }
        ];
        
        setResults(mockResults);
        setIsLoading(false);
      } catch (err) {
        setError("Failed to load search results. Please try again.");
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [searchId]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-gray-600">Loading search results...</p>
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
        <Link href="/search-builder" className="inline-flex items-center justify-center rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-300">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Search Builder
        </Link>
        <LogoutButton />
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Search Results</CardTitle>
          <CardDescription>
            Showing {results.length} results for search ID: {searchId}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {results.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No results found for this search.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {results.map((result, index) => (
                <div key={index} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <h3 className="text-lg font-medium text-blue-600 hover:underline">
                      <a href={result.url} target="_blank" rel="noopener noreferrer">
                        {result.title}
                      </a>
                    </h3>
                    <Badge variant="outline" className="ml-2">
                      {result.resultType}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{result.url}</p>
                  <p className="mt-2">{result.snippet}</p>
                  <div className="flex justify-between items-center mt-3">
                    <div className="flex items-center text-sm text-gray-500">
                      <Server className="h-4 w-4 mr-1" />
                      {result.searchEngine}
                    </div>
                    <Button variant="outline" size="sm" className="ml-auto">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Visit
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

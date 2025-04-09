import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, Button, Badge, Alert, AlertDescription, AlertTitle, Separator, Tabs, TabsContent, TabsList, TabsTrigger, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui';
import { ExternalLink, ArrowLeft, AlertCircle, Search, Server, CheckCircle, Filter, ArrowRight, ArrowLeft as ArrowLeftIcon, LayersIcon, X } from 'lucide-react';
import Link from 'next/link';

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

interface DeduplicationInfo {
  enabled: boolean;
  originalCount: number;
  uniqueCount: number;
  duplicatesRemoved: number;
}

interface SearchResponse {
  results: SearchResult[];
  provider: string;
  metadata: {
    searchEngine: string;
    creditsUsed: number;
    timestamp: Date;
    deduplication?: DeduplicationInfo;
    queryType?: string;
    duplicates?: DuplicateResult[];
  };
}

// Add a new interface for duplicate results
interface DuplicateResult {
  original: SearchResult;
  duplicates: SearchResult[];
}

export default function SearchResults() {
  const router = useRouter();
  const [results, setResults] = useState<SearchResponse[]>([]);
  const [allResults, setAllResults] = useState<Map<string, SearchResponse[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('results');
  const [duplicates, setDuplicates] = useState<DuplicateResult[]>([]);
  const [isDuplicatesDialogOpen, setIsDuplicatesDialogOpen] = useState(false);
  
  // New state for batch search
  const [currentBatchIndex, setCurrentBatchIndex] = useState(0);
  const [allQueries, setAllQueries] = useState<Array<{query: string, type: string, domain?: string}>>([]);
  const isBatchSearch = router.query.batch === 'true';
  const batchSize = router.query.batch_size ? parseInt(router.query.batch_size as string, 10) : 0;

  useEffect(() => {
    // Only run the search if we have a query parameter
    if (router.isReady && router.query.q) {
      // Check if we have multiple queries
      if (router.query.all_queries) {
        try {
          const queriesData = JSON.parse(router.query.all_queries as string);
          setAllQueries(queriesData);
          
          // Execute all queries in parallel
          executeAllSearches(queriesData);
        } catch (err) {
          console.error('Failed to parse queries:', err);
          // Fallback to single query
          executeSearch(router.query.q as string, 0);
        }
      } else {
        // Just a single query
        executeSearch(router.query.q as string, 0);
      }
    }
  }, [router.isReady, router.query.q, router.query.all_queries]);

  const executeAllSearches = async (queries: Array<{query: string, type: string, domain?: string}>) => {
    try {
      setLoading(true);
      setError(null);
      
      // Create a map to store results for each query
      const resultsMap = new Map<string, SearchResponse[]>();
      
      // Execute all queries in parallel
      const searchPromises = queries.map((queryData, index) => 
        executeSearchForQuery(queryData.query, index, queryData.type, queryData.domain)
          .then(result => {
            if (result) {
              resultsMap.set(queryData.query, result);
            }
          })
      );
      
      // Wait for all searches to complete
      await Promise.all(searchPromises);
      
      // Store all results
      setAllResults(resultsMap);
      
      // Set the results for the current query
      if (queries.length > 0 && resultsMap.has(queries[currentBatchIndex].query)) {
        setResults(resultsMap.get(queries[currentBatchIndex].query) || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const executeSearch = async (query: string, index: number) => {
    try {
      setLoading(true);
      setError(null);

      const searchResults = await executeSearchForQuery(query, index);
      
      if (searchResults) {
        setResults(searchResults);
        
        // Set duplicates data if available
        if (searchResults[0]?.metadata?.duplicates) {
          setDuplicates(searchResults[0].metadata.duplicates);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const executeSearchForQuery = async (query: string, index: number, queryType?: string, domain?: string): Promise<SearchResponse[] | null> => {
    try {
      // Parse domains from URL if present
      const domains = domain 
        ? [domain]
        : router.query.domains 
          ? (router.query.domains as string).split(',') 
          : [];

      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          maxResults: router.query.max || 20,
          deduplication: router.query.dedup !== 'false',
          useGoogleScholar: queryType === 'scholar' || router.query.scholar === 'true',
          query_type: queryType || router.query.query_type || 'broad',
          batchId: router.query.batch_id || undefined,
          batchIndex: index,
          includeDuplicates: true, // Request duplicates information
          domains // Pass domains to the API
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to execute search');
      }

      return await response.json();
    } catch (err) {
      console.error(`Error searching for query ${query}:`, err);
      return null;
    }
  };

  const goToNextBatchSearch = () => {
    if (!isBatchSearch || currentBatchIndex >= allQueries.length - 1) return;
    
    const nextIndex = currentBatchIndex + 1;
    setCurrentBatchIndex(nextIndex);
    
    // Update displayed results from the all results map
    const nextQuery = allQueries[nextIndex];
    if (nextQuery && allResults.has(nextQuery.query)) {
      setResults(allResults.get(nextQuery.query) || []);
      
      // Update duplicates data if available
      const nextResults = allResults.get(nextQuery.query) || [];
      if (nextResults.length > 0 && nextResults[0]?.metadata?.duplicates) {
        setDuplicates(nextResults[0].metadata.duplicates);
      }
    }
  };

  const goToPreviousBatchSearch = () => {
    if (!isBatchSearch || currentBatchIndex <= 0) return;
    
    const prevIndex = currentBatchIndex - 1;
    setCurrentBatchIndex(prevIndex);
    
    // Update displayed results from the all results map
    const prevQuery = allQueries[prevIndex];
    if (prevQuery && allResults.has(prevQuery.query)) {
      setResults(allResults.get(prevQuery.query) || []);
      
      // Update duplicates data if available
      const prevResults = allResults.get(prevQuery.query) || [];
      if (prevResults.length > 0 && prevResults[0]?.metadata?.duplicates) {
        setDuplicates(prevResults[0].metadata.duplicates);
      }
    }
  };

  // Calculate total results across all providers
  const totalResults = results.reduce((total, response) => total + response.results.length, 0);
  
  // Calculate total deduplication stats
  const deduplicationStats = results.reduce(
    (stats, response) => {
      const dedup = response.metadata.deduplication;
      if (dedup) {
        stats.enabled = dedup.enabled;
        stats.originalCount += dedup.originalCount;
        stats.uniqueCount += dedup.uniqueCount;
        stats.duplicatesRemoved += dedup.duplicatesRemoved;
      }
      return stats;
    },
    { enabled: false, originalCount: 0, uniqueCount: 0, duplicatesRemoved: 0 } as DeduplicationInfo
  );

  // Add a function to view duplicates
  const viewDuplicates = () => {
    setIsDuplicatesDialogOpen(true);
  };

  return (
    <>
      <Head>
        <title>Search Results | Advanced Search Tool</title>
        <meta name="description" content="View your search results with deduplication" />
      </Head>

      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <div className="flex items-center mb-4 justify-between">
              <div className="flex items-center">
                <Link href="/search-builder" passHref>
                  <Button variant="outline" size="sm">
                    <ArrowLeftIcon className="h-4 w-4 mr-2" />
                    Back to Search Builder
                  </Button>
                </Link>
                
                <h1 className="text-2xl font-bold ml-4">Search Results</h1>
              </div>
              
              {isBatchSearch && allQueries.length > 1 && (
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToPreviousBatchSearch}
                    disabled={currentBatchIndex <= 0}
                  >
                    <ArrowLeftIcon className="h-4 w-4" />
                  </Button>
                  
                  <span className="text-sm font-medium">
                    Search {currentBatchIndex + 1} of {allQueries.length}
                  </span>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToNextBatchSearch}
                    disabled={currentBatchIndex >= allQueries.length - 1}
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
            
            {router.query.q && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex justify-between items-center">
                    <span>Your search query</span>
                    <div className="flex space-x-2">
                      {allQueries.length > 0 && allQueries[currentBatchIndex]?.type ? (
                        <Badge variant={
                          allQueries[currentBatchIndex].type === 'scholar' ? 'secondary' : 
                          allQueries[currentBatchIndex].type === 'domain' ? 'outline' : 
                          'default'
                        } className={
                          allQueries[currentBatchIndex].type === 'scholar' ? 'ml-2 bg-purple-100 text-purple-800' : 
                          allQueries[currentBatchIndex].type === 'domain' ? 'ml-2 bg-blue-100 text-blue-800' : 
                          'ml-2 bg-green-100 text-green-800'
                        }>
                          {allQueries[currentBatchIndex].type === 'scholar' ? 'Google Scholar' : 
                           allQueries[currentBatchIndex].type === 'domain' ? 'Domain-specific' : 
                           'Broad Search'}
                        </Badge>
                      ) : (
                        router.query.query_type && (
                          <Badge variant={
                            router.query.query_type === 'scholar' ? 'secondary' : 
                            router.query.query_type === 'domain' ? 'outline' : 
                            'default'
                          } className={
                            router.query.query_type === 'scholar' ? 'ml-2 bg-purple-100 text-purple-800' : 
                            router.query.query_type === 'domain' ? 'ml-2 bg-blue-100 text-blue-800' : 
                            'ml-2 bg-green-100 text-green-800'
                          }>
                            {router.query.query_type === 'scholar' ? 'Google Scholar' : 
                             router.query.query_type === 'domain' ? 'Domain-specific' : 
                             'Broad Search'}
                          </Badge>
                        )
                      )}
                      {isBatchSearch && allQueries.length > 1 && (
                        <Badge variant="outline" className="ml-2">
                          {allQueries.length} searches running in parallel
                        </Badge>
                      )}
                    </div>
                  </CardTitle>
                  {allQueries.length > 0 && allQueries[currentBatchIndex]?.domain ? (
                    <CardDescription>
                      Domain: {allQueries[currentBatchIndex].domain}
                    </CardDescription>
                  ) : (
                    router.query.domains && (
                      <CardDescription>
                        Domains: {(router.query.domains as string).split(',').join(', ')}
                      </CardDescription>
                    )
                  )}
                </CardHeader>
                <CardContent>
                  <code className="text-sm bg-gray-100 p-2 block rounded">
                    {allQueries.length > 0 && currentBatchIndex < allQueries.length 
                      ? allQueries[currentBatchIndex].query 
                      : router.query.q as string}
                  </code>
                </CardContent>
                {isBatchSearch && allQueries.length > 1 && (
                  <CardFooter className="pt-0 pb-3 text-xs text-gray-500">
                    <div className="w-full">
                      <p className="text-sm text-gray-600 mb-2">All searches in this batch:</p>
                      <div className="space-y-1">
                        {allQueries.map((q, idx) => (
                          <div 
                            key={idx}
                            className={`text-xs p-1 rounded flex justify-between items-center ${
                              idx === currentBatchIndex ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'
                            }`}
                          >
                            <div className="flex-1 truncate mr-2">
                              <span className="font-medium">{idx + 1}. </span>
                              <span className={idx === currentBatchIndex ? 'font-medium' : ''}>
                                {q.type === 'domain' ? `${q.domain}: ` : `${q.type}: `}
                              </span>
                              <code className="text-xs">{q.query.length > 40 ? q.query.substring(0, 40) + '...' : q.query}</code>
                            </div>
                            <div>
                              {idx === currentBatchIndex ? (
                                <Badge variant="secondary">Current</Badge>
                              ) : (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-6 text-xs"
                                  onClick={() => setCurrentBatchIndex(idx)}
                                >
                                  View
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardFooter>
                )}
              </Card>
            )}
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="results">
                <Search className="h-4 w-4 mr-2" />
                Results ({totalResults})
              </TabsTrigger>
              <TabsTrigger value="stats">
                <Server className="h-4 w-4 mr-2" />
                Stats & Deduplication
              </TabsTrigger>
            </TabsList>

            <TabsContent value="results" className="space-y-4 mt-4">
              {loading ? (
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                      <span className="ml-3">Searching...</span>
                    </div>
                  </CardContent>
                </Card>
              ) : error ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Search Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : results.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>No Results</AlertTitle>
                  <AlertDescription>Your search did not return any results. Please try a different query.</AlertDescription>
                </Alert>
              ) : (
                <>
                  {isBatchSearch && (
                    <Alert variant="default" className="bg-blue-50 border-blue-200">
                      <Search className="h-4 w-4 text-blue-600" />
                      <AlertTitle className="text-blue-800">Batch Search</AlertTitle>
                      <AlertDescription className="text-blue-700">
                        This is search {currentBatchIndex + 1} of {batchSize} in your batch.
                        {batchSize > 1 && ' Results across all searches will be combined and deduplicated.'}
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {deduplicationStats.duplicatesRemoved > 0 && (
                    <Alert>
                      <Filter className="h-4 w-4" />
                      <AlertTitle>Deduplication Active</AlertTitle>
                      <AlertDescription>
                        {deduplicationStats.duplicatesRemoved} duplicate results were removed.
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="space-y-4">
                    {results.map((response, providerIndex) => (
                      <div key={providerIndex} className="space-y-4">
                        <div className="flex items-center">
                          <h2 className="text-lg font-medium">
                            {response.metadata.searchEngine} Results
                          </h2>
                          <Badge variant="outline" className="ml-2">
                            {response.results.length} results
                          </Badge>
                        </div>
                        
                        {response.results.length === 0 ? (
                          <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>No Results</AlertTitle>
                            <AlertDescription>
                              No results were found for this provider.
                            </AlertDescription>
                          </Alert>
                        ) : (
                          <div className="space-y-4">
                            {response.results.map((result, index) => (
                              <Card key={index}>
                                <CardHeader className="py-3">
                                  <a 
                                    href={result.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline font-medium flex items-center"
                                  >
                                    {result.title}
                                    <ExternalLink className="h-3 w-3 ml-1" />
                                  </a>
                                  <CardDescription className="text-xs text-green-700">
                                    {result.url}
                                  </CardDescription>
                                </CardHeader>
                                <CardContent className="py-2">
                                  <p className="text-sm">{result.snippet}</p>
                                </CardContent>
                                <CardFooter className="pt-0 pb-3 flex justify-between text-xs text-gray-500">
                                  <div>
                                    {result.resultType && (
                                      <Badge variant="secondary" className="mr-2 text-xs">
                                        {result.resultType}
                                      </Badge>
                                    )}
                                    {result.rank && `Rank: ${result.rank}`}
                                  </div>
                                  <div>
                                    <span className="text-xs">Engine: {result.searchEngine}</span>
                                  </div>
                                </CardFooter>
                              </Card>
                            ))}
                          </div>
                        )}
                        
                        {providerIndex < results.length - 1 && <Separator className="my-6" />}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="stats" className="space-y-4 mt-4">
              {isBatchSearch && (
                <Card>
                  <CardHeader>
                    <CardTitle>Batch Search Information</CardTitle>
                    <CardDescription>
                      Information about the current batch of searches
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <div className="bg-blue-50 p-4 rounded-md">
                        <div className="text-blue-600 font-medium mb-1">Current Search</div>
                        <div className="text-2xl font-bold">{currentBatchIndex + 1}</div>
                      </div>
                      
                      <div className="bg-blue-50 p-4 rounded-md">
                        <div className="text-blue-600 font-medium mb-1">Total Searches</div>
                        <div className="text-2xl font-bold">{batchSize}</div>
                      </div>
                      
                      <div className="bg-blue-50 p-4 rounded-md">
                        <div className="text-blue-600 font-medium mb-1">Progress</div>
                        <div className="text-2xl font-bold">{Math.round(((currentBatchIndex + 1) / batchSize) * 100)}%</div>
                      </div>
                    </div>
                    
                    <Alert className="bg-blue-50">
                      <AlertCircle className="h-4 w-4 text-blue-600" />
                      <AlertTitle className="text-blue-700">PRISMA Tracking Enabled</AlertTitle>
                      <AlertDescription className="text-blue-600">
                        All searches will be logged for PRISMA compliance with metadata and deduplication statistics recorded.
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              )}
              
              <Card>
                <CardHeader>
                  <CardTitle>Deduplication Statistics</CardTitle>
                  <CardDescription>
                    Information about how results were deduplicated
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="bg-green-50 p-4 rounded-md">
                      <div className="text-green-600 font-medium mb-1">Original Results</div>
                      <div className="text-2xl font-bold">{deduplicationStats.originalCount}</div>
                    </div>
                    
                    <div className="bg-blue-50 p-4 rounded-md">
                      <div className="text-blue-600 font-medium mb-1">Unique Results</div>
                      <div className="text-2xl font-bold">{deduplicationStats.uniqueCount}</div>
                    </div>
                    
                    <div className="bg-purple-50 p-4 rounded-md">
                      <div className="text-purple-600 font-medium mb-1">Duplicates Removed</div>
                      <div className="text-2xl font-bold flex items-center">
                        {deduplicationStats.duplicatesRemoved}
                        {deduplicationStats.duplicatesRemoved > 0 && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="ml-2 text-purple-700 hover:text-purple-900 hover:bg-purple-100"
                            onClick={viewDuplicates}
                          >
                            View
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <Alert className={deduplicationStats.enabled ? "bg-green-50" : "bg-yellow-50"}>
                    {deduplicationStats.enabled ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <AlertTitle className="text-green-700">Deduplication Enabled</AlertTitle>
                        <AlertDescription className="text-green-600">
                          Results were deduplicated using URL normalization and fuzzy title matching.
                        </AlertDescription>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4 text-yellow-600" />
                        <AlertTitle className="text-yellow-700">Deduplication Disabled</AlertTitle>
                        <AlertDescription className="text-yellow-600">
                          Results were not deduplicated. You may see duplicate content.
                        </AlertDescription>
                      </>
                    )}
                  </Alert>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Provider Statistics</CardTitle>
                  <CardDescription>
                    Details about search providers and engines used
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {results.map((response, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-md">
                        <div>
                          <div className="font-medium">{response.provider}</div>
                          <div className="text-sm text-gray-500">
                            Engine: {response.metadata.searchEngine}
                            {(response.metadata as any).queryType && (
                              <Badge variant="outline" className="ml-2 text-xs">
                                {(response.metadata as any).queryType}
                              </Badge>
                            )}
                            {router.query.scholar === 'true' && (
                              <Badge variant="outline" className="ml-2 text-xs bg-purple-50 text-purple-700 border-purple-200">
                                Google Scholar
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div>
                            <Badge>{response.results.length} results</Badge>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Credits used: {response.metadata.creditsUsed}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Duplicates Dialog */}
      <Dialog open={isDuplicatesDialogOpen} onOpenChange={setIsDuplicatesDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Duplicate Results ({deduplicationStats.duplicatesRemoved})</DialogTitle>
            <DialogDescription>
              These results were identified as duplicates and removed from the main results list
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 my-4">
            {duplicates.length > 0 ? (
              duplicates.map((item, index) => (
                <div key={index} className="border rounded-md p-4">
                  <h3 className="font-medium mb-2 text-blue-700">Original Result:</h3>
                  <Card className="mb-4 border-green-200">
                    <CardHeader className="py-3 bg-green-50">
                      <a 
                        href={item.original.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline font-medium flex items-center"
                      >
                        {item.original.title}
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                      <CardDescription className="text-xs text-green-700">
                        {item.original.url}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="py-2">
                      <p className="text-sm">{item.original.snippet}</p>
                    </CardContent>
                  </Card>
                  
                  <h3 className="font-medium mb-2 text-red-700 mt-4">Duplicated Results ({item.duplicates.length}):</h3>
                  <div className="space-y-3">
                    {item.duplicates.map((duplicate, dupIndex) => (
                      <Card key={dupIndex} className="border-red-200">
                        <CardHeader className="py-3 bg-red-50">
                          <a 
                            href={duplicate.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline font-medium flex items-center"
                          >
                            {duplicate.title}
                            <ExternalLink className="h-3 w-3 ml-1" />
                          </a>
                          <CardDescription className="text-xs text-red-700">
                            {duplicate.url}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="py-2">
                          <p className="text-sm">{duplicate.snippet}</p>
                        </CardContent>
                        <CardFooter className="pt-0 pb-3 text-xs text-gray-500">
                          <span>Engine: {duplicate.searchEngine}</span>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>No Duplicate Details</AlertTitle>
                <AlertDescription>
                  Detailed information about duplicates is not available for this search.
                </AlertDescription>
              </Alert>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsDuplicatesDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 
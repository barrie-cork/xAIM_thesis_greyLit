import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Button,
  Input,
  Label,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Alert,
  AlertTitle,
  AlertDescription,
  Separator,
  Chip,
  Switch,
  Textarea,
  Badge
} from '@/components/ui';
import { Search, Copy, ExternalLink, Plus, X, List, Settings, Trash2, Info, AlertCircle, Database, PlayCircle } from 'lucide-react';

// Concept group types
type ConceptId = 'population' | 'interest' | 'context';

interface Concept {
  id: ConceptId;
  name: string;
  terms: string[];
}

interface SearchOptions {
  fileTypes: {
    pdf: boolean;
    doc: boolean;
    ppt: boolean;
    html: boolean;
  };
  trustedDomains: string[];
  searchEngines: {
    bing: boolean;
    duckduckgo: boolean;
    serpapi: boolean;
    serper: boolean;
  };
  maxResultsPerEngine: number;
  includeGuidelineTerms: boolean;
  useBroadSearch: boolean;
  useGoogleScholar: boolean;
}

// Clinical guideline terms
const GUIDELINE_TERMS = [
  "guideline*",
  "recommendation*", 
  "consensus",
  "guidance"
];

export default function SearchBuilder() {
  // State for concepts (PIC framework)
  const [concepts, setConcepts] = useState<Concept[]>([
    { id: 'population', name: 'Population', terms: [] },
    { id: 'interest', name: 'Interest', terms: [] },
    { id: 'context', name: 'Context', terms: [] }
  ]);
  
  // Get router instance at the component level
  const router = useRouter();
  
  // State to track if we have previous search results
  const [hasRecentSearch, setHasRecentSearch] = useState<boolean>(false);
  const [recentSearchQuery, setRecentSearchQuery] = useState<string>('');
  
  // State for term input
  const [termInput, setTermInput] = useState<string>('');
  const [activeConceptId, setActiveConceptId] = useState<ConceptId>('population');
  
  // Initialize search options state with localStorage if available
  const [options, setOptions] = useState<SearchOptions>(() => {
    // Check if we're in the browser
    if (typeof window !== 'undefined') {
      const savedOptions = localStorage.getItem('searchBuilderOptions');
      if (savedOptions) {
        try {
          return JSON.parse(savedOptions);
        } catch (e) {
          console.error('Failed to parse saved options:', e);
        }
      }
    }
    
    // Default options
    return {
      fileTypes: {
        pdf: true,
        doc: true,
        ppt: false,
        html: false
      },
      trustedDomains: [],
      searchEngines: {
        bing: false,
        duckduckgo: false,
        serpapi: false,
        serper: true
      },
      maxResultsPerEngine: 50,
      includeGuidelineTerms: false,
      useBroadSearch: false,
      useGoogleScholar: false
    };
  });
  
  // Initialize concepts state with localStorage if available
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedConcepts = localStorage.getItem('searchBuilderConcepts');
      if (savedConcepts) {
        try {
          setConcepts(JSON.parse(savedConcepts));
        } catch (e) {
          console.error('Failed to parse saved concepts:', e);
        }
      }
    }
  }, []);
  
  // Save options to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('searchBuilderOptions', JSON.stringify(options));
    }
  }, [options]);
  
  // Save concepts to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('searchBuilderConcepts', JSON.stringify(concepts));
    }
  }, [concepts]);

  // State for domain input
  const [domainInput, setDomainInput] = useState<string>('');
  
  // Active tab state
  const [activeTab, setActiveTab] = useState('build');

  // Add logic to check for previous search on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const recentSearch = localStorage.getItem('recentSearchQuery');
      if (recentSearch) {
        setHasRecentSearch(true);
        setRecentSearchQuery(recentSearch);
      }
    }
  }, []);

  // Function to generate search queries based on user input
  const generateSearchQuery = (specificDomain?: string, isScholar = false): string => {
    // Create the base query using concepts
    let query = '';
    
    // Filter out empty concepts
    const nonEmptyConcepts = concepts.filter(concept => concept.terms.length > 0);
    
    // Join each concept group with AND
    nonEmptyConcepts.forEach((concept, conceptIndex) => {
      if (conceptIndex > 0 && query.length > 0) {
        query += ' AND ';
      }
      
      // If there are multiple terms in the concept, wrap them in parentheses
      if (concept.terms.length > 1) {
        query += '(';
      }
      
      // Join terms within a concept with OR
      concept.terms.forEach((term, termIndex) => {
        if (termIndex > 0) {
          query += ' OR ';
        }
        query += `"${term}"`;
      });
      
      // Close the parentheses for multiple terms
      if (concept.terms.length > 1) {
        query += ')';
      }
    });
    
    // Add clinical guideline terms if enabled (regardless of which concept)
    if (options.includeGuidelineTerms && nonEmptyConcepts.length > 0) {
      query += ` AND (${GUIDELINE_TERMS.join(' OR ')})`;
    }
    
    // Add file type restrictions
    const activeFileTypes = Object.entries(options.fileTypes)
      .filter(([_, isActive]) => isActive)
      .map(([type]) => type);
      
    if (activeFileTypes.length > 0) {
      if (query.length > 0) query += ' ';
      query += activeFileTypes.map(fileType => `filetype:${fileType}`).join(' OR ');
    }
    
    // Add site restriction for domain-specific searches
    if (specificDomain && !isScholar) {
      if (query.length > 0) query += ' ';
      query += `site:${specificDomain}`;
    }
    
    // Add Google Scholar specific modifications if needed
    if (isScholar) {
      // No site restriction needed, Google Scholar is accessed directly via its URL
      // We could add scholar-specific modifiers here if needed
    }
    
    return query;
  };

  // Generate all search queries based on current options
  const generateAllSearchQueries = (): { query: string; type: 'domain' | 'broad' | 'scholar'; domain?: string }[] => {
    const queries: { query: string; type: 'domain' | 'broad' | 'scholar'; domain?: string }[] = [];
    
    // Add domain-specific queries
    if (options.trustedDomains.length > 0) {
      options.trustedDomains.forEach(domain => {
        const query = generateSearchQuery(domain);
        if (query) {
          queries.push({ query, type: 'domain', domain });
        }
      });
    }
    
    // Add broad search query if enabled
    if (options.useBroadSearch) {
      const query = generateSearchQuery();
      if (query) {
        queries.push({ query, type: 'broad' });
      }
    }
    
    // Add Google Scholar query if enabled
    if (options.useGoogleScholar) {
      const query = generateSearchQuery(undefined, true);
      if (query) {
        queries.push({ query, type: 'scholar' });
      }
    }
    
    return queries;
  };

  // Handle adding a term to a concept
  const handleAddTerm = () => {
    if (termInput && !concepts.find(c => c.id === activeConceptId)?.terms.includes(termInput)) {
      setConcepts(concepts.map(concept => 
        concept.id === activeConceptId 
          ? { ...concept, terms: [...concept.terms, termInput] }
          : concept
      ));
      setTermInput('');
    }
  };

  // Handle removing a term from a concept
  const handleRemoveTerm = (conceptId: ConceptId, term: string) => {
    setConcepts(concepts.map(concept => 
      concept.id === conceptId 
        ? { ...concept, terms: concept.terms.filter(t => t !== term) }
        : concept
    ));
  };

  // Handle adding a trusted domain
  const handleAddDomain = () => {
    if (domainInput && !options.trustedDomains.includes(domainInput)) {
      setOptions({
        ...options,
        trustedDomains: [...options.trustedDomains, domainInput]
      });
      setDomainInput('');
    }
  };

  // Handle removing a trusted domain
  const handleRemoveDomain = (domain: string) => {
    setOptions({
      ...options,
      trustedDomains: options.trustedDomains.filter(d => d !== domain)
    });
  };

  // Handle file type toggle
  const handleFileTypeToggle = (fileType: keyof SearchOptions['fileTypes']) => {
    setOptions({
      ...options,
      fileTypes: {
        ...options.fileTypes,
        [fileType]: !options.fileTypes[fileType]
      }
    });
  };

  // Handle search engine toggle
  const handleSearchEngineToggle = (engine: keyof SearchOptions['searchEngines']) => {
    setOptions({
      ...options,
      searchEngines: {
        ...options.searchEngines,
        [engine]: !options.searchEngines[engine]
      }
    });
  };

  // Handle guideline terms toggle
  const handleGuidelineTermsToggle = () => {
    setOptions({
      ...options,
      includeGuidelineTerms: !options.includeGuidelineTerms
    });
  };

  // Handle max results change
  const handleMaxResultsChange = (value: string) => {
    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue > 0) {
      setOptions({
        ...options,
        maxResultsPerEngine: numValue
      });
    }
  };

  // Handle executing the search for a specific query
  const handleExecuteSearch = (searchInfo: { query: string; type: 'domain' | 'broad' | 'scholar'; domain?: string }) => {
    const { query, type } = searchInfo;
    if (!query) return;
    
    // Get the first active search engine
    let searchEngineUrl = '';
    
    if (type === 'scholar') {
      searchEngineUrl = 'https://scholar.google.com/scholar?q=';
    } else if (options.searchEngines.bing) {
      searchEngineUrl = 'https://www.bing.com/search?q=';
    } else if (options.searchEngines.duckduckgo) {
      searchEngineUrl = 'https://duckduckgo.com/?q=';
    } else {
      // Default to serper for API searches
      searchEngineUrl = 'https://www.google.com/search?q=';
    }
    
    if (searchEngineUrl) {
      window.open(`${searchEngineUrl}${encodeURIComponent(query)}`, '_blank');
    } else {
      alert('Please select a search engine');
    }
  };

  // Handle button click for executing search
  const handleExecuteSearchClick = () => {
    const queries = generateAllSearchQueries();
    if (queries.length > 0) {
      handleExecuteSearch(queries[0]);
    }
  };

  // Handle copying a specific query to clipboard
  const handleCopyQuery = (specificQuery?: string) => {
    const query = specificQuery || generateSearchQuery();
    if (query) {
      navigator.clipboard.writeText(query);
      alert('Search query copied to clipboard!');
    }
  };

  // Handle button click for copying query
  const handleCopyQueryClick = () => {
    handleCopyQuery();
  };

  // Copy all queries to clipboard
  const handleCopyAllQueries = () => {
    const queries = generateAllSearchQueries();
    if (queries.length > 0) {
      navigator.clipboard.writeText(queries.map(q => q.query).join('\n\n'));
      alert('All search queries copied to clipboard!');
    }
  };

  // Get the active concept
  const activeConcept = concepts.find(c => c.id === activeConceptId) || concepts[0];

  // Check if any concept has terms
  const hasAnyTerms = concepts.some(concept => concept.terms.length > 0);

  // Handle navigating to the search results page with our API
  const handleAPISearchClick = () => {
    const queries = generateAllSearchQueries();
    if (queries.length === 0) return;
    
    // Store the search query in localStorage
    localStorage.setItem('recentSearchQuery', queries[0].query);
    
    router.push({
      pathname: '/search-results',
      query: { 
        q: queries[0].query,
        max: options.maxResultsPerEngine,
        dedup: 'true', // Enable deduplication
        scholar: queries[0].type === 'scholar' ? 'true' : 'false',
        // Add query type
        query_type: queries[0].type,
        // Pass domains as a comma-separated string if it's a domain search
        domains: queries[0].type === 'domain' && options.trustedDomains.length > 0 
          ? options.trustedDomains.join(',') 
          : undefined
      }
    });
  };

  // Update the execute all searches function to run multiple searches in parallel
  const handleExecuteAllSearchesClick = () => {
    // Get all search queries
    const queries = generateAllSearchQueries();
    if (queries.length === 0) return;
    
    // Store all search queries in localStorage
    localStorage.setItem('recentSearchQueries', JSON.stringify(queries));
    localStorage.setItem('recentSearchQuery', queries[0].query);
    
    // Prepare data for batch processing
    const batchId = Date.now().toString();
    
    // Redirect to search results with batch info
    router.push({
      pathname: '/search-results',
      query: { 
        batch: 'true',
        batch_id: batchId,
        batch_size: queries.length,
        q: queries[0].query, // Use first query as the primary query
        max: options.maxResultsPerEngine,
        dedup: 'true',
        // Include all queries as a JSON string
        all_queries: JSON.stringify(queries.map(q => ({
          query: q.query,
          type: q.type,
          domain: q.domain
        }))),
        // Pass domains as a comma-separated string
        domains: options.trustedDomains.length > 0 
          ? options.trustedDomains.join(',') 
          : undefined
      }
    });
  };

  // Add a new function to view recent search results
  const handleViewRecentResults = () => {
    router.push({
      pathname: '/search-results',
      query: { 
        q: recentSearchQuery,
        max: options.maxResultsPerEngine,
        dedup: 'true'
      }
    });
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Advanced Search Builder</h1>
        {hasRecentSearch && (
          <Button 
            variant="outline" 
            onClick={handleViewRecentResults}
            className="flex items-center"
          >
            <Search className="h-4 w-4 mr-2" />
            View Latest Results
          </Button>
        )}
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="build">
            <List className="h-4 w-4 mr-2" />
            Build Strategy
          </TabsTrigger>
          <TabsTrigger value="preview">
            <Search className="h-4 w-4 mr-2" />
            Preview
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="build" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Concept Keywords</CardTitle>
              <CardDescription>
                Build your search with keywords organized by concept
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs value={activeConceptId} onValueChange={(value) => setActiveConceptId(value as ConceptId)}>
                <TabsList className="grid w-full grid-cols-3">
                  {concepts.map(concept => (
                    <TabsTrigger key={concept.id} value={concept.id}>
                      {concept.name}
                      {concept.terms.length > 0 && (
                        <Badge variant="secondary" className="ml-2">{concept.terms.length}</Badge>
                      )}
                    </TabsTrigger>
                  ))}
                </TabsList>
                
                {concepts.map(concept => (
                  <TabsContent key={concept.id} value={concept.id} className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor={`term-input-${concept.id}`} className="text-sm font-medium">
                        Add {concept.name} Terms
                      </Label>
                      <div className="flex space-x-2">
                        <Input
                          id={`term-input-${concept.id}`}
                          placeholder={`Enter a ${concept.name.toLowerCase()} term...`}
                          value={concept.id === activeConceptId ? termInput : ''}
                          onChange={(e) => setTermInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && concept.id === activeConceptId) {
                              handleAddTerm();
                            }
                          }}
                        />
                        <Button type="button" onClick={handleAddTerm}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add
                        </Button>
                      </div>
                    </div>
                    
                    {concept.terms.length > 0 ? (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {concept.terms.map((term) => (
                          <Chip 
                            key={term} 
                            className={`px-3 py-1 ${
                              concept.id === 'population' ? 'bg-blue-100 text-blue-800' :
                              concept.id === 'interest' ? 'bg-green-100 text-green-800' :
                              'bg-purple-100 text-purple-800'
                            }`}
                          >
                            {term}
                            <button
                              type="button"
                              className={`ml-2 ${
                                concept.id === 'population' ? 'text-blue-600 hover:text-blue-800' :
                                concept.id === 'interest' ? 'text-green-600 hover:text-green-800' :
                                'text-purple-600 hover:text-purple-800'
                              }`}
                              onClick={() => handleRemoveTerm(concept.id, term)}
                            >
                              <X size={14} />
                              <span className="sr-only">Remove {term}</span>
                            </button>
                          </Chip>
                        ))}
                      </div>
                    ) : (
                      <Alert variant="warning">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>No {concept.name} terms added</AlertTitle>
                        <AlertDescription>
                          Add {concept.name.toLowerCase()} terms to build your search query.
                        </AlertDescription>
                      </Alert>
                    )}
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Search Enhancement</CardTitle>
              <CardDescription>
                Additional terms and modifiers to improve search results
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center space-x-2">
                <Switch
                  id="guideline-terms"
                  checked={options.includeGuidelineTerms}
                  onCheckedChange={handleGuidelineTermsToggle}
                />
                <Label htmlFor="guideline-terms">Include Clinical Guideline Terms</Label>
              </div>
              <p className="text-sm text-gray-500">
                Add standard clinical guideline terms to all concepts: (guideline* OR recommendation* OR consensus OR guidance)
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Search Options</CardTitle>
              <CardDescription>
                Configure additional search parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <h3 className="text-sm font-medium">File Types</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="pdf-filter"
                      checked={options.fileTypes.pdf}
                      onCheckedChange={() => handleFileTypeToggle('pdf')}
                    />
                    <Label htmlFor="pdf-filter">PDF Documents</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="doc-filter"
                      checked={options.fileTypes.doc}
                      onCheckedChange={() => handleFileTypeToggle('doc')}
                    />
                    <Label htmlFor="doc-filter">Word Documents</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="ppt-filter"
                      checked={options.fileTypes.ppt}
                      onCheckedChange={() => handleFileTypeToggle('ppt')}
                    />
                    <Label htmlFor="ppt-filter">Presentations</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="html-filter"
                      checked={options.fileTypes.html}
                      onCheckedChange={() => handleFileTypeToggle('html')}
                    />
                    <Label htmlFor="html-filter">Web Pages</Label>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Trusted Domains & Search Types</h3>
                <div className="flex space-x-2">
                  <Input
                    placeholder="e.g., www.who.int"
                    value={domainInput}
                    onChange={(e) => setDomainInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleAddDomain();
                      }
                    }}
                  />
                  <Button type="button" onClick={handleAddDomain}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                  </Button>
                </div>
                
                {options.trustedDomains.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {options.trustedDomains.map((domain) => (
                      <Chip key={domain} className="px-3 py-1 bg-gray-100">
                        {domain}
                        <button
                          type="button"
                          className="ml-2 text-gray-600 hover:text-gray-800"
                          onClick={() => handleRemoveDomain(domain)}
                        >
                          <X size={14} />
                          <span className="sr-only">Remove {domain}</span>
                        </button>
                      </Chip>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    Add trusted domains to limit your search to specific websites.
                  </p>
                )}
                
                <div className="space-y-2 mt-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="broad-search"
                      checked={options.useBroadSearch}
                      onCheckedChange={(checked) => setOptions({
                        ...options,
                        useBroadSearch: checked
                      })}
                    />
                    <Label htmlFor="broad-search">
                      Include broad search (without domain restrictions)
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="google-scholar"
                      checked={options.useGoogleScholar}
                      onCheckedChange={(checked) => setOptions({
                        ...options,
                        useGoogleScholar: checked
                      })}
                    />
                    <Label htmlFor="google-scholar">
                      Include Google Scholar search
                    </Label>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Search Engines</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="bing-engine"
                      checked={options.searchEngines.bing}
                      onCheckedChange={() => handleSearchEngineToggle('bing')}
                    />
                    <Label htmlFor="bing-engine">Bing</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="duckduckgo-engine"
                      checked={options.searchEngines.duckduckgo}
                      onCheckedChange={() => handleSearchEngineToggle('duckduckgo')}
                    />
                    <Label htmlFor="duckduckgo-engine">DuckDuckGo</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="serpapi-engine"
                      checked={options.searchEngines.serpapi}
                      onCheckedChange={() => handleSearchEngineToggle('serpapi')}
                    />
                    <Label htmlFor="serpapi-engine">SerpAPI</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="serper-engine"
                      checked={options.searchEngines.serper}
                      onCheckedChange={() => handleSearchEngineToggle('serper')}
                    />
                    <Label htmlFor="serper-engine">Serper</Label>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Max Results Per Engine</h3>
                <Input
                  type="number"
                  value={options.maxResultsPerEngine}
                  onChange={(e) => handleMaxResultsChange(e.target.value)}
                  min="1"
                  max="100"
                  className="max-w-xs"
                />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Execute Searches</CardTitle>
              <CardDescription>
                Run your search strategy across all trusted domains
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Execute your search {options.trustedDomains.length > 1 ? 
                  `across all ${options.trustedDomains.length} trusted domains` : 
                  'query'} using our API with deduplication enabled.
              </p>
              
              {!hasAnyTerms && (
                <Alert variant="warning" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>No search terms added</AlertTitle>
                  <AlertDescription>
                    Add search terms to at least one concept before executing searches.
                  </AlertDescription>
                </Alert>
              )}
              
              {options.trustedDomains.length === 0 && (
                <Alert variant="warning" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>No trusted domains</AlertTitle>
                  <AlertDescription>
                    Consider adding trusted domains to narrow your search scope.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full" 
                onClick={handleExecuteAllSearchesClick}
                disabled={!hasAnyTerms}
                size="lg"
                variant="default"
              >
                <PlayCircle className="h-5 w-5 mr-2" />
                Execute All Searches
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="preview" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Search Query Preview</CardTitle>
              <CardDescription>
                Review your generated search {options.trustedDomains.length > 1 ? 'queries' : 'query'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {options.trustedDomains.length <= 1 ? (
                // Single query (no domain or just one domain)
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-md">
                    <code className="text-sm whitespace-pre-wrap break-all">
                      {generateSearchQuery() || 'No query generated yet. Add concepts and terms to get started.'}
                    </code>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button 
                      onClick={handleCopyQueryClick}
                      disabled={!hasAnyTerms}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Query
                    </Button>
                    
                    <Button 
                      variant="default" 
                      onClick={handleExecuteSearchClick}
                      disabled={!hasAnyTerms}
                    >
                      <Search className="h-4 w-4 mr-2" />
                      Execute Search
                    </Button>
                  </div>
                </div>
              ) : (
                // Multiple queries (one per domain)
                <div className="space-y-6">
                  <div className="flex justify-end">
                    <Button 
                      onClick={handleCopyAllQueries}
                      disabled={!hasAnyTerms}
                      variant="outline"
                      size="sm"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy All Queries
                    </Button>
                  </div>
                  
                  {generateAllSearchQueries().map(({ query, type, domain }, index) => {
                    return (
                      <div key={query} className="space-y-2">
                        <h3 className="text-sm font-medium">Query for {type === 'domain' ? domain : type === 'broad' ? 'all domains' : 'Google Scholar'}</h3>
                        <div className="bg-gray-50 p-4 rounded-md">
                          <code className="text-sm whitespace-pre-wrap break-all">
                            {query}
                          </code>
                        </div>
                        
                        <div className="flex space-x-2">
                          <Button 
                            onClick={() => handleExecuteSearch({ query, type })}
                            size="sm"
                          >
                            <Search className="h-4 w-4 mr-2" />
                            Execute
                          </Button>
                        </div>
                        
                        {index < generateAllSearchQueries().length - 1 && <Separator className="my-4" />}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Search Strategy Preview</CardTitle>
              <CardDescription>
                This is how your search will be processed
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {concepts.map(concept => (
                <div key={concept.id} className="space-y-2">
                  <h3 className="text-sm font-medium">{concept.name}</h3>
                  <div className="flex flex-wrap gap-1">
                    {concept.terms.length > 0 ? (
                      concept.terms.map((term) => (
                        <Badge 
                          key={term} 
                          variant="outline" 
                          className={`mr-1 ${
                            concept.id === 'population' ? 'border-blue-300' :
                            concept.id === 'interest' ? 'border-green-300' :
                            'border-purple-300'
                          }`}
                        >
                          {term}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">No {concept.name.toLowerCase()} terms specified</p>
                    )}
                    
                    {concept.id === 'context' && options.includeGuidelineTerms && (
                      <>
                        {concept.terms.length > 0 && <span className="text-sm text-gray-500">+</span>}
                        <Badge variant="outline" className="mr-1 border-purple-300">Clinical Guidelines</Badge>
                      </>
                    )}
                  </div>
                  
                  {concept.id !== 'context' && <Separator />}
                </div>
              ))}
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium">File Types</h3>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(options.fileTypes)
                    .filter(([_, isActive]) => isActive)
                    .map(([type]) => (
                      <Badge key={type} variant="secondary" className="mr-1">
                        {type.toUpperCase()}
                      </Badge>
                    ))}
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Search Types</h3>
                <div className="flex flex-wrap gap-1">
                  {options.trustedDomains.length > 0 && (
                    <Badge variant="outline" className="mr-1 bg-blue-50 border-blue-300">
                      Domain-specific Searches ({options.trustedDomains.length})
                    </Badge>
                  )}
                  {options.useBroadSearch && (
                    <Badge variant="outline" className="mr-1 bg-green-50 border-green-300">
                      Broad Search (no domain restriction)
                    </Badge>
                  )}
                  {options.useGoogleScholar && (
                    <Badge variant="outline" className="mr-1 bg-purple-50 border-purple-300">
                      Google Scholar
                    </Badge>
                  )}
                  {!options.useBroadSearch && !options.useGoogleScholar && options.trustedDomains.length === 0 && (
                    <p className="text-sm text-gray-500">No search types selected</p>
                  )}
                </div>
                
                {generateAllSearchQueries().length > 1 && (
                  <p className="text-sm text-gray-600 mt-2">
                    <AlertCircle className="h-4 w-4 inline mr-1" />
                    Multiple search queries will be generated ({generateAllSearchQueries().length} total).
                  </p>
                )}
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Search Engines</h3>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(options.searchEngines)
                    .filter(([_, isActive]) => isActive)
                    .map(([engine]) => (
                      <Badge key={engine}>
                        {engine.charAt(0).toUpperCase() + engine.slice(1)}
                      </Badge>
                    ))}
                </div>
              </div>
              
              <div className="mt-2">
                <p className="text-sm text-gray-600">
                  Max results per engine: <strong>{options.maxResultsPerEngine}</strong>
                </p>
              </div>
            </CardContent>
            <CardFooter>
              {options.trustedDomains.length <= 1 ? (
                <div className="w-full space-y-2">
                  <div className="flex space-x-2">
                    <Button 
                      className="flex-1" 
                      onClick={handleExecuteSearchClick}
                      disabled={!hasAnyTerms}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Search in Browser
                    </Button>
                    
                    <Button 
                      className="flex-1" 
                      onClick={handleAPISearchClick}
                      disabled={!hasAnyTerms}
                      variant="default"
                    >
                      <Database className="h-4 w-4 mr-2" />
                      Execute API Search
                    </Button>
                  </div>
                </div>
              ) : (
                <Button 
                  className="w-full" 
                  onClick={handleExecuteAllSearchesClick}
                  disabled={!hasAnyTerms}
                  variant="default"
                >
                  <Database className="h-4 w-4 mr-2" />
                  Execute All Searches
                </Button>
              )}
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 
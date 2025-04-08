import React, { useState } from 'react';
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
import { Search, Copy, ExternalLink, Plus, X, List, Settings, Trash2, Info, AlertCircle } from 'lucide-react';

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
    google: boolean;
    bing: boolean;
    duckduckgo: boolean;
    serpapi: boolean;
    serper: boolean;
  };
  maxResultsPerEngine: number;
  includeGuidelineTerms: boolean;
}

// Clinical guideline terms
const GUIDELINE_TERMS = [
  "guideline",
  "recommendation",
  "consensus",
  "guidance",
  "standard of care",
  "practice guideline",
  "clinical protocol"
];

export default function SearchBuilder() {
  // State for concepts (PIC framework)
  const [concepts, setConcepts] = useState<Concept[]>([
    { id: 'population', name: 'Population', terms: [] },
    { id: 'interest', name: 'Interest', terms: [] },
    { id: 'context', name: 'Context', terms: [] }
  ]);
  
  // State for term input
  const [termInput, setTermInput] = useState<string>('');
  const [activeConceptId, setActiveConceptId] = useState<ConceptId>('population');
  
  // State for search options
  const [options, setOptions] = useState<SearchOptions>({
    fileTypes: {
      pdf: true,
      doc: true,
      ppt: false,
      html: false
    },
    trustedDomains: [],
    searchEngines: {
      google: true,
      bing: false,
      duckduckgo: false,
      serpapi: false,
      serper: false
    },
    maxResultsPerEngine: 50,
    includeGuidelineTerms: false
  });

  // State for domain input
  const [domainInput, setDomainInput] = useState<string>('');
  
  // Active tab state
  const [activeTab, setActiveTab] = useState('build');

  // Function to generate search queries based on user input
  const generateSearchQuery = (specificDomain?: string): string => {
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
      
      // Add clinical guideline terms if enabled and this is the context concept
      if (options.includeGuidelineTerms && concept.id === 'context') {
        if (concept.terms.length > 0) {
          query += ' OR ';
        }
        query += GUIDELINE_TERMS.map(term => `"${term}"`).join(' OR ');
      }
      
      // Close the parentheses for multiple terms
      if (concept.terms.length > 1) {
        query += ')';
      }
    });
    
    // Add file type restrictions
    const activeFileTypes = Object.entries(options.fileTypes)
      .filter(([_, isActive]) => isActive)
      .map(([type]) => type);
      
    if (activeFileTypes.length > 0) {
      if (query.length > 0) query += ' ';
      query += activeFileTypes.map(fileType => `filetype:${fileType}`).join(' OR ');
    }
    
    // Add trusted domain - only add the specified domain or none if not specified
    if (specificDomain) {
      if (query.length > 0) query += ' ';
      query += `site:${specificDomain}`;
    } else if (options.trustedDomains.length === 1) {
      if (query.length > 0) query += ' ';
      query += `site:${options.trustedDomains[0]}`;
    }
    
    return query;
  };

  // Generate all search queries (one per domain, or just one if no domains)
  const generateAllSearchQueries = (): string[] => {
    if (options.trustedDomains.length <= 1) {
      const query = generateSearchQuery();
      return query ? [query] : [];
    } else {
      return options.trustedDomains.map(domain => generateSearchQuery(domain));
    }
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
  const handleExecuteSearch = (specificQuery?: string) => {
    const query = specificQuery || generateSearchQuery();
    if (!query) return;
    
    // Get the first active search engine
    let searchEngineUrl = '';
    if (options.searchEngines.google) {
      searchEngineUrl = 'https://www.google.com/search?q=';
    } else if (options.searchEngines.bing) {
      searchEngineUrl = 'https://www.bing.com/search?q=';
    } else if (options.searchEngines.duckduckgo) {
      searchEngineUrl = 'https://duckduckgo.com/?q=';
    }
    
    if (searchEngineUrl) {
      window.open(`${searchEngineUrl}${encodeURIComponent(query)}`, '_blank');
    } else {
      alert('Please select a search engine');
    }
  };

  // Handle button click for executing search
  const handleExecuteSearchClick = () => {
    handleExecuteSearch();
  };

  // Handle button click for executing a specific search
  const handleExecuteSpecificSearchClick = (specificQuery: string) => () => {
    handleExecuteSearch(specificQuery);
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

  // Handle button click for copying a specific query
  const handleCopySpecificQueryClick = (specificQuery: string) => () => {
    handleCopyQuery(specificQuery);
  };

  // Copy all queries to clipboard
  const handleCopyAllQueries = () => {
    const queries = generateAllSearchQueries();
    if (queries.length > 0) {
      navigator.clipboard.writeText(queries.join('\n\n'));
      alert('All search queries copied to clipboard!');
    }
  };

  // Get the active concept
  const activeConcept = concepts.find(c => c.id === activeConceptId) || concepts[0];

  // Check if any concept has terms
  const hasAnyTerms = concepts.some(concept => concept.terms.length > 0);

  return (
    <div className="container mx-auto py-6">
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
                    
                    {concept.id === 'context' && (
                      <div className="flex items-center space-x-2 mt-4">
                        <Switch
                          id="guideline-terms"
                          checked={options.includeGuidelineTerms}
                          onCheckedChange={handleGuidelineTermsToggle}
                        />
                        <Label htmlFor="guideline-terms">Include Clinical Guideline Terms</Label>
                      </div>
                    )}
                  </TabsContent>
                ))}
              </Tabs>
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
                <h3 className="text-sm font-medium">Trusted Domains</h3>
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
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Search Engines</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="google-engine"
                      checked={options.searchEngines.google}
                      onCheckedChange={() => handleSearchEngineToggle('google')}
                    />
                    <Label htmlFor="google-engine">Google</Label>
                  </div>
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
                  
                  {options.trustedDomains.map((domain, index) => {
                    const domainQuery = generateSearchQuery(domain);
                    return (
                      <div key={domain} className="space-y-2">
                        <h3 className="text-sm font-medium">Query for {domain}</h3>
                        <div className="bg-gray-50 p-4 rounded-md">
                          <code className="text-sm whitespace-pre-wrap break-all">
                            {domainQuery}
                          </code>
                        </div>
                        
                        <div className="flex space-x-2">
                          <Button 
                            onClick={handleCopySpecificQueryClick(domainQuery)}
                            size="sm"
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Copy
                          </Button>
                          
                          <Button 
                            variant="default" 
                            onClick={handleExecuteSpecificSearchClick(domainQuery)}
                            size="sm"
                          >
                            <Search className="h-4 w-4 mr-2" />
                            Execute
                          </Button>
                        </div>
                        
                        {index < options.trustedDomains.length - 1 && <Separator className="my-4" />}
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
                <h3 className="text-sm font-medium">Trusted Domains</h3>
                <div className="flex flex-wrap gap-1">
                  {options.trustedDomains.length > 0 ? (
                    options.trustedDomains.map((domain) => (
                      <Badge key={domain} variant="outline" className="mr-1">
                        {domain}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">No domains specified</p>
                  )}
                </div>
                
                {options.trustedDomains.length > 1 && (
                  <p className="text-sm text-gray-600 mt-2">
                    <AlertCircle className="h-4 w-4 inline mr-1" />
                    A separate search query will be generated for each domain.
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
                <Button 
                  className="w-full" 
                  onClick={handleExecuteSearchClick}
                  disabled={!hasAnyTerms}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Launch Search
                </Button>
              ) : (
                <div className="w-full space-y-2">
                  <p className="text-sm text-gray-600 text-center">
                    Multiple search queries available (one per domain).
                  </p>
                  <Button 
                    className="w-full" 
                    onClick={() => {
                      const previewTab = document.querySelector('[data-value="preview"]');
                      if (previewTab) {
                        const previewRect = previewTab.getBoundingClientRect();
                        window.scrollTo({
                          top: window.scrollY + previewRect.top - 100,
                          behavior: 'smooth'
                        });
                      }
                    }}
                    disabled={!hasAnyTerms}
                  >
                    <Search className="h-4 w-4 mr-2" />
                    View Queries
                  </Button>
                </div>
              )}
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 
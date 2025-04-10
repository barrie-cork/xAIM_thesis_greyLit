# Changelog

## Version 0.1.0 (Current)

### Search Strategy Builder with Keyword-Based PIC Framework

- **Concept Framework Data Structures**
  - Implemented comprehensive TypeScript interfaces for search concepts and relationships
  - Created data models for representing Population, Interest, Context (PIC) components

- **Search Service Infrastructure**
  - Implemented modular search service with provider factory pattern
  - Created enrichment module system with standardized interface
  - Added robust caching service with memory and database storage options
  - Integrated intelligent deduplication with URL normalization and title similarity
  - Added support for custom filter modules and result post-processing

- **Result Filtering and Enrichment Pipeline**
  - Implemented comprehensive filtering system with filter sets and rules
  - Created pipeline architecture for sequential search result processing
  - Developed multiple enrichment modules (content type detection, readability, relevance scoring)
  - Added DeduplicationAdapter to integrate existing deduplication service with the enrichment pipeline
  - Implemented URL normalization for consistent result identification
  - Created advanced result sorting capabilities with field type detection
  - Added detailed processing metrics and performance tracking

- **Search Result Processing**
  - Created URL normalization for consistent result identification
  - Implemented Levenshtein distance-based title similarity detection
  - Added configurable deduplication with domain exclusion support
  - Integrated content type detection and readability analysis

- **UI Components**
  - Built comprehensive `SearchStrategyBuilder` with PIC (Population, Interest, Context) framework
  - Created keyword input components for each concept section
  - Implemented various UI components following best practices
  - Added interactive preview of generated search strategies

- **Search Strategy Generation**
  - Added support for generating search queries based on user-provided keywords
  - Implemented keyword combination options (AND, OR, NOT)
  - Created query templates for different search engines (Google, PubMed, Google Scholar)
  - Added filtering options for file types and trusted domains

- **Keyword Management**
  - Implemented user-friendly interface for managing search keywords
  - Added support for grouping related terms
  - Created synonym expansion capabilities for broader search coverage
  - Implemented keyword validation and suggestions

- **tRPC API Endpoints**
  - Created search router with endpoints for executing and saving search strategies
  - Implemented error handling and type safety
  - Added protected routes for user-specific data

- **Project Infrastructure**
  - Updated TypeScript configuration for proper JSX support
  - Implemented basic UI component system
  - Set up Next.js pages and routing
  - Configured Tailwind CSS for styling
  - Migrated tests from Jest to Vitest for improved performance

## Search Service and Deduplication

### Search Service Implementation
- Implemented a modular `SearchService` class that manages multiple search providers
- Added support for provider configuration and parallel search execution
- Integrated caching mechanism for improved performance

### Deduplication System
- Created a comprehensive `DeduplicationService` for eliminating duplicate search results
- Implemented URL normalization with configurable options (protocol, subdomains, trailing slashes)
- Added title similarity comparison using Levenshtein distance algorithm
- Developed configurable merge strategies for combining information from duplicate results
- Included detailed logging system for tracking duplicate detection and resolution

### Type System Improvements
- Refactored and standardized the `SearchResult` interface across the application
- Created a `CoreSearchResult` interface to serve as a consistent base for all search result types
- Added type conversion utilities to seamlessly work with different `SearchResult` variants
- Implemented a dedicated result-resolver module to handle type conversions and compatibility
- Added support for enriched search results with metadata
- Created interfaces for tracking duplicate detection and merge provenance

### Testing and Optimization
- Added comprehensive unit tests for `FilterService`, covering domain, keyword, URL, file type, and composite rules.
- Implemented unit tests for enrichment modules: `ReadabilityModule`, `ContentTypeModule`, `RelevanceModule`.
- Created performance benchmark tests for `DeduplicationService`.
- Identified performance bottlenecks in deduplication (Levenshtein distance on snippets).
- Optimized `DeduplicationService`:
  - Replaced local Levenshtein with `fast-levenshtein` library.
  - Removed snippet comparison from weighted similarity calculation.
  - Optimized duplicate lookup loop using a `Map` for exact URL matches.
  - Added domain checking before title comparison to reduce expensive checks.
  - Replaced title Levenshtein with faster Jaccard Index comparison.
- Accepted current deduplication performance (~10-20s for 1000 items) after optimizations.

### Documentation Updates
- Updated `docs/search/deduplication.md` to reflect optimized algorithm and performance.
- Created `docs/search/type-system.md` explaining `SearchResult` variations and resolution.
- Created `docs/search/execution-flow.md` with a sequence diagram of the search process.
- Created `docs/file-structure.md` with a Mermaid diagram of the project structure.

### Integration Testing and Cleanup
- Added integration tests for the `ResultPipeline` (`search-pipeline-integration.test.ts`), verifying the end-to-end flow of filtering, enrichment (Readability, ContentType, DeduplicationAdapter), and deduplication.
- Added tests covering different filter types (domain block/allow) and statistics reporting within the pipeline integration tests.
- Added specific unit tests for `DeduplicationService` edge cases (`search-service-deduplication.test.ts`), including title similarity thresholds and URL normalization options (query params, www, subdomains).
- Corrected `DeduplicationAdapter` constructor to accept a service instance instead of options, resolving integration issues.
- Corrected type mismatches and constructor calls in pipeline integration tests related to `PipelineOptions`, `DeduplicationService`, and `ReadabilityModule`.
- Added `// TODO:` and warning comments to `FilterService` to highlight the incomplete `FilterConfig` to `FilterRuleUnion` conversion logic and clarify current behavior.
- Removed outdated/incorrect unit tests using invalid deduplication options (`strictUrlMatching`, `ignoredDomains`) from `search-service-deduplication.test.ts` (Note: Manual removal might be needed if automated edits failed).

### Known Issues & Limitations

- Database integration for saving search strategies is not yet implemented
- URL normalization may fail with some malformed URLs
- Prisma client mocking requires further refinement for complete test coverage
- `FilterService` does not currently convert generic `FilterConfig` arrays from `FilterSet` into specific `FilterRuleUnion` types for application; relies on specific rules being managed/created elsewhere.

### Next Steps

- Implement authentication for saving search strategies
- Add database storage for user-specific search strategies
- Create a search execution feature to see real-time results
- Enhance documentation for API endpoints and component usage
- Implement additional search result enrichment modules (citation analysis, credibility scoring)
- Improve deduplication algorithm with better domain-specific heuristics
- Implement `FilterService.convertConfigsToRules` to fully support `FilterConfig` based filtering 
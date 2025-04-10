# Search Result Deduplication

The search functionality includes a sophisticated deduplication system that eliminates duplicate search results using both URL normalization and fuzzy title matching. This document explains how to use and configure the deduplication feature.

## How It Works

The deduplication system works in several steps:

1.  **URL Normalization**: URLs are normalized to remove common variations that don't affect content identity (protocol, www, trailing slashes, tracking parameters, etc.). See configuration options for details.
2.  **Exact URL Matching**: Normalized URLs are checked against previously seen unique results using an efficient `Map` lookup.
3.  **Domain Check (for Title Matching)**: If no exact URL match is found and title matching is enabled, the system checks if the domains of the potential duplicate results are considered the same (respecting `ignoreWww` and `treatSubdomainsAsSame` options).
4.  **Fuzzy Title Matching**: Only if the domains are considered the same, titles are compared using a Jaccard Index algorithm (comparing sets of words) to detect near-duplicate titles.
5.  **URL Similarity Score**: For results that don't have identical normalized URLs but pass the title similarity check, a URL similarity score is calculated using an optimized Levenshtein distance algorithm (`fast-levenshtein`).
6.  **Weighted Similarity Scoring**: A final similarity score is calculated based on a weighted combination of the title (Jaccard) and URL (Levenshtein) similarity scores.
    - **Default Weights:** URL (70%), Title (30%)
    - _Note: Snippet similarity is **not** used in the default calculation due to performance considerations._
7.  **Threshold Application**: If the combined similarity score exceeds the configured `threshold`, the result is marked as a duplicate.

This multi-step process prioritizes fast exact URL matching and domain checks before performing more computationally intensive title similarity comparisons.

## Performance Considerations

- The current implementation achieves significantly better performance than earlier versions by optimizing lookups and removing snippet comparisons.
- Processing 1000 results typically takes between **10-20 seconds** on standard hardware, depending on the duplicate ratio.
- While much faster, this may still be too slow for real-time, user-facing requests.
- Consider running deduplication asynchronously, processing smaller batches, or accepting the current latency if sub-second performance for large batches is required.
- The primary remaining bottleneck is the pairwise title comparison (Jaccard Index) performed when domains match.

## Default Behavior

By default, deduplication is enabled with these settings:

- Similarity threshold: 0.8 (based on 70% URL similarity / 30% Title Jaccard index)
- URL normalization is enabled with protocol, www, trailing slashes, and query parameters ignored
- Title-based matching (Jaccard Index) is enabled (only for matching domains)
- Snippet comparison is **disabled** for performance.
- Duplicates are logged for analysis
- Result merging is disabled by default

## Configuration Options

### Global Configuration

You can configure deduplication globally when initializing the `SearchService`:

```typescript
import { SearchService, SearchProviderType } from '@/lib/search';

const searchService = new SearchService({
  providers: {
    // Provider configurations...
  },
  defaultProvider: SearchProviderType.SERPER,
  deduplication: {
    titleSimilarityThreshold: 0.85, // Similarity threshold (0-1)
    strictUrlMatching: false, // Whether to only use URL matching
    ignoredDomains: ['trusted-source.com'] // Skip deduplication for these domains
  }
});
```

### Advanced Configuration

For more precise control, you can use the full set of options available in the DeduplicationService:

```typescript
import { DeduplicationService, DEFAULT_DEDUPLICATION_OPTIONS } from '@/lib/search';

const deduplicationService = new DeduplicationService({
  threshold: 0.75, // More aggressive deduplication
  enableUrlNormalization: true,
  enableTitleMatching: true,
  logDuplicates: true,
  treatSubdomainsAsSame: true, // Treat subdomains of the same domain as identical
  ignoreProtocol: true,
  ignoreWww: true,
  ignoreTrailingSlash: true,
  ignoreQueryParams: true,
  ignoreCaseInPath: true,
  mergeStrategy: 'comprehensive', // Use comprehensive merge strategy
  enableMerging: true // Enable result merging
});
```

### Per-Request Configuration

You can configure deduplication on a per-request basis:

```typescript
// Disable deduplication for this search
const resultsWithDuplicates = await searchService.search({
  query: 'example search',
  deduplication: false
});

// Custom deduplication settings for this search
const resultsWithCustomDeduplication = await searchService.search({
  query: 'example search',
  deduplication: {
    titleSimilarityThreshold: 0.7, // More lenient matching (70%)
    strictUrlMatching: false,
    ignoredDomains: ['academic-papers.org']
  }
});
```

## Merge Strategies

The deduplication system supports merging duplicate results using configurable strategies:

```typescript
// Available merge strategies
const DEFAULT_MERGE_STRATEGIES = {
  conservative: {
    name: "conservative",
    priority: [
      { field: "title", sourcePreference: ["Google Scholar", "Google", "Bing"] },
      { field: "snippet", sourcePreference: ["Google", "Google Scholar", "Bing"] },
      { field: "url", sourcePreference: ["Google Scholar", "Google", "Bing"] }
    ]
  },
  comprehensive: {
    name: "comprehensive",
    priority: [
      { field: "title", sourcePreference: ["Google Scholar", "Google", "Bing"] },
      { field: "snippet", sourcePreference: ["Google", "Google Scholar", "Bing"] }
    ],
    combineFields: ["snippet"] // Combine snippets from multiple sources
  }
};

// Enable merging with a specific strategy
const resultsWithMerging = await searchService.search({
  query: 'example search',
  deduplication: {
    mergeStrategy: 'comprehensive',
    enableMerging: true
  }
});
```

## Deduplication Metadata

Each search response includes metadata about the deduplication process:

```typescript
const searchResults = await searchService.search({ query: 'example search' });

// Example deduplication metadata
console.log(searchResults[0].metadata.deduplication);
// Output:
// {
//   enabled: true,
//   originalCount: 25,
//   uniqueCount: 18,
//   duplicatesRemoved: 7
// }
```

## Database Logging

The system supports logging duplicate information to the database via the `DuplicateLog` model:

```typescript
// Prisma schema for duplicate logging
model DuplicateLog {
  duplicateId      String        @id @default(uuid()) @map("duplicate_id") @db.Uuid
  originalResultId String?       @map("original_result_id") @db.Uuid
  duplicateUrl     String?       @map("duplicate_url")
  searchEngine     String?       @map("search_engine")
  reason           String?
  similarityScore  Float?        @map("similarity_score")
  matchDetails     Json?         @map("match_details")
  mergeStrategy    String?       @map("merge_strategy")
  timestamp        DateTime      @default(now())
  originalResult   SearchResult? @relation("OriginalResult", fields: [originalResultId], references: [id])

  @@map("duplicate_log")
}
```

You can query this table to analyze duplication patterns and refine your deduplication strategy.

## Advanced Usage: Direct Access to Deduplication Service

For advanced use cases, you can access the DeduplicationService directly:

```typescript
import { DeduplicationService } from '@/lib/search';

// Create a deduplication service with custom options
const deduplicationService = new DeduplicationService({
  threshold: 0.8,
  enableUrlNormalization: true,
  enableTitleMatching: true,
  // Other options...
});

// Deduplicate an array of search results
const { results, duplicatesRemoved, duplicateGroups, logs } = deduplicationService.deduplicate(mySearchResults, {
  mergeStrategy: 'comprehensive',
  shouldMerge: true
});

// Examine which results were considered duplicates
console.log(`Removed ${duplicatesRemoved} duplicates`);
console.log(duplicateGroups.map(group => ({
  kept: group.original.title,
  duplicates: group.duplicates.map(d => d.title)
})));

// Get detailed logs about duplicates
const duplicateLogs = deduplicationService.getLogs();
```

## Custom Merge Strategies

You can define and add custom merge strategies:

```typescript
import { DeduplicationService, MergeStrategy } from '@/lib/search';

// Define a custom merge strategy
const customStrategy: MergeStrategy = {
  name: "my-custom-strategy",
  priority: [
    { field: "title", sourcePreference: ["Custom Source", "Google", "Bing"] },
    { field: "snippet", sourcePreference: ["Google", "Custom Source", "Bing"] }
  ],
  combineFields: ["snippet"] // Combine snippets from multiple sources
};

// Create a deduplication service with the custom strategy
const deduplicationService = new DeduplicationService(
  { threshold: 0.8 },
  { 'my-custom-strategy': customStrategy }
);

// Or add a strategy to an existing service
deduplicationService.setMergeStrategy("another-strategy", anotherStrategy);
```

## Best Practices

- Use a threshold of 0.7-0.85, considering the 70/30 URL/Title(Jaccard) weighting.
- Enable `treatSubdomainsAsSame` if you want results from different subdomains of the same site to be considered duplicates
- Use `strictUrlMatching: true` for sensitive searches where false positives are a concern
- Add domains to `ignoredDomains` for official sources that should always be shown separately
- For academic or research applications, consider disabling deduplication (`deduplication: false`) or using a higher threshold
- Consider enabling result merging with an appropriate strategy for comprehensive results
- Monitor the `DuplicateLog` table to refine your deduplication strategy over time.

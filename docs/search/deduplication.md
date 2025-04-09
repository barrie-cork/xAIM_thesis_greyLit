# Search Result Deduplication

The search functionality now includes a powerful deduplication system that helps eliminate duplicate search results using both URL normalization and fuzzy title matching. This document explains how to use and configure the deduplication feature.

## How It Works

The deduplication system works in two main ways:

1. **URL Normalization**: URLs are normalized to remove common variations that don't affect content identity, such as:
   - Removing the protocol (http://, https://)
   - Removing "www." prefixes
   - Removing tracking parameters (utm_source, fbclid, etc.)
   - Standardizing path capitalization and trailing slashes
   - Sorting query parameters for consistent comparison

2. **Fuzzy Title Matching**: When URLs don't match exactly, titles are compared using a Levenshtein distance algorithm to detect near-duplicate titles. This helps catch cases where:
   - The same content exists at different URLs
   - Minor title variations exist for the same content
   - Titles differ only in capitalization, punctuation, or minor text differences

## Default Behavior

By default, deduplication is enabled with these settings:

- Title similarity threshold: 0.85 (85% similarity is considered a duplicate)
- URL-based matching is always performed
- Title-based matching is enabled
- No domains are excluded from deduplication

## Configuration Options

### Global Configuration

You can configure deduplication globally when initializing the `SearchService`:

```typescript
import { SearchService, SearchProviderType } from '@/lib/search';

const searchService = new SearchService({
  providers: {
    // Provider configuration...
  },
  defaultProvider: SearchProviderType.SERPER,
  deduplication: {
    titleSimilarityThreshold: 0.9, // More strict title matching (90%)
    strictUrlMatching: true, // Only use URL matching, disable title matching
    ignoredDomains: ['trusted-source.com'] // Don't deduplicate results from these domains
  }
});
```

### Per-Request Configuration

You can also configure deduplication on a per-request basis:

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
    ignoredDomains: ['academic-papers.org']
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

This makes it easy to track how many duplicates were found and removed from the results.

## Advanced Usage: Direct Access to Deduplication Functions

For advanced use cases, you can access the deduplication utilities directly:

```typescript
import { normalizeUrl, calculateSimilarity, deduplicateResults } from '@/lib/search/utils';

// Normalize a URL
const normalized = normalizeUrl('https://www.example.com/page?utm_source=google');
// Returns: "example.com/page"

// Calculate similarity between two strings (0-1 range)
const similarity = calculateSimilarity('Almost identical', 'Almost identical!');
// Returns a value close to 1.0

// Manually deduplicate an array of search results
const { uniqueResults, duplicateGroups } = deduplicateResults(mySearchResults, {
  titleSimilarityThreshold: 0.8
});

// Examine which results were considered duplicates
console.log(duplicateGroups.map(group => ({
  kept: group.kept.title,
  removed: group.removed.map(r => r.result.title)
})));
```

## Best Practices

- Use a threshold of 0.85-0.9 for most applications
- Lower the threshold (0.7-0.8) when you want more aggressive deduplication
- Use `strictUrlMatching: true` for sensitive searches where false positives are a concern
- Add domains to `ignoredDomains` for official sources that should always be shown separately
- For academic or research applications, consider keeping duplicates (`deduplication: false`) 
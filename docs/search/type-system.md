# SearchResult Type System

This document explains the different variations of the `SearchResult` type used throughout the application and how the type system is managed to ensure consistency and enable conversion between formats.

## The Challenge: Multiple `SearchResult` Definitions

During development, different modules required slightly different information or naming conventions for search results, leading to multiple distinct `SearchResult` interface definitions:

1.  **API Layer (`src/lib/search/types.ts`)**: Defines `SearchResult` as returned by the main `SearchService` and the `/api/search` endpoint. Includes fields like `rank`, `searchEngine`, `timestamp`, etc.
2.  **Deduplication Service (`src/lib/search/deduplication.ts`)**: Defines its own `SearchResult` internally, using fields like `position` (instead of `rank`) and `provider` (instead of `searchEngine`).
3.  **Filtering/Enrichment (`src/lib/search/filtering/types.ts`)**: Often uses the API Layer's `BaseSearchResult` (which is the `SearchResult` from `src/lib/search/types.ts`) but adds enrichment data within the `metadata` field.
4.  **Frontend (`src/pages/search-results.tsx`)**: Sometimes defines a local interface for component props, potentially simplifying or extending the API version.

This divergence created type conflicts and required manual mapping between layers.

## The Solution: Core Type and Resolver Utilities

To address this, a common type system was introduced:

1.  **`CoreSearchResult` (`src/lib/search/common-types.ts`)**: Defines the absolute essential fields common to *all* search result representations:
    ```typescript
    export interface CoreSearchResult {
      title: string;
      url: string;
      snippet: string;
      metadata?: Record<string, any>;
    }
    ```

2.  **Interface Extension**: The main `SearchResult` interfaces in `types.ts` and `deduplication.ts` were refactored to `extend CoreSearchResult`, reducing redundancy:
    ```typescript
    // In src/lib/search/types.ts
    export interface SearchResult extends CoreSearchResult {
      rank?: number;
      searchEngine: string;
      // ... other API-specific fields
    }

    // In src/lib/search/deduplication.ts
    export interface SearchResult extends CoreSearchResult {
      position: number;
      provider: string;
      // ... other deduplication-specific fields
    }
    ```

3.  **`SearchResultTypeMap` (`src/lib/search/common-types.ts`)**: A constant object defining the mapping between field names in different `SearchResult` variants:
    ```typescript
    export const SearchResultTypeMap = {
      deduplicationToAPI: {
        position: 'rank',
        provider: 'searchEngine'
      },
      apiToDeduplication: {
        rank: 'position',
        searchEngine: 'provider'
      }
    };
    ```

4.  **`convertSearchResult` (`src/lib/search/common-types.ts`)**: A generic utility function that converts a result object from one format to another using a provided mapping.

5.  **`result-resolver.ts` (`src/lib/search/result-resolver.ts`)**: Provides specific helper functions built on top of `convertSearchResult` for common conversions:
    *   `toDeduplicationResult(result: ApiSearchResult, position?: number): DeduplicationSearchResult`: Converts an API result to the format needed by `DeduplicationService`.
    *   `toApiResult(result: DeduplicationSearchResult): ApiSearchResult`: Converts a `DeduplicationService` result back to the API format.
    *   `ensureCoreProperties`: Utility to guarantee a partial result object has the core fields.
    *   `validateSearchResults`: Utility to process an array, ensuring core properties.

## Usage Example

Modules that need to interact with different `SearchResult` types now use the resolver utilities:

```typescript
// Example in src/pages/api/search.ts (simplified)
import { SearchResult as ApiSearchResult } from '@/lib/search/types';
import { DeduplicationService, SearchResult as DeduplicationSearchResult } from '@/lib/search/deduplication';
import { toDeduplicationResult } from '@/lib/search/result-resolver';

// ... fetch raw results (ApiSearchResult[]) ...
const allRawResults: ApiSearchResult[] = fetchResults();

// Convert to DeduplicationService format using the resolver
const formattedResults: DeduplicationSearchResult[] = allRawResults.map((result, index) => 
  toDeduplicationResult(result, index)
);

// Pass to DeduplicationService
deduplicationService.deduplicate(formattedResults);
```

This approach provides:
- **Consistency**: A core definition of essential fields.
- **Clarity**: Explicit mapping between different formats.
- **Maintainability**: Centralized conversion logic in `common-types.ts` and `result-resolver.ts`.
- **Type Safety**: Leverages TypeScript generics for safer conversions. 
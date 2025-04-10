# Search Module Overview

This document provides a high-level overview of the search module, its core components, and the typical execution flow. It serves as a starting point for understanding how search functionality is implemented and acts as a handover guide. For more detailed information on specific aspects, please refer to the linked documents.

## Purpose

The search module is responsible for:
- Interfacing with external search engine APIs (e.g., Serper, SerpAPI).
- Processing search queries and retrieving results.
- Caching search results to improve performance and reduce costs.
- Deduplicating results from various sources to ensure uniqueness.
- Filtering and potentially enriching results based on defined rules.
- Providing a standardized API for other parts of the application to consume search results.

## Core Service: `SearchService`

The central component of the module is the `SearchService` (`src/lib/search/search-service.ts`). It acts as the main orchestrator and is responsible for:
- Managing available search providers (`SearchProvider`).
- Handling incoming search requests (`SearchRequest`).
- Coordinating the execution flow, including caching, provider calls, deduplication, and potentially filtering/enrichment steps.
- Formatting results into a standardized `SearchResponse`.

## Key Components

-   **`SearchProviderFactory` / `SearchProvider` (`src/lib/search/factory.ts`, `src/lib/search/provider.ts`):** Handles the creation and management of different search engine API providers. Each `SearchProvider` implements a common interface for executing searches against a specific external API.
-   **`CacheService` (`src/lib/search/cache-service.ts`):** Manages caching of search results. It generates a unique fingerprint for each request and uses a Prisma client to store/retrieve results from the database, reducing redundant API calls.
-   **`DeduplicationService` (`src/lib/search/deduplication.ts`):** Implements sophisticated logic to identify and remove duplicate search results. It uses URL normalization and fuzzy title matching. See [Deduplication Details](deduplication.md) for configuration and mechanics.
-   **`FilterService` (`src/lib/search/filtering/filter-service.ts`):** Applies filtering rules (`FilterSet`, `FilterRule`) to include or exclude results based on criteria like domain, keywords, etc. See [Filtering Details](filtering.md). *(Note: There are known implementation limitations regarding `FilterConfig` conversion mentioned in the filtering docs).*
-   **`ResultPipeline` (Assumed Component):** While not explicitly detailed here, a pipeline mechanism likely orchestrates post-search processing steps like filtering and enrichment, using services like `FilterService`.
-   **Type System & Resolver (`src/lib/search/common-types.ts`, `src/lib/search/result-resolver.ts`):** Manages the different variations of the `SearchResult` type used across different components (API, Deduplication, Filtering). Provides utilities (`convertSearchResult`, `toDeduplicationResult`, etc.) to convert between formats safely. See [Type System Details](type-system.md).

## High-Level Workflow

The typical flow for a search request is as follows:

1.  **Request:** A client (e.g., the frontend) sends a request to the relevant API endpoint (e.g., `/api/search`).
2.  **Initialization:** The API route handler instantiates the `SearchService` with appropriate configuration.
3.  **Cache Check:** `SearchService` calls `CacheService.get()` to check for cached results matching the request fingerprint.
4.  **Cache Hit:** If results are found in the cache, they are returned directly.
5.  **Cache Miss:**
    *   `SearchService` selects the appropriate `SearchProvider`(s) (via `SearchProviderFactory`).
    *   `SearchService` calls the `search` method on the selected provider(s).
    *   The `SearchProvider` interacts with the external search engine API.
    *   `SearchService` formats the raw provider response into a standardized `SearchResponse`.
    *   If enabled, `DeduplicationService.deduplicate()` is called to remove duplicates (using `result-resolver.ts` for type conversion if needed).
    *   The processed results are asynchronously stored in the cache via `CacheService.set()`.
    *   (Potentially) Results might be passed through a `ResultPipeline` involving the `FilterService` for further refinement.
6.  **Response:** The final, processed `SearchResponse` array is returned to the API route and then to the client.

For a visual representation, see the [Execution Flow Diagram](execution-flow.md).

## Configuration

The `SearchService` is initialized with a `SearchServiceConfig` object, which allows specifying:
- API keys and settings for different `providers`.
- The `defaultProvider` to use if none is specified in the request.
- Default `deduplication` options (can be overridden per request).
- Default `cache` options (e.g., TTL).

## Integration Points

-   **Database (Prisma):** The `CacheService` relies on a Prisma client to interact with the database for storing and retrieving cached search results. The `DeduplicationService` may also log duplicate information to a `DuplicateLog` table.
-   **API Layer:** The search functionality is typically exposed via API routes (e.g., in `src/pages/api/`) which utilize the `SearchService`.

## Further Reading

-   [Usage Examples](usage-examples.md)
-   [Deduplication Details](deduplication.md)
-   [Filtering Details](filtering.md)
-   [Type System Details](type-system.md)
-   [Execution Flow Diagram](execution-flow.md) 
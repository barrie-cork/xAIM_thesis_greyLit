# Search Execution Flow

This diagram illustrates the typical sequence of operations when a search request is processed by the system.

```mermaid
sequenceDiagram
    participant Client
    participant API Route (/api/search.ts)
    participant SearchService
    participant CacheService
    participant Provider (e.g., Serper)
    participant DeduplicationService
    participant TypeResolver (result-resolver.ts)

    Client->>+API Route: POST /api/search (query, options)
    API Route->>+SearchService: Instantiate SearchService
    API Route->>SearchService: search(request)
    SearchService->>+CacheService: get(request)
    alt Cache Hit
        CacheService-->>-SearchService: Cached SearchResponse[]
        SearchService-->>API Route: SearchResponse[] (from cache)
    else Cache Miss
        CacheService-->>-SearchService: null
        SearchService->>+Provider: search(params)
        Provider->>Provider: External API Call
        Provider-->>-SearchService: ProviderResponse
        SearchService->>SearchService: formatResponse(ProviderResponse)
        opt Deduplication Enabled
            SearchService->>+TypeResolver: toDeduplicationResult(results)
            TypeResolver-->>-SearchService: DeduplicationSearchResult[]
            SearchService->>+DeduplicationService: deduplicate(formattedResults)
            DeduplicationService-->>-SearchService: Deduplicated Results
            SearchService->>SearchService: Adapt results back (using original map)
        end
        SearchService->>+CacheService: set(request, results) // Async
        CacheService-->>-SearchService: (Cache Set Ack)
        SearchService-->>-API Route: SearchResponse[] (processed)
    end
    API Route->>API Route: Add batch/duplicate metadata (if requested)
    API Route-->>-Client: JSON Response (SearchResponse[])

```

**Key Steps:**

1.  **Request:** The client sends a POST request to the `/api/search` endpoint.
2.  **Service Instantiation:** The API route handler initializes the `SearchService`.
3.  **Cache Check:** `SearchService` checks the `CacheService` for existing results matching the request fingerprint.
4.  **Cache Hit:** If found, cached results are returned immediately.
5.  **Cache Miss:**
    *   The relevant Search Provider (e.g., Serper) is called.
    *   The provider makes an external API call.
    *   The provider's response is parsed and formatted into the standard `SearchResult` format by `SearchService`.
    *   If deduplication is enabled:
        *   Results are converted to the `DeduplicationService` format using `result-resolver.ts`.
        *   `DeduplicationService` removes duplicates based on normalized URLs and title similarity (Jaccard Index).
        *   The unique results are returned.
    *   The final results are asynchronously stored in the cache by `CacheService`.
6.  **Response Augmentation:** The API route handler may add additional metadata (like batch info or full duplicate lists) to the response.
7.  **Response:** The final JSON response containing the processed search results is sent back to the client. 
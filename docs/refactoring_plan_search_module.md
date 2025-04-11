# Refactoring Plan: Simplify Search Module Workflow

**1. Goal:**

*   Restructure the existing search functionality to improve modularity, reduce complexity, and enhance maintainability.
*   Revert to the original conceptual separation between **SERP Execution** (fetching/basic parsing) and **Results Processing** (deduplication/storage).
*   Unify the `SearchResult` type across the backend module.
*   Prioritize implementation feasibility and clarity over maximizing processing speed.

**2. Context & Starting Point:**

*   The current implementation centers around a monolithic `SearchService` (`src/lib/search/search-service.ts`) which handles API calls, result parsing, deduplication, caching, and potentially filtering.
*   This has led to multiple `SearchResult` definitions and the need for a type conversion utility (`src/lib/search/result-resolver.ts`).
*   A `FilterService` exists but has known implementation limitations and may represent scope creep.
*   Core logic for API interaction, deduplication algorithms, caching, etc., already exists within the current structure (Task 6 and subtasks are marked 'done'). **The goal is to reuse this logic, not rewrite it from scratch.**

**3. Target Architecture:**

*   **`SerpExecutorService`:** Responsible *only* for interacting with external Search Providers, fetching results, and normalizing them into a single, canonical `SearchResult` format.
*   **`ResultsProcessorService`:** Responsible *only* for receiving canonical `SearchResult`s, performing deduplication, handling storage, managing caching (if kept), and minimal enrichment.
*   **Unified `SearchResult` Type:** A single interface defined in `src/lib/search/types.ts` used by all backend components.
*   **API Layer Orchestration:** API routes (e.g., `/api/search`) will coordinate the sequential calls to `SerpExecutorService` and then `ResultsProcessorService`.
*   **Removed Components:** `result-resolver.ts`, `FilterService`, the old `SearchService`.

**4. Prerequisites:**

*   **Create a New Branch:** Create a dedicated Git branch for this refactoring effort (e.g., `refactor/search-module-workflow`).
*   **Review Existing Code:** Familiarize yourself with the current `SearchService`, `DeduplicationService`, `CacheService`, `result-resolver.ts`, `FilterService`, and the different `SearchResult` definitions (`src/lib/search/types.ts`, `src/lib/search/deduplication.ts`).
*   **Review Documentation:** Re-read `project_docs/2_serp_execution.md` and `project_docs/3_results_manager.md` to reinforce the target separation of concerns.

**5. Refactoring Steps:**

**(Step 5.1) Define Canonical `SearchResult` Type:**

*   **Action:** Modify/Consolidate the interface in `src/lib/search/types.ts`. Ensure it includes all fields needed for:
    *   Storage in the database (refer to `project_docs/search_system.sql`).
    *   Input to `DeduplicationService` (e.g., `title`, `url`, `snippet`, `rank`/`position` - decide on one canonical name like `rank`).
    *   Basic display/API response (fields from `2_serp_execution.md` like `searchEngine`, `timestamp`, `rawResponse` etc.).
*   **Goal:** Create a single source of truth for the search result structure.

**(Step 5.2) Adapt `DeduplicationService`:**

*   **Action:** Modify `src/lib/search/deduplication.ts`:
    *   Change its internal `SearchResult` definition (if separate) to match or directly use the canonical type from `types.ts`.
    *   Update its `deduplicate` method signature to accept an array of the canonical `SearchResult` type.
    *   Adjust internal logic (e.g., field access for `title`, `url`, `rank`) to use the canonical field names.
    *   Ensure its output (unique results, duplicate groups) also refers to the canonical type.
*   **Goal:** Make `DeduplicationService` work directly with the unified type, removing the need for pre-conversion.

**(Step 5.3) Create `SerpExecutorService`:**

*   **Action:** Create a new file (e.g., `src/lib/search/serp-executor.service.ts`).
    *   Define the `SerpExecutorService` class.
    *   Identify and **move** the logic from the *current* `SearchService` responsible for:
        *   Instantiating/selecting `SearchProvider`s (using `SearchProviderFactory` or directly if simplifying).
        *   Making API calls via the `SearchProvider.search` method.
        *   Handling provider-specific responses.
        *   **Basic Parsing/Normalization:** Mapping the raw provider response fields directly to the **canonical `SearchResult` type** defined in Step 5.1. Include metadata directly available from the API.
        *   Handling pagination logic.
        *   Rate limiting (if implemented within `SearchService`).
    *   Define a primary method like `execute(request: SearchRequest): Promise<CanonicalSearchResult[]>`.
    *   Inject necessary dependencies (e.g., `SearchProviderFactory` or specific `SearchProvider` instances, configuration).
*   **Goal:** Isolate external API interaction and basic result formatting.

**(Step 5.4) Create `ResultsProcessorService`:**

*   **Action:** Create a new file (e.g., `src/lib/search/results-processor.service.ts`).
    *   Define the `ResultsProcessorService` class.
    *   Identify and **move** the logic from the *current* `SearchService` responsible for:
        *   Calling `DeduplicationService.deduplicate()` (it now takes the canonical type directly).
        *   Handling the output of deduplication.
        *   **Simplified Enrichment:** Add application-specific metadata (e.g., associating results with a `search_request_id`). Avoid complex external lookups initially.
        *   Interacting with `CacheService` (if caching is kept). *Decision Point: Decide if caching should happen before or after deduplication/storage in this new flow.*
        *   Persisting the final results to the database using Prisma client.
        *   Logging PRISMA metrics/duplicates.
    *   Define a primary method like `process(results: CanonicalSearchResult[], searchRequestContext: any): Promise<ProcessingResult>`. (`ProcessingResult` could include stats, saved IDs, etc.).
    *   Inject necessary dependencies (e.g., `PrismaClient`, `DeduplicationService`, `CacheService` if kept).
*   **Goal:** Isolate post-fetch processing: deduplication, storage, caching.

**(Step 5.5) Update API Layer Orchestration:**

*   **Action:** Modify the relevant API route handler(s) (e.g., `src/pages/api/search.ts`).
    *   Remove instantiation and usage of the old `SearchService`.
    *   Instantiate `SerpExecutorService`.
    *   Call `serpExecutorService.execute()` with the request parameters.
    *   Instantiate `ResultsProcessorService`.
    *   Call `resultsProcessorService.process()` with the results from the executor.
    *   Format the final response based on the output of the processor.
*   **Goal:** Implement the new sequential workflow coordination.

**(Step 5.6) Cleanup:**

*   **Action:** Once the new services are functional and integrated:
    *   Delete the old `SearchService` file (`src/lib/search/search-service.ts`).
    *   Delete the `result-resolver.ts` file (`src/lib/search/result-resolver.ts`).
    *   Delete `FilterService` (`src/lib/search/filtering/filter-service.ts`) and its related types/tests (unless a conscious decision is made to keep *and fix* it later, separate from this refactor).
    *   Remove any unused imports related to the deleted files.
*   **Goal:** Remove obsolete code and prevent confusion.

**6. Testing Strategy:**

*   **Unit Tests:** Write unit tests for the new `SerpExecutorService` and `ResultsProcessorService`. Mock their dependencies (Providers, Prisma, DeduplicationService, etc.). Verify they handle inputs and outputs correctly, especially the canonical `SearchResult` type.
*   **Integration Tests:** Update/create integration tests for the API endpoint(s). These tests should verify the end-to-end sequential flow: request -> execution -> processing -> response.
*   **Existing Tests:** Adapt existing unit tests for `DeduplicationService` to reflect its direct use of the canonical type. Review tests for the old `SearchService` - some logic tests might be adaptable for the new services.
*   **Test Continuously:** Run tests frequently throughout the refactoring process, not just at the end.

**7. Handoff Notes for Engineer:**

*   **Primary Goal:** Decouple search execution from results processing as per the original design docs (`2_serp_execution.md`, `3_results_manager.md`). The current `SearchService` merges these, causing complexity.
*   **Key Task:** Unify the `SearchResult` type (Step 5.1) and eliminate `result-resolver.ts` (Step 5.6). This is crucial for simplifying interactions.
*   **Reuse Logic:** Do not rewrite algorithms (deduplication, API interaction) from scratch. Extract and move the *existing logic* from `SearchService` into the new `SerpExecutorService` and `ResultsProcessorService`.
*   **Remove FilterService:** Defer complex filtering. Remove `FilterService` (Step 5.6) unless explicitly decided otherwise. Basic filtering, if essential *now*, should be simple logic within `ResultsProcessorService`.
*   **Sequential Flow:** The API layer must orchestrate the calls sequentially: Executor -> Processor.
*   **Focus:** Modularity, clarity, and maintainability over premature optimization or complex features. 
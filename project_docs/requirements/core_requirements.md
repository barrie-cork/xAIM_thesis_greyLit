# Core Requirements for Grey Literature Search App

## Functional Requirements

### FR-AUTH: Authentication & User Management
- REQ-FR-AUTH-1: The system shall allow users to register with email and password
- REQ-FR-AUTH-2: The system shall allow users to log in with email and password
- REQ-FR-AUTH-3: The system shall track user login history
- REQ-FR-AUTH-4: The system shall associate searches and results with specific users

### FR-SEARCH: Search Strategy Building
- REQ-FR-SEARCH-1: The system shall allow users to define concept groups (Population, Interest, Context)

- REQ-FR-SEARCH-3: The system shall allow users to select/deselect generated keywords
- REQ-FR-SEARCH-4: The system shall allow users to add custom terms
- REQ-FR-SEARCH-5: The system shall allow users to specify trusted domains to include in queries
- REQ-FR-SEARCH-6: The system shall allow users to select one or more SERP APIs
- REQ-FR-SEARCH-7: The system shall allow users to set maximum results per API
- REQ-FR-SEARCH-8: The system shall provide optional file type filtering (PDF, DOC, DOCX)
- REQ-FR-SEARCH-9: The system shall provide a toggle for including clinical guideline terms
- REQ-FR-SEARCH-10: The system shall generate search strings by combining concepts with AND logic
- REQ-FR-SEARCH-11: The system shall allow users to review and approve generated search strings
- REQ-FR-SEARCH-12: The system shall allow users to save search strategies for reuse

### FR-SERP: SERP Execution
- REQ-FR-SERP-1: The system shall execute search queries using selected SERP APIs
- REQ-FR-SERP-2: The system shall support pagination to retrieve maximum results
- REQ-FR-SERP-3: The system shall parse and normalize search results
- REQ-FR-SERP-4: The system shall enrich results with search metadata
- REQ-FR-SERP-5: The system shall assign unique identifiers to each result
- REQ-FR-SERP-6: The system shall store raw API responses for future reference

### FR-RESULTS: Results Management
- REQ-FR-RESULTS-1: The system shall deduplicate results using normalized URL matching
- REQ-FR-RESULTS-2: The system shall optionally deduplicate results using title similarity matching
- REQ-FR-RESULTS-3: The system shall track duplicate removal for PRISMA reporting
- REQ-FR-RESULTS-4: The system shall store deduplicated results in a structured database
- REQ-FR-RESULTS-5: The system shall maintain search context and metadata for each result

### FR-REVIEW: Review Workflow
- REQ-FR-REVIEW-1: The system shall display results in a paginated table view
- REQ-FR-REVIEW-2: The system shall allow users to tag results as Include, Exclude, or Maybe
- REQ-FR-REVIEW-3: The system shall prompt users for exclusion reasons when tagging as Exclude
- REQ-FR-REVIEW-4: The system shall allow users to attach notes to any result
- REQ-FR-REVIEW-5: The system shall track when users click result links for PRISMA reporting
- REQ-FR-REVIEW-6: The system shall provide filtering and sorting options for results
- REQ-FR-REVIEW-7: The system shall display real-time progress tracking of review status
- REQ-FR-REVIEW-8: The system shall auto-save all user actions during review

### FR-EXPORT: Reporting & Data Export
- REQ-FR-EXPORT-1: The system shall calculate PRISMA 2020-compliant metrics
- REQ-FR-EXPORT-2: The system shall generate reports in Markdown format
- REQ-FR-EXPORT-3: The system shall generate reports in HTML format
- REQ-FR-EXPORT-4: The system shall generate reports in CSV format
- REQ-FR-EXPORT-5: The system shall include search details in reports
- REQ-FR-EXPORT-6: The system shall include PRISMA metrics in reports
- REQ-FR-EXPORT-7: The system shall include lists of included, excluded, and maybe results in reports
- REQ-FR-EXPORT-8: The system shall include exclusion reasons and user notes in reports

## Additional Requirements

### REQ-SEC: Security
- REQ-SEC-1: The system shall securely hash user passwords
- REQ-SEC-2: The system shall secure API keys via environment variables
- REQ-SEC-3: The system shall implement row-level security for user data

### REQ-PERF: Performance
- REQ-PERF-1: The system shall support efficient pagination of search results
- REQ-PERF-2: The system shall index key database fields for fast querying

### REQ-DATA: Data Management
- REQ-DATA-1: The system shall use PostgreSQL via Supabase for data storage
- REQ-DATA-2: The system shall use UUIDs for all primary keys
- REQ-DATA-3: The system shall normalize URLs for consistent storage and comparison
- REQ-DATA-4: The system shall store raw API responses in JSONB format

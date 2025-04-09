# Changelog

## Version 0.1.0 (Current)

### Search Strategy Builder with MeSH Integration

- **MeSH Term Data Structures**
  - Implemented comprehensive TypeScript interfaces for MeSH descriptors, concepts, terms, and relationships
  - Created data models for representing the hierarchical structure of MeSH terms

- **MeSH Dataset Processing**
  - Added a mesh-downloader script to fetch and process MeSH RDF data from the NLM
  - Implemented parsing and optimization for efficient MeSH term lookup
  - Created data indexing for fast search and hierarchical traversal

- **MeSH Service Layer**
  - Implemented service functions for loading MeSH data with caching
  - Added search functionality with support for exact and partial matches
  - Created term expansion capabilities for related terms, synonyms, broader, and narrower concepts
  - Enabled MeSH statistics reporting

- **tRPC API Endpoints**
  - Created mesh router with endpoints for searching, retrieving, and expanding MeSH terms
  - Implemented error handling and type safety
  - Added protected routes for saving user term selections

- **UI Components**
  - Created `MeshTermPicker` component for searching and selecting MeSH terms
  - Built comprehensive `SearchStrategyBuilder` with PIC (Population, Interest, Context) framework
  - Implemented various UI components following best practices

- **Search Strategy Generation**
  - Added support for generating search queries based on selected MeSH terms
  - Implemented options for search engines (Google, PubMed, Google Scholar)
  - Added filtering options for file types and trusted domains

- **Project Infrastructure**
  - Updated TypeScript configuration for proper JSX support
  - Implemented basic UI component system
  - Set up Next.js pages and routing
  - Configured Tailwind CSS for styling

### Known Issues & Limitations

- Requires local MeSH data processing before use
- Database integration for saving search strategies is not yet implemented
- MeSH term expansion is computationally intensive and may be slow for large datasets

### Next Steps

- Implement authentication for saving search strategies
- Add database storage for user-specific search strategies
- Create a search execution feature to see real-time results
- Improve performance of MeSH term expansion
- Enhance documentation for API endpoints and component usage 
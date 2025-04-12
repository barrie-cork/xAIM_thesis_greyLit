# Changelog

## Version 0.1.0 (Current)

### Search Strategy Builder with User-Defined Keywords

- **Keyword Management**
  - Implemented functionality for users to add and organize their own keywords
  - Created concept-based organization (Population, Interest, Context)
  - Built intuitive interface for keyword management

- **Search Query Generation**
  - Implemented Boolean logic for combining keywords (AND between concepts, OR within concepts)
  - Added support for clinical guideline terms
  - Created file type filtering options

- **tRPC API Endpoints**
  - Created search router with endpoints for creating and managing search queries
  - Implemented error handling and type safety
  - Added protected routes for saving user search strategies

- **UI Components**
  - Created `KeywordInput` component for adding and managing keywords
  - Built comprehensive `SearchStrategyBuilder` with PIC (Population, Interest, Context) framework
  - Implemented various UI components following best practices

- **Search Strategy Generation**
  - Added support for generating search queries based on user-defined keywords
  - Implemented options for search engines (Google, Bing, DuckDuckGo)
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
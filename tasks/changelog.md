# Changelog

## Version 0.2.0 (Current)

### Authentication and Security Fixes (2025-04-13)

#### Authentication Fixes
- Added "use client" directive to client-side components (LoginForm, RegisterForm, Input, Label, Button)
- Fixed SMTP configuration in Supabase for email delivery
- Enabled auto-confirm for email verification to improve development experience
- Updated the LoginForm to redirect to home page instead of non-existent dashboard
- Improved error handling in login and registration forms
- Updated the verify-email page with clearer instructions

#### Security Improvements
- Enabled Row Level Security (RLS) for all public tables:
  - public.users
  - public.search_results
  - public.search_requests
  - public.duplicate_log
  - public.review_tags
- Created RLS policies to ensure users can only access their own data
- Increased minimum password length from 8 to 10 characters

#### Database Synchronization
- Created database triggers to automatically sync users between auth.users and public.users
- Added trigger for new user creation (on_auth_user_created)
- Added trigger for user updates (on_auth_user_updated)
- Manually synced existing users to ensure data consistency

## Version 0.1.0

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

- Database integration for saving search strategies is not yet implemented
- MeSH term expansion is computationally intensive and may be slow for large datasets

### Next Steps

- Add database storage for user-specific search strategies
- Create a search execution feature to see real-time results
- Improve performance of MeSH term expansion
- Enhance documentation for API endpoints and component usage

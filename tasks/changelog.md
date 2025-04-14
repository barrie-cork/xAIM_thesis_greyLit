# Changelog

## Version 0.3.0 (Current)

### Next.js 15 Migration Issues (2025-04-15)

#### Identified Issues
- Next.js 15.2.4 has made several previously synchronous APIs asynchronous
- The cookies() API now requires async/await pattern
- Supabase authentication shows warnings about potentially insecure user objects
- Batch search functionality fails with serialization errors when using tRPC
- Import conflicts between different search service implementations

#### Implemented Solutions
- Created a detailed migration guide in docs/next-15-migration-issues.md
- Updated the Supabase server utility to handle async cookie operations
- Made all functions that use cookies async functions
- Updated the middleware and tRPC context to use getUser() instead of relying solely on getSession()
- Created a REST API endpoint for batch searches to avoid tRPC serialization issues
- Updated the SearchBuilder component to use the REST API directly
- Fixed search service import conflicts
- Added proper validation for search providers in the batch search API
- Created a debug-logger utility to help identify serialization issues

#### Completed Tasks
- ✅ Updated all cookie handling code to use async/await
- ✅ Fixed Supabase authentication to use getUser() instead of getSession()
- ✅ Updated middleware to properly handle async operations

#### Next Steps
- Test all authentication flows after making these changes
- Monitor for any remaining issues with the Next.js 15 migration
- Consider implementing additional error handling for edge cases

### User Data Synchronization (2025-04-15)

#### Identified Issues
- The authentication table has two users but the user database is empty
- Users are being authenticated through Supabase Auth, but their data is not being synchronized with the application's user database table
- This causes issues with Row Level Security (RLS) policies that rely on the user table

#### Implemented Solutions
- Created a user synchronization function to ensure user data is properly stored in both Supabase Auth and the user database table
- Added an admin page to trigger the user synchronization process
- Updated the user synchronization function to handle errors gracefully

#### Next Steps
- Test the user synchronization functionality
- Consider adding automatic user synchronization during the authentication process
- Monitor for any issues with Row Level Security (RLS) policies

### Authentication Routes Conflict (2025-04-15)

#### Identified Issues
- The authentication routes are not being found at /auth/login and /auth/register
- There was a conflict between the route group (auth) and the regular route auth
- The middleware was redirecting to /login and /register, but the actual routes are at /auth/login and /auth/register

#### Implemented Solutions
- Updated the middleware to redirect to /auth/login and /auth/register
- Created the login and register pages in the auth directory
- Added a layout for the auth pages

#### Next Steps
- Test the authentication flow with the new routes
- Ensure the user synchronization works with the authentication flow
- Consider adding automatic user synchronization during the authentication process

## Version 0.2.0

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

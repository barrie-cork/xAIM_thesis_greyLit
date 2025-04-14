# Developer Handover: Grey Literature Search App

## Table of Contents

1. [Introduction](#introduction)
2. [Application Overview](#application-overview)
3. [Technology Stack](#technology-stack)
4. [File Structure](#file-structure)
5. [Authentication Flow](#authentication-flow)
6. [Search Builder Workflow](#search-builder-workflow)
7. [Key Components](#key-components)
8. [Database Schema](#database-schema)
9. [API Integration](#api-integration)
10. [State Management](#state-management)
11. [Deployment](#deployment)
12. [Current Development Tasks](#current-development-tasks)
13. [Future Development](#future-development)

## Introduction

This document provides a comprehensive overview of the Grey Literature Search App, detailing its architecture, workflows, and key components. It is intended as a handover document for developers who will be continuing development on the application.

## Application Overview

The Grey Literature Search App is a tool for systematically searching, screening, and extracting insights from non-traditional sources using structured strategies, automation, and transparency. The application allows users to:

1. Create structured search strategies with multiple concepts
2. Execute searches across specified domains
3. Review and manage search results
4. Collaborate on literature reviews

## Technology Stack

- **Frontend Framework**: Next.js 15.2.4 (React)
- **Styling**: Tailwind CSS
- **Authentication**: Supabase Auth
- **Database**: Supabase PostgreSQL
- **API**: tRPC for type-safe API routes
- **State Management**: React Context API and local state
- **UI Components**: Custom component library

## File Structure

```
/
├── docs/                      # Documentation
├── prisma/                    # Prisma schema and migrations
├── public/                    # Static assets
├── src/
│   ├── app/                   # Next.js app router pages
│   │   ├── (auth)/            # Authentication route group
│   │   │   ├── login/         # Login page
│   │   │   └── register/      # Registration page
│   │   ├── (dashboard)/       # Dashboard route group
│   │   │   └── page.tsx       # Dashboard page
│   │   ├── (search)/          # Search route group
│   │   │   ├── search-builder/ # Search builder page
│   │   │   ├── search-results/ # Search results page
│   │   │   └── saved-searches/ # Saved searches page
│   │   ├── api/               # API routes
│   │   │   ├── search/        # Search API routes
│   │   │   └── trpc/          # tRPC API routes
│   │   ├── auth/              # Legacy auth pages (being migrated)
│   │   │   └── callback/      # Auth callback handling
│   │   └── layout.tsx         # Root layout
│   ├── components/            # React components
│   │   ├── auth/              # Authentication components
│   │   ├── dashboard/         # Dashboard components
│   │   ├── landing/           # Landing page components
│   │   ├── search/            # Search-related components
│   │   ├── ui/                # UI component library
│   │   └── Providers.tsx      # App providers (Auth, tRPC)
│   ├── contexts/              # React contexts
│   │   └── AuthContext.tsx    # Authentication context
│   ├── lib/                   # Library code
│   │   ├── auth/              # Authentication utilities
│   │   │   ├── client.ts      # Client-side auth utilities
│   │   │   └── server.ts      # Server-side auth utilities
│   │   ├── prisma/            # Prisma client
│   │   ├── search/            # Search utilities
│   │   │   ├── providers/     # Search providers (SERPER, SERPAPI)
│   │   │   └── storage/       # Search storage service
│   │   └── supabase/          # Supabase client
│   ├── server/                # Server-side code
│   │   ├── api/               # API routes and handlers
│   │   └── trpc/              # tRPC setup
│   ├── styles/                # Global styles
│   └── utils/                 # Utility functions
│       ├── api.ts             # API utilities
│       └── trpc.ts            # tRPC utilities
├── .env                       # Environment variables
├── .env.local                 # Local environment variables
├── next.config.mjs            # Next.js configuration
├── tailwind.config.js         # Tailwind CSS configuration
├── tsconfig.json              # TypeScript configuration
├── CHANGELOG.md               # Changelog
└── TASKS_STATUS.md            # Development tasks status
```

## Authentication Flow

The authentication system uses Supabase Auth with a custom integration to synchronize user data between Supabase Auth and the application's database.

### Key Components and Files

- **Authentication Middleware**: `src/middleware.ts`
- **Supabase Client**: `src/lib/supabase/client.ts` and `src/lib/supabase/server.ts`
- **Auth Context**: `src/contexts/AuthContext.tsx`
- **Auth Utilities**: `src/lib/auth/client.ts` and `src/lib/auth/server.ts`
- **Auth Components**:
  - `src/components/auth/LoginForm.tsx`
  - `src/components/auth/RegisterForm.tsx`
  - `src/components/auth/LogoutButton.tsx`
  - `src/components/auth/AuthLayout.tsx`
- **Auth Pages**:
  - `src/app/(auth)/login/page.tsx`
  - `src/app/(auth)/register/page.tsx`
  - `src/app/auth/callback/route.ts`

### Authentication Workflow

1. **User Registration**:
   - User enters email and password on the registration page
   - `RegisterForm` component calls Supabase Auth `signUp` method
   - On successful registration, user data is synchronized with the application database
   - User is redirected to login page or shown success message

2. **User Login**:
   - User enters credentials on the login page
   - `LoginForm` component calls Supabase Auth `signInWithPassword` method
   - On successful login, session is established and stored in cookies
   - User is redirected to the dashboard page

3. **Session Management**:
   - `AuthContext` provides authentication state to client components
   - Server components use `getSession()` from `src/lib/auth/server.ts`
   - Middleware checks for valid session on protected routes
   - If no valid session, user is redirected to login page
   - Session is refreshed automatically when needed

4. **Route Protection**:
   - Route groups have layout components that check authentication status
   - `(auth)` route group redirects authenticated users to the dashboard
   - `(dashboard)` and `(search)` route groups redirect unauthenticated users to login
   - Middleware provides an additional layer of protection

5. **Logout**:
   - User clicks logout button
   - `LogoutButton` component calls Supabase Auth `signOut` method
   - Session is cleared and user is redirected to landing page

## Search Builder Workflow

The search builder allows users to create structured search strategies with multiple concepts and keywords.

### Key Components and Files

- **Search Builder Pages**: `src/app/(search)/search-builder/page.tsx`
- **Search Results Pages**: `src/app/(search)/search-results/page.tsx`
- **Saved Searches Pages**: `src/app/(search)/saved-searches/page.tsx`
- **Search Components**:
  - `src/components/search/SearchBuilder.tsx` - Main search builder component
  - `src/components/search/SearchBuilderClient.tsx` - Client-side wrapper
  - `src/components/search/SearchResultsClient.tsx` - Client-side results display
  - `src/components/search/SavedSearchesClient.tsx` - Client-side saved searches
  - `src/components/search/ConceptGroup.tsx` - Concept group management
  - `src/components/search/KeywordInput.tsx` - Keyword input component
  - `src/components/search/SearchPreview.tsx` - Preview of generated queries
  - `src/components/search/TrustedDomains.tsx` - Domain management

### Search Builder Workflow

1. **Creating a Search Strategy**:
   - User adds concept groups (e.g., "Population", "Intervention")
   - For each concept, user adds keywords or phrases
   - System generates Boolean search queries (OR within concepts, AND between concepts)

2. **Configuring Search Options**:
   - User specifies trusted domains to search
   - User selects file types to include (PDF, DOC, etc.)
   - User configures maximum results per search engine
   - User can select search engine preferences

3. **Executing Searches**:
   - User clicks "Execute All Searches" or "Search with API"
   - System creates a search request in the database via tRPC
   - Search request is executed against external APIs (SERPER, SERPAPI)
   - Results are stored in the `search_results` table
   - User is redirected to the search results page

4. **Viewing Results**:
   - Search results are fetched from the database
   - Results are displayed with title, URL, snippet, and source
   - Results can be filtered by source, file type, or domain
   - User can click on results to view the original content

5. **Saving Searches**:
   - User can save searches for future reference
   - Saved searches appear in the saved searches page
   - User can re-run saved searches or edit search parameters
   - Saved searches are stored in the `search_requests` table with `is_saved = true`

## Key Components

### UI Components

The application uses a custom UI component library located in `src/components/ui/`. Key components include:

- **Button**: `src/components/ui/button.tsx`
- **Input**: `src/components/ui/input.tsx`
- **Label**: `src/components/ui/label.tsx`
- **Card**: `src/components/ui/card.tsx`
- **Select**: `src/components/ui/select.tsx`
- **Dialog**: `src/components/ui/dialog.tsx`
- **Tabs**: `src/components/ui/tabs.tsx`

### Authentication Components

- **LoginForm**: Handles user login
- **RegisterForm**: Handles user registration
- **LogoutButton**: Handles user logout
- **AuthLayout**: Provides consistent layout for auth pages

### Search Components

- **ConceptGroup**: Manages a group of related keywords
- **KeywordInput**: Allows users to input and manage keywords
- **SearchPreview**: Shows preview of generated search queries
- **TrustedDomains**: Manages list of domains to search

## Database Schema

The application uses Supabase PostgreSQL with the following key tables:

### Users Table

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Search Requests Table

```sql
CREATE TABLE search_requests (
  query_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) NOT NULL,
  query TEXT NOT NULL,
  source TEXT NOT NULL,
  filters JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  search_title TEXT,
  is_saved BOOLEAN DEFAULT FALSE
);
```

### Search Results Table

```sql
CREATE TABLE search_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  query_id UUID REFERENCES search_requests(query_id) NOT NULL,
  title TEXT,
  url TEXT NOT NULL,
  snippet TEXT,
  rank INTEGER,
  result_type TEXT,
  search_engine TEXT,
  device TEXT,
  location TEXT,
  language TEXT,
  total_results INTEGER,
  credits_used INTEGER,
  search_id TEXT,
  search_url TEXT,
  related_searches JSONB,
  similar_questions JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deduped BOOLEAN DEFAULT TRUE
);
```

### Raw Search Results Table

```sql
CREATE TABLE raw_search_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  query_id UUID REFERENCES search_requests(query_id) NOT NULL,
  raw_response JSONB NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Review Tags Table

```sql
CREATE TABLE review_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  result_id UUID REFERENCES search_results(id) NOT NULL,
  tag TEXT NOT NULL,
  exclusion_reason TEXT,
  notes TEXT,
  retrieved BOOLEAN DEFAULT FALSE,
  reviewer_id UUID REFERENCES users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## API Integration

The application uses tRPC for type-safe API routes and Next.js App Router API routes. tRPC provides end-to-end type safety without schema validation or code generation, making it an ideal choice for this application.

### tRPC Architecture

The tRPC implementation follows a standard architecture with the following components:

- **Router**: Located in `src/server/trpc/router.ts`, combines all sub-routers
- **Procedures**: Located in `src/server/trpc/procedures.ts`, defines public and protected procedures
- **Context**: Located in `src/server/trpc/context.ts`, creates the context for each request
- **Sub-Routers**: Located in `src/server/trpc/routers/`, contain specific API endpoints
- **Client**: Located in `src/utils/trpc.ts`, creates the tRPC client for React components

### tRPC Best Practices

When working with tRPC in this application, follow these best practices:

1. **Use the `useMutation` Hook**: Always use the `useMutation` hook from the `trpc` object for mutations in React components, never use `trpcClient` directly
2. **Handle Loading and Error States**: Always handle loading and error states when using tRPC mutations
3. **Use Zod for Input Validation**: Always validate inputs with Zod schemas
4. **Use Protected Procedures**: Use `protectedProcedure` for authenticated routes

For more detailed information about tRPC usage, refer to the [tRPC Documentation Index](./trpc-documentation-index.md).

### Key API Routes

### Authentication API

- `auth.register`: Registers a new user
- `auth.login`: Logs in a user
- `auth.logout`: Logs out a user
- `auth.getSession`: Gets the current session

### Search API (tRPC)

- `search.create`: Creates a new search request
- `search.update`: Updates an existing search request
- `search.delete`: Deletes a search request
- `search.execute`: Executes a search against external APIs
- `search.getResults`: Gets results for a search request
- `search.getSaved`: Gets saved searches for a user
- `search.save`: Saves a search for future reference

### Search API (Next.js API Routes)

- `POST /api/search`: Creates a new search request
- `GET /api/search`: Gets all search requests for a user
- `DELETE /api/search/[id]`: Deletes a search request
- `POST /api/search/execute`: Executes a search against external APIs

### External API Integration

The application integrates with the following external search APIs:

- **SERPER**: Google search results via the Serper.dev API
- **SERPAPI**: Multi-engine search results via the SerpApi service

## State Management

The application uses a combination of React Context API, tRPC, and local state for state management:

- **Authentication State**: Managed by AuthContext with Supabase Auth integration
- **Search Builder State**: Managed by local state with localStorage persistence
- **Search Results State**: Managed by tRPC queries and local state
- **UI State**: Managed by component-level state

### Key State Management Files

- **Authentication Context**: `src/contexts/AuthContext.tsx`
- **tRPC Client**: `src/utils/api.ts` and `src/utils/trpc.ts`
- **Search Builder State**: `src/components/search/SearchBuilder.tsx`

### State Management Patterns

- **Server Components**: Fetch data on the server and pass it to client components
- **Client Components**: Use tRPC hooks for data fetching and mutation
- **Form State**: Managed with controlled components and local state
- **Authentication State**: Centralized in AuthContext and available app-wide

## Deployment

The application is deployed using Vercel with the following environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key (server-side only)
- `DATABASE_URL`: PostgreSQL connection string

## Current Development Tasks

### App Router Migration

The application has been successfully migrated from Next.js Pages Router to App Router architecture. The migration included:

- Creating route groups for better code organization
- Implementing server components for improved performance
- Updating authentication flow to work with App Router
- Fixing route conflicts and updating client components

For detailed information about the App Router migration, refer to the dedicated document:

- [App Router Migration Progress](./app-router-migration-readme.md)

### Task 005 - Search Strategy Builder Implementation

The Search Strategy Builder implementation (Task 005) is nearly complete, with only subtask 5.5 (Search Strategy Management) remaining. This subtask focuses on implementing search strategy saving, history tracking, and management functionality.

For detailed information about the current state of Task 005 and specific guidance on implementing the remaining features, refer to the dedicated document:

- [Task 005 - Search Strategy Builder Implementation](./developer-handover-task005.md)

### Server-Side Analytics and Monitoring

The next planned task is to implement server-side analytics and monitoring to track performance and user interactions. This will include:

- Implementing server-side analytics for page views and user actions
- Adding performance monitoring for API calls and page loads
- Tracking user interactions to identify UX improvement opportunities
- Setting up error tracking and reporting

## Route Groups Implementation

The application uses Next.js App Router route groups for better code organization and separation of concerns. For detailed information about the App Router architecture, see the [App Router Architecture](./app-router-architecture.md) document.

### Benefits of Route Groups

- **Code Organization**: Logically groups related pages
- **Shared Layouts**: Each group can have its own layout
- **Authentication Control**: Centralized authentication checks
- **Performance**: Optimizes loading of shared UI elements

## Future Development

Beyond the current tasks, the following areas are planned for future development:

1. **Enhanced Search Capabilities**:
   - Integration with additional search APIs
   - Advanced filtering and sorting of results
   - Full-text search of documents

2. **Collaboration Features**:
   - Sharing searches with team members
   - Collaborative tagging and annotation
   - Comments and discussions

3. **Data Analysis**:
   - Visualization of search results
   - Trend analysis
   - Export to various formats

4. **User Management**:
   - User roles and permissions
   - Team management
   - Usage analytics

## Key Functions and Classes

### Authentication Functions

- `createClient()`: Creates a Supabase client for browser usage
- `createServerClient()`: Creates a Supabase client for server usage
- `getSession()`: Gets the current session from Supabase
- `signUp()`: Registers a new user
- `signInWithPassword()`: Logs in a user with email and password
- `signOut()`: Logs out a user

### Search Functions

- `generateSearchQuery(concepts)`: Generates a Boolean search query from concepts
- `executeSearch(query, domains)`: Executes a search across specified domains
- `saveSearchResults(results)`: Saves search results to the database
- `formatSearchQuery(query)`: Formats a search query for display

### UI Components

- `Button`: Reusable button component with variants
- `Input`: Form input component with validation
- `Card`: Container component for content
- `Dialog`: Modal dialog component
- `Tabs`: Tabbed interface component
- `Select`: Dropdown selection component
- `Label`: Form label component

### Utility Functions

- `cn()`: Utility for conditionally joining classNames
- `formatDate(date)`: Formats a date for display
- `truncateText(text, length)`: Truncates text to specified length
- `validateEmail(email)`: Validates an email address

## Conclusion

This document provides an overview of the Grey Literature Search App's architecture, workflows, and key components. It should serve as a starting point for developers who will be continuing development on the application. For more detailed information, refer to the codebase and additional documentation in the `docs` directory.

For any questions or clarifications, please contact the original development team.

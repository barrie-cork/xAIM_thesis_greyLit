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
12. [Future Development](#future-development)

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
│   │   ├── api/               # API routes
│   │   ├── auth/              # Authentication pages
│   │   │   ├── callback/      # Auth callback handling
│   │   │   ├── login/         # Login page
│   │   │   └── register/      # Registration page
│   │   ├── search-builder/    # Search builder pages
│   │   └── layout.tsx         # Root layout
│   ├── components/            # React components
│   │   ├── auth/              # Authentication components
│   │   ├── landing/           # Landing page components
│   │   ├── search/            # Search-related components
│   │   ├── ui/                # UI component library
│   │   └── TRPCProvider.tsx   # tRPC provider
│   ├── lib/                   # Library code
│   │   ├── prisma/            # Prisma client
│   │   ├── supabase/          # Supabase client
│   │   └── trpc/              # tRPC setup
│   ├── server/                # Server-side code
│   │   ├── auth/              # Authentication utilities
│   │   └── api/               # API routes and handlers
│   ├── styles/                # Global styles
│   └── utils/                 # Utility functions
├── .env                       # Environment variables
├── .env.local                 # Local environment variables
├── next.config.js             # Next.js configuration
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
- **Auth Components**: 
  - `src/components/auth/LoginForm.tsx`
  - `src/components/auth/RegisterForm.tsx`
  - `src/components/auth/LogoutButton.tsx`
  - `src/components/auth/AuthLayout.tsx`
- **Auth Pages**:
  - `src/app/auth/login/page.tsx`
  - `src/app/auth/register/page.tsx`
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
   - User is redirected to the home page

3. **Session Management**:
   - Middleware checks for valid session on protected routes
   - If no valid session, user is redirected to login page
   - Session is refreshed automatically when needed

4. **Logout**:
   - User clicks logout button
   - `LogoutButton` component calls Supabase Auth `signOut` method
   - Session is cleared and user is redirected to landing page

## Search Builder Workflow

The search builder allows users to create structured search strategies with multiple concepts and keywords.

### Key Components and Files

- **Search Builder Pages**: `src/app/search-builder/page.tsx`
- **Search Components**:
  - `src/components/search/ConceptGroup.tsx`
  - `src/components/search/KeywordInput.tsx`
  - `src/components/search/SearchPreview.tsx`
  - `src/components/search/TrustedDomains.tsx`

### Search Builder Workflow

1. **Creating a Search Strategy**:
   - User adds concept groups (e.g., "Population", "Intervention")
   - For each concept, user adds keywords or phrases
   - System generates Boolean search queries (OR within concepts, AND between concepts)

2. **Configuring Search Options**:
   - User specifies trusted domains to search
   - User configures additional search parameters

3. **Executing Searches**:
   - System generates search queries for each domain
   - Searches are executed and results are stored in the database
   - Results are displayed to the user for review

4. **Managing Results**:
   - User can review, filter, and tag search results
   - Results can be exported or shared with collaborators

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

### Searches Table

```sql
CREATE TABLE searches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Concepts Table

```sql
CREATE TABLE concepts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  search_id UUID REFERENCES searches(id) NOT NULL,
  name TEXT NOT NULL,
  position INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Keywords Table

```sql
CREATE TABLE keywords (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  concept_id UUID REFERENCES concepts(id) NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Search Results Table

```sql
CREATE TABLE search_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  search_id UUID REFERENCES searches(id) NOT NULL,
  url TEXT NOT NULL,
  title TEXT,
  snippet TEXT,
  domain TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## API Integration

The application uses tRPC for type-safe API routes. Key API routes include:

### Authentication API

- `auth.register`: Registers a new user
- `auth.login`: Logs in a user
- `auth.logout`: Logs out a user
- `auth.getSession`: Gets the current session

### Search API

- `search.create`: Creates a new search
- `search.update`: Updates an existing search
- `search.delete`: Deletes a search
- `search.execute`: Executes a search
- `search.getResults`: Gets results for a search

## State Management

The application uses a combination of React Context API and local state for state management:

- **Authentication State**: Managed by Supabase Auth and custom context
- **Search Builder State**: Managed by local state with localStorage persistence
- **UI State**: Managed by component-level state

### Key State Management Files

- **Authentication Context**: `src/lib/supabase/auth-context.tsx`
- **Search Builder State**: `src/components/search/SearchBuilderContext.tsx`

## Deployment

The application is deployed using Vercel with the following environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key (server-side only)
- `DATABASE_URL`: PostgreSQL connection string

## Future Development

The following areas are planned for future development:

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

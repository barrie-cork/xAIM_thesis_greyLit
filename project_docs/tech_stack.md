# Grey Literature Search App - Technology Stack

## Core Technologies

### Frontend
- **Next.js**: React framework with server-side rendering and API routes
- **TypeScript**: Type-safe programming language
- **Tailwind CSS**: Utility-first CSS framework
- **Framer Motion**: Animation library for interactive UI elements

### Backend & Data
- **Supabase**:
  - Authentication and user management
  - PostgreSQL database
  - Storage for exported reports and documents
- **Prisma**: ORM for type-safe database access
- **TRPC**: End-to-end typesafe API layer

### Services
- **Resend**: Email delivery for notifications and report sharing

## Data Architecture

### Keyword Management
- User-defined keywords for each concept
- Efficient organization by concept
- Simple and intuitive interface

### Database Structure
- PostgreSQL via Supabase
- Row Level Security for data protection
- Relational model for search data, results, and reviews

## Implementation Approach

### Authentication Flow
- Supabase Auth for user management
- JWT-based session handling
- Row Level Security for data access control

### Search Execution
1. User-defined keyword organization by concept
2. Structured query building
3. External API integration for search execution
4. Result normalization and storage

### Data Flow
1. Client components make TRPC calls to server
2. Server components interact with Supabase
3. Structured data storage in PostgreSQL
4. File storage in Supabase Storage
# Technology Stack Documentation

## Core Technology
- Next.js 14.0.4

## Required Dependencies
### Authentication & User Management
- @supabase/auth-helpers-nextjs 0.8.7
  - Purpose: Provides authentication utilities for Next.js with Supabase
  - Chosen because: Officially supported integration for Supabase with Next.js
- @supabase/supabase-js 2.39.0
  - Purpose: JavaScript client for Supabase services
  - Chosen because: Official SDK for interacting with Supabase services

### Database & ORM
- prisma 5.6.0
  - Purpose: Type-safe ORM for database access
  - Chosen because: Provides type-safe database access with PostgreSQL support
- @prisma/client 5.6.0
  - Purpose: Auto-generated client for Prisma schema
  - Chosen because: Required companion to Prisma ORM

### UI Framework
- react 18.2.0
  - Purpose: Core UI library
  - Chosen because: Required by Next.js and provides component-based architecture
- react-dom 18.2.0
  - Purpose: DOM bindings for React
  - Chosen because: Required companion to React

### API Integration
- axios 1.6.2
  - Purpose: HTTP client for API requests
  - Chosen because: Feature-rich HTTP client with wide browser support

### Data Processing
- zod 3.22.4
  - Purpose: Schema validation and type inference
  - Chosen because: Integrates well with TypeScript and tRPC
- string-similarity 4.0.4
  - Purpose: For fuzzy title matching in deduplication
  - Chosen because: Lightweight library for comparing string similarity

### Styling
- tailwindcss 3.3.6
  - Purpose: Utility-first CSS framework
  - Chosen because: Mentioned in tech stack doc and provides rapid UI development
- postcss 8.4.32
  - Purpose: CSS processing tool
  - Chosen because: Required by Tailwind CSS
- autoprefixer 10.4.16
  - Purpose: PostCSS plugin to parse CSS and add vendor prefixes
  - Chosen because: Standard companion to PostCSS and Tailwind

### Animation
- framer-motion 10.16.16
  - Purpose: Animation library for React
  - Chosen because: Mentioned in tech stack doc and provides powerful animations

### Email Service
- resend 2.0.0
  - Purpose: Email delivery for notifications and report sharing
  - Chosen because: Mentioned in tech stack doc as the email service

### Type Safety
- typescript 5.3.3
  - Purpose: Type-safe programming language
  - Chosen because: Mentioned in tech stack doc and provides type safety
- @trpc/server 10.44.1
  - Purpose: End-to-end typesafe API layer (server)
  - Chosen because: Mentioned in tech stack doc for type-safe API
- @trpc/client 10.44.1
  - Purpose: End-to-end typesafe API layer (client)
  - Chosen because: Required companion to tRPC server
- @trpc/next 10.44.1
  - Purpose: tRPC adapter for Next.js
  - Chosen because: Provides Next.js integration for tRPC

## Compatibility Matrix
All dependencies are compatible with Next.js 14.0.4 and with each other. The TypeScript version (5.3.3) is compatible with all type-aware libraries including Prisma and tRPC.

## Version Lock Rationale
All versions are exact (e.g., "1.2.3" not "^1.2.3") to ensure:
- Consistent behavior across environments
- Predictable dependency resolution
- Reproducible builds

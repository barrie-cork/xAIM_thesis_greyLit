# Next.js App Router Migration Strategy

## Overview

This document outlines a comprehensive strategy for migrating the Grey Literature Search App from the Pages Router to the App Router architecture. The migration is broken down into manageable phases with detailed steps, code examples, and important considerations for each phase.

## Table of Contents

1. [Current Application State](#current-application-state)
2. [Migration Benefits](#migration-benefits)
3. [Phase 1: Infrastructure Preparation](#phase-1-infrastructure-preparation)
4. [Phase 2: Authentication System Migration](#phase-2-authentication-system-migration)
5. [Phase 3: Core Pages Migration](#phase-3-core-pages-migration)
6. [Phase 4: API Routes Migration](#phase-4-api-routes-migration)
7. [Phase 5: Testing and Validation](#phase-5-testing-and-validation)
8. [Phase 6: Cleanup and Optimization](#phase-6-cleanup-and-optimization)
9. [Common Challenges and Solutions](#common-challenges-and-solutions)
10. [Testing Checklist](#testing-checklist)
11. [Rollback Plan](#rollback-plan)

## Current Application State

The application is currently in a transitional state with components in both routing systems:

### Pages Router Components
- Main pages: `src/pages/index.tsx`, `src/pages/search-builder.tsx`, `src/pages/search-results.tsx`
- API routes: `src/pages/api/*` including tRPC implementation
- App configuration: `src/pages/_app.tsx`

### App Router Components
- Authentication pages: `src/app/auth/login/page.tsx`, `src/app/auth/register/page.tsx`
- Root layout: `src/app/layout.tsx`
- Some API routes in `src/app/api/*`

### Shared Components
- Middleware: `src/middleware.ts` (configured for both routers)
- UI components: `src/components/*`
- Utilities and services: `src/lib/*`, `src/utils/*`

## Migration Benefits

1. **Server Components**: Improved performance through React Server Components
2. **Enhanced Routing**: More intuitive nested routing with directory-based structure
3. **Improved Layouts**: Nested layouts with shared UI across routes
4. **Data Fetching**: Simplified data fetching with async/await in Server Components
5. **Future-Proof**: Alignment with Next.js's strategic direction

## Phase 1: Infrastructure Preparation

### 1.1 Update Next.js Configuration

Create or update `next.config.mjs` to ensure it's properly configured for App Router:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable App Router
  experimental: {
    serverActions: true,
  },
  // Ensure both /app and /pages directories work during migration
  reactStrictMode: true,
  swcMinify: true,
};

export default nextConfig;
```

### 1.2 Update TypeScript Configuration

Ensure `tsconfig.json` includes the necessary paths and configurations:

```json
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### 1.3 Consolidate Providers

Move all providers to the App Router's layout structure:

1. Create a client component wrapper for providers:

```tsx
// src/components/Providers.tsx
'use client';

import { PropsWithChildren, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { trpc } from '@/utils/trpc';
import { httpBatchLink } from '@trpc/client';
import superjson from 'superjson';

export function Providers({ children }: PropsWithChildren) {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    trpc.createClient({
      transformer: superjson,
      links: [
        httpBatchLink({
          url: '/api/trpc',
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}
```

2. Update the root layout to use this provider:

```tsx
// src/app/layout.tsx
import { Providers } from '@/components/Providers';
import '@/styles/globals.css';

export const metadata = {
  title: 'Grey Literature Search',
  description: 'Systematic search and review of grey literature',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

### 1.4 Update Middleware

Ensure middleware works correctly with App Router routes:

```typescript
// src/middleware.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requestLogger } from './utils/logger';

export async function middleware(request: NextRequest) {
  try {
    // Create a logger instance with request context
    const logger = requestLogger(request);

    // Log incoming request
    logger.info({
      url: request.url,
      method: request.method,
    }, `HTTP ${request.method} ${new URL(request.url).pathname}`);

    // Create a response object that we can modify
    const response = NextResponse.next();

    // Create a Supabase client for the middleware
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            response.cookies.set({
              name,
              value,
              ...options,
            });
          },
          remove(name: string, options: CookieOptions) {
            response.cookies.set({
              name,
              value: '',
              ...options,
              maxAge: 0,
            });
          },
        },
      }
    );

    // Refresh the session if it exists
    const {
      data: { session },
    } = await supabase.auth.getSession();

    // Protected routes
    if (request.nextUrl.pathname.startsWith('/search-builder') ||
        request.nextUrl.pathname.startsWith('/saved-searches') ||
        request.nextUrl.pathname.startsWith('/search-results') ||
        request.nextUrl.pathname.startsWith('/review')) {
      if (!session) {
        return NextResponse.redirect(new URL('/auth/login', request.url))
      }
    }

    // Auth routes - redirect to home page if already logged in
    if (request.nextUrl.pathname.startsWith('/auth/login') ||
        request.nextUrl.pathname.startsWith('/auth/register')) {
      if (session) {
        return NextResponse.redirect(new URL('/', request.url))
      }
    }

    return response;
  } catch (error) {
    console.error('Middleware error:', error);
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    '/search-builder',
    '/saved-searches',
    '/search-results',
    '/review/:path*',
    '/auth/:path*',
  ],
}
```

## Phase 2: Authentication System Migration

### 2.1 Create Authentication Context

Create a client-side authentication context for managing auth state:

```tsx
// src/contexts/AuthContext.tsx
'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Session, User } from '@supabase/supabase-js';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const getSession = async () => {
      setIsLoading(true);
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setUser(data.session?.user || null);
      setIsLoading(false);
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user || null);
        setIsLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase.auth]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

### 2.2 Update Providers Component

Update the Providers component to include the AuthProvider:

```tsx
// src/components/Providers.tsx
'use client';

import { PropsWithChildren, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { trpc } from '@/utils/trpc';
import { httpBatchLink } from '@trpc/client';
import superjson from 'superjson';
import { AuthProvider } from '@/contexts/AuthContext';

export function Providers({ children }: PropsWithChildren) {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    trpc.createClient({
      transformer: superjson,
      links: [
        httpBatchLink({
          url: '/api/trpc',
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
```

### 2.3 Create Server-Side Auth Utilities

Create utilities for server-side authentication:

```typescript
// src/lib/auth/server.ts
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { redirect } from 'next/navigation';
import { Database } from '@/lib/supabase/types';

export async function createServerSupabaseClient() {
  const cookieStore = cookies();
  
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: '', ...options, maxAge: 0 });
        },
      },
    }
  );
}

export async function getSession() {
  const supabase = await createServerSupabaseClient();
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
}

export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    redirect('/auth/login');
  }
  return session;
}
```

## Phase 3: Core Pages Migration

### 3.1 Create Home Page

Migrate the home page to the App Router:

```tsx
// src/app/page.tsx
import { getSession } from '@/lib/auth/server';
import { redirect } from 'next/navigation';
import { LandingPage } from '@/components/landing/LandingPage';
import { Dashboard } from '@/components/dashboard/Dashboard';

export default async function Home() {
  const session = await getSession();
  
  // If not authenticated, show landing page
  if (!session) {
    return <LandingPage />;
  }
  
  // If authenticated, show dashboard
  return <Dashboard userId={session.user.id} />;
}
```

Create the Dashboard component:

```tsx
// src/components/dashboard/Dashboard.tsx
'use client';

import Link from 'next/link';
import { LogoutButton } from '@/components/auth/LogoutButton';

interface DashboardProps {
  userId: string;
}

export function Dashboard({ userId }: DashboardProps) {
  return (
    <main className="container mx-auto py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-4xl font-bold">Grey Literature Search App</h1>
          <div className="flex space-x-4">
            <LogoutButton />
          </div>
        </div>
        <p className="text-lg text-gray-600 mb-8">
          Systematically search, screen, and extract insights from non-traditional sources using
          structured strategies, automation, and transparency.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg border shadow-sm hover:shadow-md transition-shadow">
            <h2 className="text-xl font-semibold mb-3">Advanced Search Builder</h2>
            <p className="text-gray-600 mb-4">
              Create powerful search strategies with keywords, file type filters, and
              domain-specific constraints for more effective literature searches.
            </p>
            <Link href="/search-builder" className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              Open Builder
            </Link>
          </div>

          <div className="bg-white p-6 rounded-lg border shadow-sm hover:shadow-md transition-shadow">
            <h2 className="text-xl font-semibold mb-3">Saved Searches</h2>
            <p className="text-gray-600 mb-4">
              View, manage, and execute your saved search strategies. Access your search history
              and reuse effective queries.
            </p>
            <Link href="/saved-searches" className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              View Saved Searches
            </Link>
          </div>

          <div className="bg-white p-6 rounded-lg border shadow-sm hover:shadow-md transition-shadow">
            <h2 className="text-xl font-semibold mb-3">Document Review</h2>
            <p className="text-gray-600 mb-4">
              Review search results, tag documents, and extract key information from
              grey literature sources.
            </p>
            <button disabled className="inline-flex items-center justify-center rounded-md bg-gray-300 px-4 py-2 text-sm font-medium text-gray-600 cursor-not-allowed">
              Coming Soon
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
```

### 3.2 Create Search Builder Page

Migrate the search builder page to the App Router:

```tsx
// src/app/search-builder/page.tsx
import { requireAuth } from '@/lib/auth/server';
import { SearchBuilderClient } from '@/components/search/SearchBuilderClient';

export default async function SearchBuilderPage() {
  const session = await requireAuth();
  
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Search Builder</h1>
      <SearchBuilderClient userId={session.user.id} />
    </div>
  );
}
```

Create the client component for the search builder:

```tsx
// src/components/search/SearchBuilderClient.tsx
'use client';

import { useState } from 'react';
import { api } from '@/utils/api';
// Import other necessary components

interface SearchBuilderClientProps {
  userId: string;
}

export function SearchBuilderClient({ userId }: SearchBuilderClientProps) {
  // Implement the search builder UI and logic here
  // This should be migrated from the existing Pages Router implementation
  
  return (
    <div>
      {/* Search builder UI */}
    </div>
  );
}
```

### 3.3 Create Search Results Page

Migrate the search results page to the App Router:

```tsx
// src/app/search-results/page.tsx
import { requireAuth } from '@/lib/auth/server';
import { SearchResultsClient } from '@/components/search/SearchResultsClient';

export default async function SearchResultsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const session = await requireAuth();
  const searchId = searchParams.id as string;
  
  if (!searchId) {
    return (
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-6">Search Results</h1>
        <p>No search ID provided. Please start a new search.</p>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Search Results</h1>
      <SearchResultsClient searchId={searchId} userId={session.user.id} />
    </div>
  );
}
```

Create the client component for search results:

```tsx
// src/components/search/SearchResultsClient.tsx
'use client';

import { useEffect, useState } from 'react';
import { api } from '@/utils/api';
// Import other necessary components

interface SearchResultsClientProps {
  searchId: string;
  userId: string;
}

export function SearchResultsClient({ searchId, userId }: SearchResultsClientProps) {
  // Implement the search results UI and logic here
  // This should be migrated from the existing Pages Router implementation
  
  return (
    <div>
      {/* Search results UI */}
    </div>
  );
}
```

## Phase 4: API Routes Migration

### 4.1 Create tRPC Route Handler

Create the tRPC route handler for the App Router:

```typescript
// src/app/api/trpc/[trpc]/route.ts
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@/server/trpc/router';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from '@/lib/supabase/types';
import { prisma } from '@/server/db/client';

const handler = async (req: Request) => {
  // Create Supabase server client
  const cookieStore = cookies();
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set() {
          // We don't need to set cookies in a fetch handler
        },
        remove() {
          // We don't need to remove cookies in a fetch handler
        },
      },
    }
  );

  // Get the user's session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Create context
  const createContext = async () => {
    return {
      req,
      prisma,
      supabase,
      session,
      userId: session?.user?.id,
    };
  };

  // Handle the request
  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext,
    onError:
      process.env.NODE_ENV === 'development'
        ? ({ path, error }) => {
            console.error(`❌ tRPC failed on ${path ?? '<no-path>'}: ${error.message}`);
          }
        : undefined,
  });
};

export { handler as GET, handler as POST };
```

### 4.2 Migrate Other API Routes

Migrate other API routes to the App Router format:

```typescript
// src/app/api/search/route.ts
import { NextResponse } from 'next/server';
import { createServerSupabaseClient, requireAuth } from '@/lib/auth/server';

export async function POST(request: Request) {
  try {
    // Ensure user is authenticated
    const session = await requireAuth();
    
    // Get request body
    const body = await request.json();
    
    // Process search request
    // ...
    
    return NextResponse.json({ success: true, data: {} });
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'An error occurred processing your request' },
      { status: 500 }
    );
  }
}
```

### 4.3 Update API Client Utilities

Update API client utilities to work with the new routes:

```typescript
// src/utils/api.ts
import { httpBatchLink } from '@trpc/client';
import { createTRPCNext } from '@trpc/next';
import superjson from 'superjson';
import type { AppRouter } from '@/server/trpc/router';

export const api = createTRPCNext<AppRouter>({
  config() {
    return {
      transformer: superjson,
      links: [
        httpBatchLink({
          url: '/api/trpc',
        }),
      ],
    };
  },
  ssr: false,
});
```

## Phase 5: Testing and Validation

### 5.1 Create Test Plan

Create a comprehensive test plan covering all migrated functionality:

1. Authentication flows
2. Protected routes
3. API endpoints
4. Data fetching and mutations
5. UI components
6. Error handling

### 5.2 Implement Parallel Testing

During migration, implement parallel testing to compare Pages Router and App Router implementations:

```typescript
// src/utils/routerTesting.ts
export async function compareRoutes(pagesRouterUrl: string, appRouterUrl: string) {
  // Fetch data from both routes
  const pagesResponse = await fetch(pagesRouterUrl);
  const appResponse = await fetch(appRouterUrl);
  
  // Compare responses
  const pagesData = await pagesResponse.json();
  const appData = await appResponse.json();
  
  // Log differences
  console.log('Pages Router:', pagesData);
  console.log('App Router:', appData);
  
  // Return comparison result
  return {
    statusMatch: pagesResponse.status === appResponse.status,
    dataMatch: JSON.stringify(pagesData) === JSON.stringify(appData),
    pagesData,
    appData,
  };
}
```

### 5.3 Implement Feature Flags

Use feature flags to gradually roll out App Router routes:

```typescript
// src/utils/featureFlags.ts
export const FEATURES = {
  USE_APP_ROUTER_HOME: process.env.NEXT_PUBLIC_USE_APP_ROUTER_HOME === 'true',
  USE_APP_ROUTER_SEARCH_BUILDER: process.env.NEXT_PUBLIC_USE_APP_ROUTER_SEARCH_BUILDER === 'true',
  USE_APP_ROUTER_SEARCH_RESULTS: process.env.NEXT_PUBLIC_USE_APP_ROUTER_SEARCH_RESULTS === 'true',
};
```

## Phase 6: Cleanup and Optimization

### 6.1 Remove Pages Router Files

Once all routes are migrated and tested, remove the Pages Router files:

1. Delete `src/pages` directory
2. Update imports and references

### 6.2 Optimize Server Components

Refactor components to take advantage of Server Components:

```tsx
// src/app/saved-searches/page.tsx
import { requireAuth } from '@/lib/auth/server';
import { prisma } from '@/server/db/client';
import { SavedSearchList } from '@/components/search/SavedSearchList';

export default async function SavedSearchesPage() {
  const session = await requireAuth();
  
  // Fetch data directly in the Server Component
  const savedSearches = await prisma.search.findMany({
    where: {
      userId: session.user.id,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
  
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Saved Searches</h1>
      <SavedSearchList searches={savedSearches} />
    </div>
  );
}
```

### 6.3 Implement Streaming and Suspense

Add streaming and suspense for improved user experience:

```tsx
// src/app/search-results/[id]/page.tsx
import { Suspense } from 'react';
import { requireAuth } from '@/lib/auth/server';
import { SearchResultsContent } from '@/components/search/SearchResultsContent';
import { SearchResultsSkeleton } from '@/components/search/SearchResultsSkeleton';

export default async function SearchResultsPage({
  params,
}: {
  params: { id: string };
}) {
  await requireAuth();
  
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Search Results</h1>
      <Suspense fallback={<SearchResultsSkeleton />}>
        <SearchResultsContent searchId={params.id} />
      </Suspense>
    </div>
  );
}
```

## Common Challenges and Solutions

### 1. Data Fetching Differences

**Challenge**: Different data fetching patterns between Pages Router and App Router.

**Solution**: 
- Use Server Components for data fetching where possible
- Create client components for interactive features
- Use React Query for client-side data fetching

### 2. Authentication Integration

**Challenge**: Adapting authentication to work with Server Components.

**Solution**:
- Create server-side auth utilities
- Use middleware for route protection
- Create client-side auth context for interactive components

### 3. API Route Differences

**Challenge**: Different API route patterns in App Router.

**Solution**:
- Use the new route handlers with GET, POST exports
- Update client code to work with both during migration
- Test thoroughly to ensure compatibility

### 4. Layout Transitions

**Challenge**: Ensuring smooth transitions between layouts.

**Solution**:
- Use nested layouts in the App Router
- Implement loading states with Suspense
- Test navigation flows thoroughly

## Testing Checklist

- [ ] Authentication flows (login, register, logout)
- [ ] Protected route access
- [ ] API endpoints functionality
- [ ] Data fetching and mutations
- [ ] UI components rendering
- [ ] Error handling and edge cases
- [ ] Performance metrics
- [ ] Mobile responsiveness
- [ ] Accessibility

## Rollback Plan

In case of critical issues during migration:

1. **Immediate Rollback**: Use feature flags to revert to Pages Router implementation
2. **Partial Rollback**: Roll back specific problematic routes while keeping successful migrations
3. **Monitoring**: Implement monitoring to detect issues early
4. **Documentation**: Document all issues encountered for future reference

## Conclusion

This migration strategy provides a structured approach to migrating from the Pages Router to the App Router architecture. By breaking the migration into manageable phases and addressing key considerations at each step, the process can be completed with minimal disruption to the application's functionality.

The migration will result in a more modern, performant, and maintainable application that takes full advantage of Next.js's latest features and best practices.

Remember that this is an incremental process, and it's important to thoroughly test each component after migration to ensure functionality is preserved. The parallel testing approach and feature flags provide safety mechanisms to ensure a smooth transition.

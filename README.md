# Grey Literature Search App

The *Grey Literature Search App* enables researchers to systematically search, screen, and extract insights from non-traditional sources (e.g., government reports, clinical guidelines, white papers) using structured strategies, automation, and transparency.

## Features

- **Concept-Based Search**: Build structured search strategies using the PIC framework (Population, Interest, Context)
- **Multi-Domain Parallel Search**: Run searches across multiple trusted domains simultaneously
- **Domain-Specific Queries**: Target specific domains like healthquality.va.gov or nice.org.uk
- **Advanced Result Handling**: Automatic deduplication and organization of search results
- **Clinical Guideline Terms**: Include specialized terminology in your searches
- **Result Caching System**: Efficient caching of search results to reduce API calls and improve performance
- **Duplicate Detection**: Advanced detection and management of duplicate search results

## Getting Started

### Prerequisites

- Node.js 16.x or higher
- npm or yarn package manager
- PostgreSQL database (or Supabase account)

### Installation

1. Clone the repository
   ```
   git clone https://github.com/barrie-cork/xAIM_thesis_greyLit.git
   cd xAIM_thesis_greyLit
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Set up environment variables
   ```
   cp .env.example .env.local
   ```
   
   Then edit `.env.local` with your actual database credentials and API keys:
   - For Supabase: Add your Supabase URL and anon key
   - For Search APIs: Get API keys from [Serper.dev](https://serper.dev) and optionally [SerpAPI](https://serpapi.com)

4. Run database migrations
   ```
   npx prisma migrate deploy
   ```
   
   If you're setting up a new database, you might need to create the migrations first:
   ```
   npx prisma migrate dev --name init
   ```

5. Generate Prisma client
   ```
   npx prisma generate
   ```

6. Start the development server
   ```
   npm run dev
   ```

7. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

### Search Strategy Builder

1. Navigate to the Search Strategy Builder page
2. Define your research concepts using the PIC framework:
   - **Population**: Who or what is affected?
   - **Interest**: What is being done or examined?
   - **Context**: In what setting or compared to what?
3. Configure search options:
   - **File Types**: Restrict to specific file types like PDF, DOC, PPT
   - **Trusted Domains**: Add specific domains to search 
   - **Search Types**: Choose between domain-specific searches, broad search, or Google Scholar
   - **Search Engines**: Select which search engines to use
4. Click "Execute All Searches" to run multiple queries in parallel
5. View and analyze your search results, including deduplication statistics

## Database Setup

### Using Supabase (Recommended)

1. Create a Supabase account at [supabase.com](https://supabase.com)
2. Create a new project
3. Get your project URL and anon key from the API settings
4. Add these to your `.env.local` file
5. Run Prisma migrations to set up your database tables

### Using Local PostgreSQL

1. Install PostgreSQL on your machine
2. Create a new database
3. Update the `DATABASE_URL` in your `.env.local` file to point to your local database
4. Run Prisma migrations to set up your database tables

## Technologies

- Next.js for the frontend and API routes
- tRPC for type-safe API endpoints
- Tailwind CSS for styling
- Prisma for database access
- Supabase for authentication and data storage

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Advanced Features

### Result Storage and Caching

The application includes a sophisticated result storage and caching system that:

1. **Reduces API Calls**: Caches search results to minimize expensive API calls to search providers
2. **Improves Performance**: Serves cached results for identical queries instantly
3. **Intelligent Fingerprinting**: Identifies identical searches using configurable query fingerprinting
4. **Tiered Caching**: Uses both in-memory and database storage for optimal performance
5. **Time-to-Live (TTL)**: Configurable cache expiration to ensure fresh results
6. **Cache Statistics**: Tracks cache hit/miss rates and performance metrics

To configure the caching system, modify the `CacheOptions` settings in your environment:

```typescript
// Default cache options
{
  ttl: 3600, // 1 hour cache lifetime in seconds
  enabled: true,
  fingerprinting: {
    ignoreCase: true,
    normalizeWhitespace: true,
    includeFilters: true
  }
}
```

#### Cache Maintenance

To maintain optimal performance, a cache cleanup script is provided that removes outdated cache entries:

```bash
# Run cache cleanup with default 7-day retention
npx ts-node src/scripts/cache-cleanup.ts

# Specify a custom retention period (in days)
npx ts-node src/scripts/cache-cleanup.ts 14
```

For production environments, you can set up a scheduled job (e.g., cron) to run this script regularly.

### Deduplication System

The application includes an advanced deduplication system that:

1. **URL Normalization**: Identifies duplicate results with different URL formats
2. **Weighted Similarity Scoring**: Uses title (50%), snippet (30%), and URL (20%) to detect near-duplicates
3. **Configurable Merge Strategies**: Conservative or comprehensive merging of duplicate information
4. **Duplicate Logging**: Tracks detailed information about detected duplicates
5. **Performance Optimization**: Efficiently processes large result sets with minimal overhead

## Depandancy Graph

(base) PS C:\PythonProjects\Thesis_cursor_1> npm ls --depth=0
grey-literature-search-and-tag@1.0.0 C:\PythonProjects\Thesis_cursor_1
├── @anthropic-ai/sdk@0.39.0
├── @faker-js/faker@9.6.0
├── @headlessui/react@1.7.19
├── @heroicons/react@2.2.0
├── @prisma/client@6.5.0
├── @storybook/addon-essentials@7.6.20
├── @storybook/addon-interactions@7.6.20
├── @storybook/addon-links@7.6.20
├── @storybook/blocks@7.6.20
├── @storybook/react-vite@7.6.20
├── @storybook/react@7.6.20
├── @storybook/test@7.6.20
├── @supabase/auth-helpers-nextjs@0.10.0
├── @supabase/ssr@0.6.1
├── @tanstack/react-query@5.72.0
├── @testing-library/jest-dom@6.6.3
├── @testing-library/react@14.3.1
├── @testing-library/user-event@14.6.1
├── @trpc/client@11.0.2
├── @trpc/next@11.0.2
├── @trpc/react-query@11.0.2
├── @trpc/server@11.0.2
├── @types/fast-levenshtein@0.0.4
├── @types/jest@29.5.14
├── @types/next@8.0.7
├── @types/node@20.17.30
├── @types/pino@7.0.4
├── @types/react-dom@18.3.6
├── @types/react@18.3.20
├── @types/supertest@6.0.3
├── @types/swagger-ui-express@4.1.8
├── @types/testing-library__user-event@4.1.1
├── @typescript-eslint/eslint-plugin@7.18.0
├── @typescript-eslint/parser@7.18.0
├── @vitejs/plugin-react@4.3.4
├── @vitest/ui@1.6.1
├── autoprefixer@10.4.21
├── axios@1.8.4
├── boxen@7.1.1
├── chalk@5.4.1
├── cli-table3@0.6.5
├── clsx@2.1.1
├── commander@11.1.0
├── dotenv-cli@8.0.0
├── dotenv@16.4.7
├── eslint-config-prettier@9.1.0
├── eslint-plugin-prettier@5.2.6
├── eslint-plugin-react-hooks@4.6.2
├── eslint-plugin-react@7.37.5
├── eslint-plugin-storybook@0.8.0
├── eslint@8.57.1
├── fast-levenshtein@3.0.0
├── figlet@1.8.0
├── gradient-string@2.0.2
├── husky@9.1.7
├── identity-obj-proxy@3.0.0
├── jest-environment-jsdom@29.7.0
├── jest-mock-extended@4.0.0-beta1
├── jest@29.7.0
├── jsdom@26.0.0
├── lucide-react@0.487.0
├── msw@2.7.3
├── n3@1.24.2
├── next@15.2.4
├── openai@4.91.1
├── openapi-types@12.1.3
├── ora@7.0.1
├── pino-pretty@13.0.0
├── pino@9.6.0
├── postcss@8.5.3
├── prettier-plugin-tailwindcss@0.5.14
├── prettier@3.5.3
├── prisma@6.5.0
├── react-dom@18.3.1
├── react-router-dom@6.30.0
├── react@18.3.1
├── start-server-and-test@2.0.11
├── storybook@7.6.20
├── superjson@2.2.2
├── supertest@7.1.0
├── swagger-ui-express@5.0.1
├── tailwind-merge@2.6.0
├── tailwindcss-animate@1.0.7
├── tailwindcss@3.4.17
├── ts-jest@29.3.1
├── ts-node@10.9.2
├── typescript@5.8.3
├── vite@5.4.17
├── vitest@1.6.1
└── zod@3.24.2

This is a Next.js project with React, with a strong focus on testing (Vitest, Jest) and TypeScript. The project uses:

1. **Database Layer**: Prisma as the ORM (@prisma/client v6.5.0)
2. **Testing**: Multiple testing libraries including Vitest (v1.6.1), Jest (v29.7.0), and related testing libraries
3. **UI**: React (v18.3.1) with Next.js (v15.2.4), TailwindCSS (v3.4.17)
4. **API/Backend**: tRPC, Swagger, Supertest for API testing
5. **Authentication**: Supabase auth helpers
6. **AI/Language**: OpenAI SDK (v4.91.1) and Anthropic SDK (v0.39.0)

This aligns with the search module refactoring work we were doing, which involved:

1. Creating `SerpExecutorService` and `ResultsProcessorService` components
2. Unifying the `SearchResult` type
3. Setting up proper testing for these components

When we were encountering test issues, we were particularly working with:
- Vitest as the testing framework
- Prisma client mocking
- API endpoint testing

The dependency graph confirms the project has all the necessary testing tools, and the issues we were encountering were primarily related to test setup and mock implementation rather than missing dependencies.

Would you like me to continue helping with the search module refactoring and test issues, or would you prefer to focus on another aspect of the project architecture?

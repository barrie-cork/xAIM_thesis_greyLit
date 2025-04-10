# Grey Literature Search App

The *Grey Literature Search App* enables researchers to systematically search, screen, and extract insights from non-traditional sources (e.g., government reports, clinical guidelines, white papers) using structured strategies, automation, and transparency.

## Features

- **Concept-Based Search**: Build structured search strategies using the PIC framework (Population, Interest, Context)
- **Multi-Domain Parallel Search**: Run searches across multiple trusted domains simultaneously
- **Domain-Specific Queries**: Target specific domains like healthquality.va.gov or nice.org.uk
- **Advanced Result Handling**: Automatic deduplication and organization of search results
- **Clinical Guideline Terms**: Include specialized terminology in your searches

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